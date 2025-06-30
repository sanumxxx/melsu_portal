from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    short_name = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    
    # Иерархическая структура
    parent_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    level = Column(Integer, default=0, nullable=False)  # 0-университет, 1-институт, 2-факультет, 3-кафедра
    sort_order = Column(Integer, default=0, nullable=False)
    
    # Типы подразделений
    department_type = Column(String(50), nullable=False)  # university, rectorate, institute, faculty, department, chair, management, directorate, lab, center, service, sector, group
    
    # Контактная информация
    head_name = Column(String(200), nullable=True)  # Руководитель
    head_title = Column(String(100), nullable=True)  # Должность руководителя
    phone = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    website = Column(String(200), nullable=True)
    address = Column(Text, nullable=True)
    room_number = Column(String(20), nullable=True)
    
    # Статус
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Даты
    established_date = Column(DateTime, nullable=True)  # Дата основания
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Связи
    parent = relationship("Department", remote_side=[id], back_populates="children")
    children = relationship("Department", back_populates="parent", cascade="all, delete-orphan")
    user_assignments = relationship("UserDepartmentAssignment", back_populates="department", cascade="all, delete-orphan")
    
    # Свойства для работы с назначениями
    @property
    def assigned_users(self):
        """Возвращает всех назначенных пользователей"""
        return [assignment.user for assignment in self.user_assignments if assignment.is_active]
    
    @property
    def head_assignment(self):
        """Возвращает назначение руководителя подразделения"""
        # Ищем назначение с ролью руководителя (можно настроить логику)
        for assignment in self.user_assignments:
            if assignment.is_active and assignment.role.name in ['head', 'director', 'dean', 'rector']:
                return assignment
        return None
    
    def __repr__(self):
        return f"<Department(id={self.id}, name='{self.name}', type='{self.department_type}')>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "short_name": self.short_name,
            "description": self.description,
            "parent_id": self.parent_id,
            "level": self.level,
            "sort_order": self.sort_order,
            "department_type": self.department_type,
            "head_name": self.head_name,
            "head_title": self.head_title,
            "phone": self.phone,
            "email": self.email,
            "website": self.website,
            "address": self.address,
            "room_number": self.room_number,
            "is_active": self.is_active,
            "established_date": self.established_date.isoformat() if self.established_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "children_count": len(self.children) if self.children else 0
        } 