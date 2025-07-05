import os
import logging
from dotenv import load_dotenv

# Импорт системы логирования
from .core.logging_config import setup_logging

# Настройка логирования
setup_logging()
logger = logging.getLogger(__name__)
logger.info("Система логирования инициализирована")

# Загружаем переменные окружения из .env файла в корне проекта (если существует)
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
env_path = os.path.join(project_root, '.env')
if os.path.exists(env_path):
    try:
        load_dotenv(dotenv_path=env_path)
        print(f"✅ Загружен .env файл: {env_path}")
    except Exception as e:
        print(f"⚠️ Ошибка загрузки .env файла: {e}")
        print("Используем переменные окружения по умолчанию")
else:
    print(f"⚠️ .env файл не найден: {env_path}")
    print("Используем переменные окружения по умолчанию")

from fastapi import FastAPI, HTTPException, Depends, status, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import traceback
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from .database import engine, Base
from .startup import startup_application, check_required_environment
from .api import auth, profile, dev, users, departments
from .dependencies import get_current_user, UserInfo
from .models.user import User as UserModel, UserRole
from .models.role import Role
from .schemas.user import UserRoleUpdate
from sqlalchemy.orm import Session
from .database import get_db
from .middleware.activity_middleware import ActivityLoggingMiddleware

# WebSocket для уведомлений
try:
    from .api.websocket import websocket_endpoint
    print("✅ WebSocket модуль импортирован успешно")
except Exception as e:
    print(f"❌ Ошибка импорта WebSocket модуля: {e}")
    websocket_endpoint = None

# Проверяем переменные окружения
check_required_environment()

# Инициализируем приложение (база данных, роли и т.д.)
startup_application()

app = FastAPI(
    title="MelSU Portal Backend",
    description="Portal API for my.melsu.ru",
    version="1.0.0"
)

# Добавляем middleware для логирования активности
app.add_middleware(ActivityLoggingMiddleware)

# Добавляем обработчик ошибок валидации для диагностики
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"❌ Ошибка валидации запроса к {request.url}:")
    print(f"   Метод: {request.method}")
    print(f"   Заголовки: {dict(request.headers)}")
    print(f"   Детали ошибки: {exc.errors()}")
    print(f"   Тело ошибки: {exc}")
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "url": str(request.url),
            "method": request.method
        }
    )

# Общий обработчик ошибок
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    print(f"❌ Общая ошибка в {request.url}:")
    print(f"   Тип ошибки: {type(exc).__name__}")
    print(f"   Сообщение: {str(exc)}")
    print(f"   Трассировка: {traceback.format_exc()}")
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"Внутренняя ошибка сервера: {str(exc)}",
            "type": type(exc).__name__
        }
    )

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3000",
        "http://10.128.7.101:3000",  # Локальная сеть
        "https://my.melsu.ru"  
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language", 
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers"
    ],
    expose_headers=["*"],
)

# Схемы Pydantic

class DashboardResponse(BaseModel):
    message: str
    user: UserInfo
    quick_links: List[Dict[str, str]]
    recent_activity: List[Dict[str, Any]]

class ScheduleItem(BaseModel):
    time: str
    subject: str
    room: str
    teacher: Optional[str] = None

class ScheduleResponse(BaseModel):
    user_email: str
    date: str
    schedule: List[ScheduleItem]

# Утилиты для работы с авторизацией

# Подключаем роуты
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(profile.router, prefix="/api", tags=["profile"])
app.include_router(dev.router, tags=["development"])  # DEV endpoints
app.include_router(users.router, prefix="/api", tags=["users"])  # Users management endpoints
app.include_router(departments.router, prefix="/api", tags=["departments"])  # Departments management endpoints

# Система шаблонов заявок
from .api import request_templates
app.include_router(request_templates.router, prefix="/api/request-templates", tags=["request-templates"])

# Система полей
from .api import fields
app.include_router(fields.router, prefix="/api/fields", tags=["fields"])

# Система заявок
from .api import requests
app.include_router(requests.router, prefix="/api/requests", tags=["requests"])

# Система ролей
from .api import roles
from .api import profile_fields
app.include_router(roles.router, prefix="/api/roles", tags=["roles"])
app.include_router(profile_fields.router, prefix="/api", tags=["profile-fields"])

