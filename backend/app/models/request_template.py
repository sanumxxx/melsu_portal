from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base
import enum

class RoutingType(enum.Enum):
    MANUAL = "manual"              # Ручное назначение
    AUTO_ASSIGN = "auto_assign"    # Автоматическое назначение из списка
    DEPARTMENT = "department"      # По отделам
    ROUND_ROBIN = "round_robin"    # По очереди

class RequestTemplate(Base):
    __tablename__ = "request_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    deadline_days = Column(Integer, default=7, nullable=False)  # Срок выполнения в днях
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Поля маршрутизации
    routing_type = Column(String(20), default=RoutingType.MANUAL.value, nullable=False)
    default_assignees = Column(JSON, nullable=True)  # Список ID пользователей для назначения
    auto_assign_enabled = Column(Boolean, default=False, nullable=False)  # Автоматическое назначение
    department_routing = Column(Boolean, default=False, nullable=False)  # Маршрутизация по отделам
    routing_rules = Column(JSON, nullable=True)  # Правила условной маршрутизации
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    fields = relationship("Field", back_populates="template")
    requests = relationship("Request", back_populates="template") 