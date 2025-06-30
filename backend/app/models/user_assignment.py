from sqlalchemy import Column, Integer, String, Boolean, Date, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class UserDepartmentAssignment(Base):
    __tablename__ = "user_department_assignments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    
    # Основные поля назначения
    is_primary = Column(Boolean, default=False, nullable=False)  # основное назначение
    assignment_date = Column(Date, default=func.current_date(), nullable=False)
    end_date = Column(Date, nullable=True)  # для временных назначений
    
    # Дополнительные поля
    assignment_type = Column(String(50), default="permanent", nullable=False)  # permanent, temporary, acting
    workload_percentage = Column(Integer, default=100, nullable=False)  # процент занятости (0-100)
    notes = Column(Text, nullable=True)  # заметки к назначению
    
    # Системные поля
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="department_assignments")
    department = relationship("Department", back_populates="user_assignments")
    role = relationship("Role")
    created_by_user = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return f"<Assignment(user_id={self.user_id}, department={self.department_id}, role={self.role_id}, primary={self.is_primary})>"

    @property
    def is_active(self):
        """Проверяет, активно ли назначение на текущую дату"""
        from datetime import date
        today = date.today()
        
        if self.end_date is None:
            return True  # постоянное назначение
        
        return self.assignment_date <= today <= self.end_date

    @property
    def assignment_type_display(self):
        """Человекочитаемое название типа назначения"""
        type_mapping = {
            'permanent': 'Постоянное',
            'temporary': 'Временное', 
            'acting': 'Исполняющий обязанности'
        }
        return type_mapping.get(self.assignment_type, self.assignment_type) 