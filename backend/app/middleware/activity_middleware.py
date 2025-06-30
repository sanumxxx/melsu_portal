from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.orm import Session
import json
import time
from typing import Dict, Any, Optional, Tuple

from ..database import SessionLocal
from ..services.activity_service import ActivityService
from ..models.activity_log import ActionType
from ..dependencies import get_current_user_from_token

class ActivityLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware для автоматического логирования активности пользователей
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        
        # Маппинг путей к типам действий
        self.action_mapping = {
            # Аутентификация
            "/auth/login": ActionType.LOGIN.value,
            "/auth/logout": ActionType.LOGOUT.value,
            "/auth/change-password": ActionType.PASSWORD_CHANGE.value,
            
            # Пользователи
            "/api/users": ActionType.VIEW.value,  # GET
            "/admin/users": ActionType.VIEW.value,  # GET
            
            # Заявки
            "/api/requests": {
                "GET": ActionType.VIEW.value,
                "POST": ActionType.REQUEST_SUBMIT.value,
                "PUT": ActionType.UPDATE.value,
                "DELETE": ActionType.DELETE.value
            },
            
            # Объявления
            "/api/announcements": {
                "GET": ActionType.VIEW.value,
                "POST": ActionType.ANNOUNCEMENT_PUBLISH.value,
                "PUT": ActionType.UPDATE.value,
                "DELETE": ActionType.DELETE.value
            },
            
            # Портфолио
            "/api/portfolio": {
                "GET": ActionType.VIEW.value,
                "POST": ActionType.PORTFOLIO_ADD.value,
                "PUT": ActionType.PORTFOLIO_UPDATE.value,
                "DELETE": ActionType.DELETE.value
            },
            
            # Файлы
            "/api/files/upload": ActionType.UPLOAD.value,
            "/uploads": ActionType.DOWNLOAD.value,  # GET только
            
            # Отчеты
            "/api/reports": {
                "GET": ActionType.VIEW.value,
                "POST": ActionType.REPORT_GENERATE.value
            },
            
            # Группы
            "/api/groups": {
                "GET": ActionType.VIEW.value,
                "POST": ActionType.GROUP_CREATE.value,
                "PUT": ActionType.GROUP_UPDATE.value,
                "DELETE": ActionType.GROUP_DELETE.value
            },
            
            # Департаменты
            "/departments": {
                "GET": ActionType.VIEW.value,
                "POST": ActionType.DEPARTMENT_CREATE.value,
                "PUT": ActionType.DEPARTMENT_UPDATE.value,
                "DELETE": ActionType.DEPARTMENT_DELETE.value
            }
        }
        
        # Пути, которые не нужно логировать
        self.exclude_paths = {
            "/health",
            "/",
            "/docs",
            "/openapi.json",
            "/redoc",
            "/ws",
            "/api/activity-logs"  # Исключаем сами логи активности
        }
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Засекаем время начала запроса
        start_time = time.time()
        
        # Выполняем запрос
        response = await call_next(request)
        
        # Вычисляем время выполнения
        process_time = time.time() - start_time
        
        # Логируем активность асинхронно (если нужно)
        try:
            await self._log_activity(request, response, process_time)
        except Exception as e:
            # Не прерываем запрос из-за ошибки логирования
            print(f"Ошибка логирования активности: {e}")
        
        return response
    
    async def _log_activity(self, request: Request, response: Response, process_time: float):
        """Логирует активность пользователя"""
        
        path = request.url.path
        method = request.method
        
        # Проверяем, нужно ли логировать этот путь
        if self._should_exclude_path(path):
            return
        
        # Получаем информацию о пользователе
        user_id = await self._get_user_id_from_request(request)
        
        # Определяем тип действия
        action = self._determine_action(path, method)
        if not action:
            return
        
        # Извлекаем дополнительные детали
        resource_type, resource_id = self._extract_resource_info(path)
        description = self._generate_description(action, path, method, response.status_code)
        
        # Формируем детали запроса
        details = {
            "method": method,
            "path": path,
            "status_code": response.status_code,
            "process_time": round(process_time, 3),
            "query_params": dict(request.query_params) if request.query_params else None
        }
        
        # Создаем сессию базы данных и логируем
        db = SessionLocal()
        try:
            activity_service = ActivityService(db)
            activity_service.log_activity(
                action=action,
                description=description,
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details,
                request=request
            )
        finally:
            db.close()
    
    def _should_exclude_path(self, path: str) -> bool:
        """Проверяет, нужно ли исключить путь из логирования"""
        for exclude_path in self.exclude_paths:
            if path.startswith(exclude_path):
                return True
        return False
    
    async def _get_user_id_from_request(self, request: Request) -> Optional[int]:
        """Извлекает ID пользователя из запроса"""
        try:
            # Попытка получить пользователя из токена
            authorization = request.headers.get("Authorization")
            if authorization and authorization.startswith("Bearer "):
                token = authorization.split(" ")[1]
                user_info = await get_current_user_from_token(token)
                return user_info.user_id if hasattr(user_info, 'user_id') else None
        except:
            pass
        return None
    
    def _determine_action(self, path: str, method: str) -> Optional[str]:
        """Определяет тип действия на основе пути и метода"""
        
        # Ищем точное совпадение
        if path in self.action_mapping:
            mapping = self.action_mapping[path]
            if isinstance(mapping, dict):
                return mapping.get(method)
            else:
                return mapping
        
        # Ищем совпадение по началу пути
        for route_pattern, action_config in self.action_mapping.items():
            if path.startswith(route_pattern):
                if isinstance(action_config, dict):
                    return action_config.get(method)
                else:
                    return action_config
        
        # Определяем действие по HTTP методу для API путей
        if path.startswith("/api/"):
            if method == "GET":
                return ActionType.VIEW.value
            elif method == "POST":
                return ActionType.CREATE.value
            elif method in ["PUT", "PATCH"]:
                return ActionType.UPDATE.value
            elif method == "DELETE":
                return ActionType.DELETE.value
        
        return None
    
    def _extract_resource_info(self, path: str) -> Tuple[Optional[str], Optional[str]]:
        """Извлекает информацию о ресурсе из пути"""
        
        # Разбиваем путь на части
        parts = [p for p in path.split("/") if p]
        
        if len(parts) < 2:
            return None, None
        
        # Пропускаем "api" если есть
        if parts[0] == "api":
            parts = parts[1:]
        
        if not parts:
            return None, None
        
        resource_type = parts[0]
        resource_id = None
        
        # Если есть числовой ID в следующей части
        if len(parts) > 1 and parts[1].isdigit():
            resource_id = parts[1]
        
        return resource_type, resource_id
    
    def _generate_description(self, action: str, path: str, method: str, status_code: int) -> str:
        """Генерирует описание действия"""
        
        action_descriptions = {
            ActionType.LOGIN.value: "Вход в систему",
            ActionType.LOGOUT.value: "Выход из системы",
            ActionType.VIEW.value: f"Просмотр {path}",
            ActionType.CREATE.value: f"Создание {path}",
            ActionType.UPDATE.value: f"Обновление {path}",
            ActionType.DELETE.value: f"Удаление {path}",
            ActionType.UPLOAD.value: f"Загрузка файла",
            ActionType.DOWNLOAD.value: f"Скачивание файла",
            ActionType.REQUEST_SUBMIT.value: "Подача заявки",
            ActionType.ANNOUNCEMENT_PUBLISH.value: "Публикация объявления",
            ActionType.PORTFOLIO_ADD.value: "Добавление в портфолио",
            ActionType.PORTFOLIO_UPDATE.value: "Обновление портфолио",
            ActionType.GROUP_CREATE.value: "Создание группы",
            ActionType.GROUP_UPDATE.value: "Обновление группы",
            ActionType.GROUP_DELETE.value: "Удаление группы",
            ActionType.REPORT_GENERATE.value: "Генерация отчета",
            ActionType.PASSWORD_CHANGE.value: "Смена пароля"
        }
        
        base_description = action_descriptions.get(action, f"{method} {path}")
        
        # Добавляем информацию о статусе если запрос завершился ошибкой
        if status_code >= 400:
            base_description += f" (ошибка {status_code})"
        
        return base_description 