# Система файлов
from .api import files
app.include_router(files.router, prefix="/api", tags=["files"])

# Система назначений
from .api import assignments
app.include_router(assignments.router, prefix="/api", tags=["assignments"])

# Система портфолио
from .api import portfolio
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])

# Справочники
from .api import directories
app.include_router(directories.router, prefix="/api/directories", tags=["directories"])

# Управление доступом к справочникам
from .api.admin import directory_access
app.include_router(directory_access.router, prefix="/api/admin/directory-access", tags=["admin-directory-access"])



# Система доступа к группам
from .api import group_access
app.include_router(group_access.router, prefix="/api", tags=["group-access"])

# Система групп
from .api import groups
app.include_router(groups.router, prefix="/api", tags=["groups"])

# Система объявлений
from .api import announcements
app.include_router(announcements.router, prefix="/api", tags=["announcements"])

# Система кураторского доступа
from .api import curator_access
app.include_router(curator_access.router, prefix="/api", tags=["curator-access"])

# Система Telegram интеграции
from .api import telegram
app.include_router(telegram.router, prefix="/api", tags=["telegram"])

# OAuth интеграция
from .api import oauth
app.include_router(oauth.router, tags=["oauth"])

# Система отчетов
from .api import report_templates, reports
app.include_router(report_templates.router, prefix="/api", tags=["report-templates"])
app.include_router(reports.router, prefix="/api", tags=["reports"])

# Журнал активности
from .api import activity_logs
app.include_router(activity_logs.router, prefix="/api/activity-logs", tags=["activity-logs"])

# Статическая раздача файлов
import os
# Определяем абсолютный путь к папке uploads относительно текущего файла main.py
current_dir = os.path.dirname(os.path.abspath(__file__))
uploads_dir = os.path.join(current_dir, "..", "uploads")
uploads_dir = os.path.abspath(uploads_dir)

print(f"📁 Static files directory: {uploads_dir}")

if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
    print(f"✅ Created uploads directory: {uploads_dir}")

# Создаем подпапки если их нет
announcements_dir = os.path.join(uploads_dir, "announcements")
if not os.path.exists(announcements_dir):
    os.makedirs(announcements_dir)
    print(f"✅ Created announcements directory: {announcements_dir}")

app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
print(f"🌐 Static files mounted at /uploads -> {uploads_dir}")

