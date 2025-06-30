from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class ReportTemplate(Base):
    __tablename__ = "report_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # JSON структура полей отчета
    fields = Column(JSON, nullable=False)
    
    # Настройки доступа
    is_active = Column(Boolean, default=True, nullable=False)
    allowed_roles = Column(JSON, nullable=True)  # Роли, которые могут создавать отчеты
    viewers = Column(JSON, nullable=True)  # Пользователи/роли, которые могут просматривать отчеты
    
    # Метаданные
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Связи
    creator = relationship("User", foreign_keys=[created_by_id])
    reports = relationship("Report", back_populates="template", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ReportTemplate(name={self.name})>" 