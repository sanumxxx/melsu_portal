from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum

class ActionType(enum.Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    VIEW = "view"
    DOWNLOAD = "download"
    UPLOAD = "upload"
    APPROVE = "approve"
    REJECT = "reject"
    SUBMIT = "submit"
    ASSIGN = "assign"
    UNASSIGN = "unassign"
    GRANT_ACCESS = "grant_access"
    REVOKE_ACCESS = "revoke_access"
    PASSWORD_CHANGE = "password_change"
    EMAIL_VERIFY = "email_verify"
    REPORT_GENERATE = "report_generate"
    ANNOUNCEMENT_PUBLISH = "announcement_publish"
    REQUEST_SUBMIT = "request_submit"
    REQUEST_APPROVE = "request_approve"
    REQUEST_REJECT = "request_reject"
    PORTFOLIO_ADD = "portfolio_add"
    PORTFOLIO_UPDATE = "portfolio_update"
    GROUP_CREATE = "group_create"
    GROUP_UPDATE = "group_update"
    GROUP_DELETE = "group_delete"
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    ROLE_ASSIGN = "role_assign"
    ROLE_REVOKE = "role_revoke"
    DEPARTMENT_CREATE = "department_create"
    DEPARTMENT_UPDATE = "department_update"
    DEPARTMENT_DELETE = "department_delete"

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # nullable для системных действий
    action = Column(String, nullable=False, index=True)  # Тип действия (ActionType)
    resource_type = Column(String, nullable=True, index=True)  # Тип ресурса (user, announcement, request и т.д.)
    resource_id = Column(String, nullable=True, index=True)  # ID ресурса
    description = Column(Text, nullable=False)  # Описание действия
    details = Column(JSON, nullable=True)  # Дополнительные детали в JSON формате
    ip_address = Column(String, nullable=True)  # IP адрес пользователя
    user_agent = Column(Text, nullable=True)  # User Agent браузера
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Связи
    user = relationship("User", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<ActivityLog(id={self.id}, user_id={self.user_id}, action={self.action}, resource_type={self.resource_type})>" 