# WebSocket для уведомлений
@app.websocket("/ws/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: int):
    """WebSocket endpoint для real-time уведомлений"""
    print(f"🔌 WebSocket подключение от пользователя {user_id}")
    
    if websocket_endpoint is None:
        print("❌ WebSocket endpoint не доступен")
        await websocket.accept()
        await websocket.send_json({
            "error": "WebSocket service temporarily unavailable",
            "timestamp": datetime.now().isoformat()
        })
        await websocket.close()
        return
    
    try:
        await websocket_endpoint(websocket, user_id)
    except Exception as e:
        print(f"❌ Ошибка WebSocket для пользователя {user_id}: {e}")
        try:
            await websocket.accept()
            await websocket.send_json({
                "error": f"WebSocket error: {str(e)}",
                "timestamp": datetime.now().isoformat()
            })
            await websocket.close()
        except:
            pass

@app.get("/")
async def root():
    return {"message": "University Portal API"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "portal-backend", "version": "1.0.0"}

@app.get("/debug/uploads")
async def debug_uploads():
    """Диагностика статических файлов"""
    try:
        # Определяем абсолютный путь к папке uploads
        current_dir = os.path.dirname(os.path.abspath(__file__))
        uploads_dir = os.path.join(current_dir, "..", "uploads")
        uploads_dir = os.path.abspath(uploads_dir)
        
        announcements_dir = os.path.join(uploads_dir, "announcements")
        
        # Проверяем существование папок
        uploads_exists = os.path.exists(uploads_dir)
        announcements_exists = os.path.exists(announcements_dir)
        
        # Считаем файлы
        uploads_files = []
        announcements_files = []
        
        if uploads_exists:
            uploads_files = os.listdir(uploads_dir) if os.path.isdir(uploads_dir) else []
        
        if announcements_exists:
            announcements_files = os.listdir(announcements_dir) if os.path.isdir(announcements_dir) else []
        
        return {
            "uploads_directory": uploads_dir,
            "uploads_exists": uploads_exists,
            "announcements_directory": announcements_dir,
            "announcements_exists": announcements_exists,
            "uploads_files_count": len(uploads_files),
            "announcements_files_count": len(announcements_files),
            "recent_announcements_files": announcements_files[-5:] if announcements_files else [],
            "static_mount_status": "mounted at /uploads",
            "working_directory": os.getcwd()
        }
    except Exception as e:
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@app.get("/api/websocket/status")
async def websocket_status():
    """Проверка состояния WebSocket сервиса"""
    try:
        from .api.websocket import manager
        return {
            "status": "available" if websocket_endpoint is not None else "unavailable",
            "connected_users": manager.get_connected_users() if websocket_endpoint is not None else [],
            "connection_count": len(manager.get_connected_users()) if websocket_endpoint is not None else 0,
            "endpoint_url": "/ws/{user_id}",
            "module_imported": websocket_endpoint is not None
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "module_imported": websocket_endpoint is not None
        }

# ===========================================
# ЗАЩИЩЕННЫЕ ЭНДПОИНТЫ С ПРОСТОЙ АВТОРИЗАЦИЕЙ
# ===========================================

@app.get("/profile", response_model=UserInfo)
async def get_profile(current_user: UserInfo = Depends(get_current_user)):
    """Получение профиля пользователя"""
    return current_user

@app.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(current_user: UserInfo = Depends(get_current_user)):
    """Получение данных для главной страницы"""
    
    return DashboardResponse(
        message=f"Добро пожаловать, {current_user.first_name} {current_user.last_name}!",
        user=current_user,
        quick_links=[
            {"name": "Расписание", "url": "/schedule"},
            {"name": "Оценки", "url": "/grades"},
            {"name": "Объявления", "url": "/announcements"}
        ],
        recent_activity=[
            {
                "type": "login",
                "message": "Вход в систему",
                "timestamp": datetime.now().isoformat()
            },
            {
                "type": "schedule",
                "message": "Просмотр расписания",
                "timestamp": datetime.now().isoformat()
            }
        ]
    )

@app.get("/schedule", response_model=ScheduleResponse)
async def get_schedule(current_user: UserInfo = Depends(get_current_user)):
    """Получение расписания пользователя"""
    
    # Заглушка данных расписания
    mock_schedule = [
        ScheduleItem(
            time="09:00-10:30",
            subject="Математика",
            room="ауд. 301",
            teacher="Иванов И.И."
        ),
        ScheduleItem(
            time="11:00-12:30",
            subject="Физика",
            room="ауд. 205",
            teacher="Петров П.П."
        ),
        ScheduleItem(
            time="13:30-15:00",
            subject="Программирование",
            room="ауд. 401",
            teacher="Сидоров С.С."
        )
    ]
    
    return ScheduleResponse(
        user_email=current_user.email,
        date=datetime.now().strftime("%Y-%m-%d"),
        schedule=mock_schedule
    )

@app.get("/grades")
async def get_grades(current_user: UserInfo = Depends(get_current_user)):
    """Получение оценок пользователя"""
    
    return {
        "user_email": current_user.email,
        "semester": "2024-2025 осенний",
        "subjects": [
            {
                "name": "Математика",
                "grades": [5, 4, 5, 4],
                "average": 4.5
            },
            {
                "name": "Физика", 
                "grades": [4, 5, 4, 5],
                "average": 4.5
            },
            {
                "name": "Программирование",
                "grades": [5, 5, 5, 5],
                "average": 5.0
            }
        ]
    }

@app.get("/announcements")
async def get_announcements(current_user: UserInfo = Depends(get_current_user)):
    """Получение объявлений"""
    
    return {
        "announcements": [
            {
                "id": 1,
                "title": "Изменение в расписании",
                "content": "Занятие по математике 25.06 переносится на 26.06",
                "date": "2025-06-22",
                "urgent": True
            },
            {
                "id": 2,
                "title": "Новые материалы в библиотеке",
                "content": "Добавлены новые учебники по программированию",
                "date": "2025-06-21",
                "urgent": False
            }
        ]
    }

# ===========================================
# АДМИНСКИЕ ЭНДПОИНТЫ 
# ===========================================

def has_admin_role(current_user: UserInfo) -> bool:
    """Проверка админских прав"""
    return "admin" in (current_user.roles if hasattr(current_user, 'roles') else [])

@app.post("/admin/make-admin/{user_id}")
async def make_user_admin(user_id: int, current_user: UserInfo = Depends(get_current_user), db: Session = Depends(get_db)):
    """Тестовый эндпоинт для назначения админа (временно без проверки прав)"""
    
    # Получаем пользователя
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Добавляем роль админа если её нет
    user_roles = user.roles or []
    if "admin" not in user_roles:
        user_roles.append("admin")
        user.roles = user_roles
        db.commit()
        db.refresh(user)
    
    return {"message": f"Пользователь {user.email} назначен администратором", "roles": user.roles}

@app.get("/admin/users")
async def get_all_users(current_user: UserInfo = Depends(get_current_user), db: Session = Depends(get_db)):
    """Получение всех пользователей (только для админа)"""
    
    # Проверяем админские права
    user_full = db.query(UserModel).filter(UserModel.email == current_user.email).first()
    if not user_full or "admin" not in (user_full.roles or []):
        raise HTTPException(status_code=403, detail="Доступ запрещен: требуются права администратора")
    
    users = db.query(UserModel).all()
    return {"users": users}

@app.get("/admin/users/by-role/{role}")
async def get_users_by_role(role: str, current_user: UserInfo = Depends(get_current_user), db: Session = Depends(get_db)):
    """Получение пользователей по роли"""
    
    # Проверяем админские права
    user_full = db.query(UserModel).filter(UserModel.email == current_user.email).first()
    if not user_full or "admin" not in (user_full.roles or []):
        raise HTTPException(status_code=403, detail="Доступ запрещен: требуются права администратора")
    
    # Валидируем роль
    valid_roles = [r.value for r in UserRole]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Недопустимая роль. Доступные роли: {valid_roles}")
    
    users = db.query(UserModel).all()
    filtered_users = [user for user in users if role in (user.roles or [])]
    
    return {"role": role, "users": filtered_users, "count": len(filtered_users)}

@app.put("/admin/users/{user_id}/roles")
async def update_user_roles(user_id: int, role_data: UserRoleUpdate, current_user: UserInfo = Depends(get_current_user), db: Session = Depends(get_db)):
    """Обновление ролей пользователя"""
    
    # Проверяем админские права
    user_full = db.query(UserModel).filter(UserModel.email == current_user.email).first()
    if not user_full or "admin" not in (user_full.roles or []):
        raise HTTPException(status_code=403, detail="Доступ запрещен: требуются права администратора")
    
    # Получаем пользователя для обновления
    target_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Валидируем роли через базу данных (расширенные роли)
    for role in role_data.roles:
        existing_role = db.query(Role).filter(Role.name == role, Role.is_active == True).first()
        if not existing_role:
            # Если роли нет в расширенной системе, проверяем базовые роли
            valid_roles = [r.value for r in UserRole]
            if role not in valid_roles:
                raise HTTPException(status_code=400, detail=f"Недопустимая роль: {role}")
    
    # Обновляем роли
    target_user.roles = role_data.roles
    db.commit()
    db.refresh(target_user)
    
    return {"message": "Роли пользователя обновлены", "user": target_user}

@app.post("/api/users/{user_id}/roles")
async def manage_user_role(
    user_id: int, 
    role_data: dict,
    current_user: UserInfo = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Добавление или удаление роли пользователя"""
    
    # Проверяем админские права
    user_full = db.query(UserModel).filter(UserModel.email == current_user.email).first()
    if not user_full or "admin" not in (user_full.roles or []):
        raise HTTPException(status_code=403, detail="Доступ запрещен: требуются права администратора")
    
    # Получаем пользователя для обновления
    target_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    role = role_data.get("role")
    action = role_data.get("action", "add")  # add или remove
    
    if not role:
        raise HTTPException(status_code=400, detail="Не указана роль")
    
    # Валидируем роль через базу данных (расширенные роли)
    existing_role = db.query(Role).filter(Role.name == role, Role.is_active == True).first()
    if not existing_role:
        # Если роли нет в расширенной системе, проверяем базовые роли
        valid_roles = [r.value for r in UserRole]
        if role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Недопустимая роль: {role}")
    
    # Получаем текущие роли
    current_roles = target_user.roles or []
    
    if action == "add":
        if role not in current_roles:
            current_roles.append(role)
            message = f"Роль '{role}' добавлена пользователю"
        else:
            message = f"Пользователь уже имеет роль '{role}'"
    elif action == "remove":
        if role in current_roles:
            current_roles.remove(role)
            message = f"Роль '{role}' удалена у пользователя"
        else:
            message = f"Пользователь не имеет роль '{role}'"
    else:
        raise HTTPException(status_code=400, detail="Недопустимое действие. Используйте 'add' или 'remove'")
    
    # Обновляем роли
    target_user.roles = current_roles
    db.commit()
    db.refresh(target_user)
    
    return {
        "message": message, 
        "user_id": user_id,
        "role": role,
        "action": action,
        "current_roles": current_roles
    }

@app.post("/admin/init-system")
async def manual_system_initialization(current_user: UserInfo = Depends(get_current_user), db: Session = Depends(get_db)):
    """Ручной запуск инициализации системы (только для админа)"""
    
    # Проверяем админские права
    user_full = db.query(UserModel).filter(UserModel.email == current_user.email).first()
    if not user_full or "admin" not in (user_full.roles or []):
        raise HTTPException(status_code=403, detail="Доступ запрещен: требуются права администратора")
    
    try:
        from .startup import init_system_roles, init_field_types, init_base_departments
        
        # Запускаем инициализацию
        roles_stats = init_system_roles(db)
        fields_stats = init_field_types(db)
        depts_stats = init_base_departments(db)
        
        # Сохраняем изменения
        db.commit()
        
        # Подсчитываем общую статистику
        total_created = roles_stats['created'] + fields_stats['created'] + depts_stats['created']
        total_updated = roles_stats['updated'] + fields_stats['updated'] + depts_stats['updated']
        total_errors = roles_stats['errors'] + fields_stats['errors'] + depts_stats['errors']
        
        return {
            "message": "Инициализация системы завершена",
            "stats": {
                "total_created": total_created,
                "total_updated": total_updated, 
                "total_errors": total_errors,
                "roles": roles_stats,
                "field_types": fields_stats,
                "departments": depts_stats
            },
            "success": total_errors == 0
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Ошибка при ручной инициализации: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка инициализации: {str(e)}")

@app.get("/admin/system-status")
async def get_system_status(current_user: UserInfo = Depends(get_current_user), db: Session = Depends(get_db)):
    """Проверка состояния системных компонентов (только для админа)"""
    
    # Проверяем админские права
    user_full = db.query(UserModel).filter(UserModel.email == current_user.email).first()
    if not user_full or "admin" not in (user_full.roles or []):
        raise HTTPException(status_code=403, detail="Доступ запрещен: требуются права администратора")
    
    try:
        # Проверяем роли
        roles_count = db.query(Role).count()
        system_roles_count = db.query(Role).filter(Role.is_system == True).count()
        
        # Проверяем типы полей
        field_types_count = db.query(FieldType).count()
        
        # Проверяем департаменты
        departments_count = db.query(Department).count()
        
        return {
            "database_connected": True,
            "roles": {
                "total": roles_count,
                "system_roles": system_roles_count,
                "expected_system_roles": 8  # Количество ролей в SYSTEM_ROLES
            },
            "field_types": {
                "total": field_types_count,
                "expected": 12  # Количество типов в FIELD_TYPES
            },
            "departments": {
                "total": departments_count,
                "expected": 7  # Количество департаментов в BASE_DEPARTMENTS
            },
            "initialization_needed": {
                "roles": system_roles_count < 8,
                "field_types": field_types_count < 12,
                "departments": departments_count < 7
            }
        }
        
    except Exception as e:
        logger.error(f"Ошибка при проверке статуса системы: {e}")
        return {
            "database_connected": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 