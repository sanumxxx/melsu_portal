from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
from ..models.bpm import Notification, NotificationTemplate
from ..models.user import User

class NotificationService:
    """Сервис для работы с уведомлениями"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def send_notification(
        self, 
        user_id: int, 
        notification_type: str, 
        title: str, 
        content: str,
        data: Dict[str, Any] = None
    ) -> Notification:
        """Отправить уведомление пользователю"""
        
        notification = Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            content=content,
            data=data or {},
            created_at=datetime.utcnow()
        )
        
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        
        # TODO: Интегрировать с email/push уведомлениями
        print(f"[NOTIFICATION] Sent to user {user_id}: {title}")
        
        return notification
    
    def send_task_assigned_notification(self, task_id: int, assignee_id: int):
        """Уведомление о назначении задачи"""
        self.send_notification(
            user_id=assignee_id,
            notification_type="task_assigned",
            title="Новая задача",
            content=f"Вам назначена новая задача для выполнения",
            data={"task_id": task_id}
        )
    
    def send_request_status_notification(self, request_id: int, creator_id: int, status: str):
        """Уведомление об изменении статуса заявки"""
        status_labels = {
            "approved": "одобрена",
            "rejected": "отклонена", 
            "in_progress": "принята в работу"
        }
        
        self.send_notification(
            user_id=creator_id,
            notification_type="request_status_changed",
            title="Изменение статуса заявки",
            content=f"Ваша заявка {status_labels.get(status, status)}",
            data={"request_id": request_id, "status": status}
        )
    
    def get_user_notifications(self, user_id: int, unread_only: bool = False) -> List[Notification]:
        """Получить уведомления пользователя"""
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        return query.order_by(Notification.created_at.desc()).all()
    
    def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        """Отметить уведомление как прочитанное"""
        notification = self.db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if notification:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            self.db.commit()
            return True
        
        return False 