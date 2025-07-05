from sqlalchemy import Column, Integer, String, DateTime, Boolean, Date, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum
import json

class Gender(enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

class UserRole(enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"
    EMPLOYEE = "employee"
    SCHOOLCHILD = "schoolchild"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    middle_name = Column(String, nullable=True)
    birth_date = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    _roles = Column('roles', Text, default='[]', nullable=True)  # JSON строка ролей
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    @property
    def roles(self):
        """Получение ролей как список"""
        if self._roles:
            try:
                return json.loads(self._roles)
            except (json.JSONDecodeError, TypeError):
                return []
        return []
    
    @roles.setter
    def roles(self, value):
        """Установка ролей как список"""
        if value is None:
            self._roles = '[]'
        else:
            self._roles = json.dumps(value)
    
    # Связи
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    department_assignments = relationship("UserDepartmentAssignment", foreign_keys="UserDepartmentAssignment.user_id", back_populates="user", cascade="all, delete-orphan")
    portfolio_achievements = relationship("PortfolioAchievement", back_populates="user", cascade="all, delete-orphan")
    created_announcements = relationship("Announcement", back_populates="created_by", cascade="all, delete-orphan")
    announcement_views = relationship("AnnouncementView", back_populates="user", cascade="all, delete-orphan")
    
    # Свойства для работы с назначениями
    @property
    def primary_assignment(self):
        """Возвращает основное назначение пользователя"""
        for assignment in self.department_assignments:
            if assignment.is_primary and assignment.is_active:
                return assignment
        return None
    
    @property
    def active_assignments(self):
        """Возвращает все активные назначения"""
        return [assignment for assignment in self.department_assignments if assignment.is_active]

class EmailVerification(Base):
    __tablename__ = "email_verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now()) 