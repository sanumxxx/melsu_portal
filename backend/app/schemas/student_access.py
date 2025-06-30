from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from .user import UserBase
from .department import DepartmentResponse

class StudentAccessBase(BaseModel):
    """Базовая схема для управления доступом к студентам"""
    access_level: str = Field(default='read', description="Уровень доступа: read, write, full")
    notes: Optional[str] = Field(None, description="Примечание к назначению")
    expires_at: Optional[datetime] = Field(None, description="Дата окончания доступа")

class StudentAccessCreate(StudentAccessBase):
    """Схема для создания назначения доступа"""
    employee_id: int = Field(..., description="ID сотрудника")
    department_id: int = Field(..., description="ID подразделения")

class StudentAccessAssignRequest(BaseModel):
    """Схема для запроса назначения доступа"""
    employee_id: int = Field(..., description="ID сотрудника")
    department_id: int = Field(..., description="ID подразделения")
    access_level: str = Field(default='read', description="Уровень доступа: read, write, full")
    notes: Optional[str] = Field(None, description="Примечание к назначению")

class StudentAccessUpdate(StudentAccessBase):
    """Схема для обновления назначения доступа"""
    is_active: Optional[bool] = Field(None, description="Активность назначения")

class StudentAccessResponse(StudentAccessBase):
    """Схема ответа с информацией о назначении доступа"""
    id: int
    employee_id: int
    department_id: int
    assigned_by: int
    is_active: bool
    assigned_at: datetime
    created_at: datetime
    updated_at: datetime
    
    # Связанные объекты
    employee: Optional[UserBase] = None
    department: Optional[DepartmentResponse] = None
    assigner: Optional[UserBase] = None
    
    class Config:
        from_attributes = True

class StudentAccessList(BaseModel):
    """Схема для списка назначений доступа"""
    id: int
    employee_id: int
    department_id: int
    access_level: str
    is_active: bool
    assigned_at: datetime
    expires_at: Optional[datetime]
    
    # Упрощенная информация о связанных объектах
    employee_name: str
    department_name: str
    department_type: str
    
    class Config:
        from_attributes = True

class AccessLevelInfo(BaseModel):
    """Информация об уровнях доступа"""
    value: str
    label: str
    description: str

class AccessLevels(BaseModel):
    """Доступные уровни доступа"""
    levels: List[AccessLevelInfo] = [
        AccessLevelInfo(
            value="read",
            label="Только просмотр", 
            description="Просмотр профилей и заявок студентов"
        ),
        AccessLevelInfo(
            value="write", 
            label="Редактирование",
            description="Просмотр и редактирование профилей студентов"
        ),
        AccessLevelInfo(
            value="full",
            label="Полный доступ",
            description="Все права + обработка заявок студентов"
        )
    ] 