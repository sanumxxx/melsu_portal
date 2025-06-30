from sqlalchemy import Column, Integer, String, Text, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base
import enum

class RequestStatus(enum.Enum):
    DRAFT = "draft"           # Черновик
    SUBMITTED = "submitted"   # Подана
    IN_REVIEW = "in_review"   # На рассмотрении
    APPROVED = "approved"     # Одобрена
    REJECTED = "rejected"     # Отклонена
    COMPLETED = "completed"   # Выполнена

class Request(Base):
    __tablename__ = "requests"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("request_templates.id"), nullable=False)
    
    # Пользователи
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Автор заявки
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Ответственный
    possible_assignees = Column(JSON, nullable=True)  # Возможные исполнители (список ID)
    
    # Основная информация
    title = Column(String(500), nullable=False)  # Заголовок заявки
    description = Column(Text, nullable=True)    # Описание
    status = Column(String(20), default=RequestStatus.DRAFT.value, nullable=False)
    
    # Данные формы (JSON с ответами пользователя)
    form_data = Column(JSON, nullable=False)
    
    # Даты
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)  # Срок выполнения
    
    # Связи
    template = relationship("RequestTemplate", back_populates="requests")
    author = relationship("User", foreign_keys=[author_id], backref="authored_requests")
    assignee = relationship("User", foreign_keys=[assignee_id], backref="assigned_requests")
    comments = relationship("RequestComment", back_populates="request", cascade="all, delete-orphan")
    files = relationship("RequestFile", back_populates="request", cascade="all, delete-orphan")

class RequestComment(Base):
    __tablename__ = "request_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    text = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)  # Внутренний комментарий (не видимый автору)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    request = relationship("Request", back_populates="comments")
    user = relationship("User", backref="request_comments") 