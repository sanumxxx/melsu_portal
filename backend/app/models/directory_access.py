from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from datetime import datetime
from typing import Optional, Dict, Any

from ..database import Base


class AccessType(PyEnum):
    """Типы доступа"""
    READ = "read"           # Только просмотр
    WRITE = "write"         # Просмотр + редактирование
    ADMIN = "admin"         # Полный доступ + управление правами


class AccessScope(PyEnum):
    """Области доступа"""
    STUDENTS = "students"         # Только студенты
    GROUPS = "groups"            # Только группы
    DEPARTMENTS = "departments"   # Только подразделения
    ALL = "all"                  # Все справочники


class DirectoryAccess(Base):
    """
    Модель для управления доступом к справочникам
    
    Очень гибкая система:
    - Можно настроить доступ любому пользователю к любому подразделению
    - Различные типы доступа (чтение, запись, администрирование)
    - Различные области доступа (студенты, группы, подразделения)
    - Наследование прав на дочерние подразделения
    - Дополнительные ограничения через JSON
    - Временные ограничения доступа
    """
    
    __tablename__ = "directory_access"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Кто имеет доступ
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # К какому подразделению доступ (None = ко всем)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Тип доступа
    access_type = Column(Enum(AccessType), nullable=False, default=AccessType.READ)
    
    # Область доступа
    scope = Column(Enum(AccessScope), nullable=False, default=AccessScope.ALL)
    
    # Наследование прав на дочерние подразделения
    inherit_children = Column(Boolean, default=True, nullable=False)
    
    # Дополнительные ограничения (JSON)
    # Например: {"max_students": 100, "allowed_courses": [1, 2, 3], "education_forms": ["очная"]}
    restrictions = Column(JSON, nullable=True)
    
    # Описание доступа
    description = Column(Text, nullable=True)
    
    # Метаданные
    granted_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    granted_at = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=True)  # Дата истечения доступа
    
    # Активность
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Системные поля
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Связи
    user = relationship("User", foreign_keys=[user_id], back_populates="directory_accesses")
    department = relationship("Department", back_populates="directory_accesses")
    granted_by_user = relationship("User", foreign_keys=[granted_by])
    
    def __repr__(self):
        return f"<DirectoryAccess(user_id={self.user_id}, department_id={self.department_id}, access_type={self.access_type}, scope={self.scope})>"
    
    def is_valid(self) -> bool:
        """Проверяет, действителен ли доступ"""
        if not self.is_active:
            return False
        
        if self.expires_at and self.expires_at < datetime.utcnow():
            return False
        
        return True
    
    def get_restrictions(self) -> Dict[str, Any]:
        """Получает ограничения доступа"""
        return self.restrictions or {}
    
    def has_restriction(self, key: str) -> bool:
        """Проверяет наличие ограничения"""
        restrictions = self.get_restrictions()
        return key in restrictions
    
    def get_restriction(self, key: str, default: Any = None) -> Any:
        """Получает значение ограничения"""
        restrictions = self.get_restrictions()
        return restrictions.get(key, default)
    
    def can_access_department(self, target_department_id: int) -> bool:
        """
        Проверяет, может ли пользователь получить доступ к указанному подразделению
        с учетом наследования прав
        """
        # Если доступ к любому подразделению
        if self.department_id is None:
            return True
        
        # Если доступ к конкретному подразделению
        if self.department_id == target_department_id:
            return True
        
        # Если наследование включено, проверяем иерархию
        if self.inherit_children and self.department:
            # Здесь нужно проверить, является ли target_department_id дочерним
            # Это будет реализовано в сервисе
            return False
        
        return False
    
    def can_access_scope(self, scope: str) -> bool:
        """Проверяет, может ли пользователь получить доступ к указанной области"""
        if self.scope == AccessScope.ALL:
            return True
        
        return self.scope.value == scope
    
    def can_write(self) -> bool:
        """Проверяет, может ли пользователь редактировать"""
        return self.access_type in [AccessType.WRITE, AccessType.ADMIN]
    
    def can_admin(self) -> bool:
        """Проверяет, может ли пользователь администрировать"""
        return self.access_type == AccessType.ADMIN


class DirectoryAccessTemplate(Base):
    """
    Шаблоны доступа для быстрого назначения
    
    Например:
    - "Работник факультета" - доступ ко всем студентам и группам факультета
    - "Работник кафедры" - доступ ко всем студентам и группам кафедры
    - "Куратор группы" - доступ только к студентам конкретной группы
    - "Декан" - полный доступ к факультету
    """
    
    __tablename__ = "directory_access_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Основная информация
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Настройки доступа
    access_type = Column(Enum(AccessType), nullable=False, default=AccessType.READ)
    scope = Column(Enum(AccessScope), nullable=False, default=AccessScope.ALL)
    inherit_children = Column(Boolean, default=True, nullable=False)
    restrictions = Column(JSON, nullable=True)
    
    # Применимость
    for_roles = Column(JSON, nullable=True)  # Для каких ролей подходит шаблон
    department_types = Column(JSON, nullable=True)  # Для каких типов подразделений
    
    # Метаданные
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Системные поля
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Связи
    created_by_user = relationship("User")
    
    def __repr__(self):
        return f"<DirectoryAccessTemplate(name='{self.name}', access_type={self.access_type}, scope={self.scope})>"
    
    def is_suitable_for_role(self, role: str) -> bool:
        """Проверяет, подходит ли шаблон для указанной роли"""
        if not self.for_roles:
            return True
        
        return role in self.for_roles
    
    def is_suitable_for_department_type(self, department_type: str) -> bool:
        """Проверяет, подходит ли шаблон для типа подразделения"""
        if not self.department_types:
            return True
        
        return department_type in self.department_types
    
    def create_access_record(self, user_id: int, department_id: int, granted_by: int) -> DirectoryAccess:
        """Создает запись доступа на основе шаблона"""
        return DirectoryAccess(
            user_id=user_id,
            department_id=department_id,
            access_type=self.access_type,
            scope=self.scope,
            inherit_children=self.inherit_children,
            restrictions=self.restrictions,
            description=f"Доступ по шаблону '{self.name}'",
            granted_by=granted_by
        ) 