from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class StudentAccess(Base):
    __tablename__ = "student_access"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Пользователь (сотрудник), которому дается доступ
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Подразделение (факультет или кафедра), к студентам которого дается доступ
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    
    # Уровень доступа
    access_level = Column(String(50), default='read', nullable=False)  # 'read', 'write', 'full'
    
    # Кто назначил доступ
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Примечание к назначению
    notes = Column(Text, nullable=True)
    
    # Статус
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Даты
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)  # Опционально: срок действия
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Связи
    employee = relationship("User", foreign_keys=[employee_id], backref="student_access_grants")
    department = relationship("Department", backref="student_access_assignments")
    assigner = relationship("User", foreign_keys=[assigned_by], backref="assigned_student_access")
    
    def __repr__(self):
        return f"<StudentAccess(employee_id={self.employee_id}, department_id={self.department_id}, access_level='{self.access_level}')>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "department_id": self.department_id,
            "access_level": self.access_level,
            "assigned_by": self.assigned_by,
            "notes": self.notes,
            "is_active": self.is_active,
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        } 