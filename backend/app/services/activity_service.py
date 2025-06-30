from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from fastapi import Request
from typing import Optional, Dict, Any, List
from datetime import datetime
import math

from ..models.activity_log import ActivityLog, ActionType
from ..models.user import User
from ..schemas.activity_log import ActivityLogCreate, ActivityLogFilter, ActivityLogResponse, ActivityLogListResponse

class ActivityService:
    def __init__(self, db: Session):
        self.db = db
    
    def log_activity(
        self,
        action: str,
        description: str,
        user_id: Optional[int] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request: Optional[Request] = None
    ) -> ActivityLog:
        """
        Записывает действие в журнал активности
        """
        # Если передан request объект, извлекаем IP и User-Agent
        if request:
            ip_address = ip_address or self._get_client_ip(request)
            user_agent = user_agent or request.headers.get("User-Agent")
        
        activity_log = ActivityLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            description=description,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.db.add(activity_log)
        self.db.commit()
        self.db.refresh(activity_log)
        
        return activity_log
    
    def get_activity_logs(self, filters: ActivityLogFilter) -> ActivityLogListResponse:
        """
        Получает журнал активности с фильтрацией и пагинацией
        """
        query = self.db.query(ActivityLog).join(User, ActivityLog.user_id == User.id, isouter=True)
        
        # Применяем фильтры
        if filters.user_id:
            query = query.filter(ActivityLog.user_id == filters.user_id)
        
        if filters.action:
            query = query.filter(ActivityLog.action == filters.action)
        
        if filters.resource_type:
            query = query.filter(ActivityLog.resource_type == filters.resource_type)
        
        if filters.resource_id:
            query = query.filter(ActivityLog.resource_id == filters.resource_id)
        
        if filters.start_date:
            query = query.filter(ActivityLog.created_at >= filters.start_date)
        
        if filters.end_date:
            query = query.filter(ActivityLog.created_at <= filters.end_date)
        
        # Подсчитываем общее количество записей
        total = query.count()
        
        # Применяем пагинацию и сортировку
        query = query.order_by(desc(ActivityLog.created_at))
        offset = (filters.page - 1) * filters.size
        query = query.offset(offset).limit(filters.size)
        
        activity_logs = query.all()
        
        # Формируем ответ с дополнительной информацией о пользователях
        items = []
        for log in activity_logs:
            log_dict = {
                "id": log.id,
                "user_id": log.user_id,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "description": log.description,
                "details": log.details,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at,
                "user_full_name": None,
                "user_email": None
            }
            
            if log.user:
                log_dict["user_full_name"] = f"{log.user.last_name} {log.user.first_name}"
                if log.user.middle_name:
                    log_dict["user_full_name"] += f" {log.user.middle_name}"
                log_dict["user_email"] = log.user.email
            
            items.append(ActivityLogResponse(**log_dict))
        
        pages = math.ceil(total / filters.size)
        
        return ActivityLogListResponse(
            items=items,
            total=total,
            page=filters.page,
            size=filters.size,
            pages=pages
        )
    
    def get_user_activities(self, user_id: int, limit: int = 100) -> List[ActivityLogResponse]:
        """
        Получает последние действия конкретного пользователя
        """
        query = self.db.query(ActivityLog).filter(ActivityLog.user_id == user_id)
        query = query.order_by(desc(ActivityLog.created_at)).limit(limit)
        
        activity_logs = query.all()
        
        items = []
        for log in activity_logs:
            items.append(ActivityLogResponse(
                id=log.id,
                user_id=log.user_id,
                action=log.action,
                resource_type=log.resource_type,
                resource_id=log.resource_id,
                description=log.description,
                details=log.details,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                created_at=log.created_at
            ))
        
        return items
    
    def get_activity_stats(self, days: int = 30) -> Dict[str, Any]:
        """
        Получает статистику активности за последние дни
        """
        from datetime import datetime, timedelta
        
        start_date = datetime.now() - timedelta(days=days)
        
        # Общее количество действий
        total_actions = self.db.query(ActivityLog).filter(
            ActivityLog.created_at >= start_date
        ).count()
        
        # Уникальные пользователи
        unique_users = self.db.query(ActivityLog.user_id).filter(
            ActivityLog.created_at >= start_date,
            ActivityLog.user_id.isnot(None)
        ).distinct().count()
        
        # Топ действий
        from sqlalchemy import func
        top_actions = self.db.query(
            ActivityLog.action,
            func.count(ActivityLog.id).label('count')
        ).filter(
            ActivityLog.created_at >= start_date
        ).group_by(ActivityLog.action).order_by(desc('count')).limit(10).all()
        
        # Топ пользователей по активности
        top_users = self.db.query(
            ActivityLog.user_id,
            func.count(ActivityLog.id).label('count'),
            User.first_name,
            User.last_name,
            User.email
        ).join(User, ActivityLog.user_id == User.id, isouter=True).filter(
            ActivityLog.created_at >= start_date,
            ActivityLog.user_id.isnot(None)
        ).group_by(
            ActivityLog.user_id, User.first_name, User.last_name, User.email
        ).order_by(desc('count')).limit(10).all()
        
        return {
            "period_days": days,
            "total_actions": total_actions,
            "unique_users": unique_users,
            "top_actions": [{"action": action, "count": count} for action, count in top_actions],
            "top_users": [
                {
                    "user_id": user_id,
                    "full_name": f"{last_name} {first_name}" if first_name and last_name else "Неизвестно",
                    "email": email,
                    "actions_count": count
                }
                for user_id, count, first_name, last_name, email in top_users
            ]
        }
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Извлекает IP адрес клиента из запроса
        """
        # Проверяем заголовки прокси
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Возвращаем IP из клиента
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return "unknown"
    
    # Convenience methods for common actions
    def log_login(self, user_id: int, request: Request = None):
        """Логирует вход пользователя"""
        return self.log_activity(
            action=ActionType.LOGIN.value,
            description="Пользователь вошел в систему",
            user_id=user_id,
            request=request
        )
    
    def log_logout(self, user_id: int, request: Request = None):
        """Логирует выход пользователя"""
        return self.log_activity(
            action=ActionType.LOGOUT.value,
            description="Пользователь вышел из системы",
            user_id=user_id,
            request=request
        )
    
    def log_create(self, user_id: int, resource_type: str, resource_id: Any, description: str, details: Dict = None, request: Request = None):
        """Логирует создание ресурса"""
        return self.log_activity(
            action=ActionType.CREATE.value,
            description=description,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            request=request
        )
    
    def log_update(self, user_id: int, resource_type: str, resource_id: Any, description: str, details: Dict = None, request: Request = None):
        """Логирует обновление ресурса"""
        return self.log_activity(
            action=ActionType.UPDATE.value,
            description=description,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            request=request
        )
    
    def log_delete(self, user_id: int, resource_type: str, resource_id: Any, description: str, details: Dict = None, request: Request = None):
        """Логирует удаление ресурса"""
        return self.log_activity(
            action=ActionType.DELETE.value,
            description=description,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            request=request
        )
    
    def log_view(self, user_id: int, resource_type: str, resource_id: Any, description: str, details: Dict = None, request: Request = None):
        """Логирует просмотр ресурса"""
        return self.log_activity(
            action=ActionType.VIEW.value,
            description=description,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            request=request
        ) 