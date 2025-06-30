from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

class AssignmentType(str, Enum):
    permanent = "permanent"
    temporary = "temporary" 
    acting = "acting"

class AssignmentBase(BaseModel):
    department_id: int = Field(..., description="ID подразделения")
    role_id: int = Field(..., description="ID роли/должности")
    is_primary: bool = Field(False, description="Основное назначение")
    assignment_date: date = Field(default_factory=date.today, description="Дата назначения")
    end_date: Optional[date] = Field(None, description="Дата окончания (для временных назначений)")
    assignment_type: AssignmentType = Field(AssignmentType.permanent, description="Тип назначения")
    workload_percentage: int = Field(100, ge=1, le=100, description="Процент занятости (1-100)")
    notes: Optional[str] = Field(None, max_length=1000, description="Заметки к назначению")

    @validator('end_date')
    def validate_end_date(cls, v, values):
        if v and 'assignment_date' in values and v <= values['assignment_date']:
            raise ValueError('Дата окончания должна быть больше даты назначения')
        return v

class AssignmentCreate(AssignmentBase):
    """Схема для создания назначения"""
    pass

class AssignmentUpdate(BaseModel):
    """Схема для обновления назначения"""
    is_primary: Optional[bool] = None
    end_date: Optional[date] = None
    assignment_type: Optional[AssignmentType] = None
    workload_percentage: Optional[int] = Field(None, ge=1, le=100)
    notes: Optional[str] = Field(None, max_length=1000)

class DepartmentInfo(BaseModel):
    """Краткая информация о подразделении"""
    id: int
    name: str
    short_name: Optional[str]
    department_type: str

class RoleInfo(BaseModel):
    """Краткая информация о роли"""
    id: int
    name: str
    display_name: str

class UserInfo(BaseModel):
    """Краткая информация о пользователе"""
    id: int
    first_name: str
    last_name: str
    middle_name: Optional[str]
    email: str
    roles: List[str] = []
    is_active: bool = True
    is_verified: bool = True
    
    class Config:
        from_attributes = True

class AssignmentResponse(AssignmentBase):
    """Схема для ответа с назначением"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    
    # Связанные объекты
    department: DepartmentInfo
    role: RoleInfo
    user: Optional[UserInfo] = None  # включается при запросе назначений подразделения
    created_by_user: Optional[UserInfo] = None
    
    # Вычисляемые поля
    is_active: bool
    assignment_type_display: str

    class Config:
        from_attributes = True

class UserAssignmentsResponse(BaseModel):
    """Ответ со всеми назначениями пользователя"""
    user_id: int
    user: UserInfo
    assignments: List[AssignmentResponse]
    primary_assignment: Optional[AssignmentResponse]

class DepartmentAssignmentsResponse(BaseModel):
    """Ответ со всеми назначениями подразделения"""
    department_id: int
    department: DepartmentInfo
    assignments: List[AssignmentResponse]

class AssignmentStats(BaseModel):
    """Статистика по назначениям"""
    total_assignments: int
    active_assignments: int
    primary_assignments: int
    by_type: dict
    by_department: dict

class BulkAssignmentCreate(BaseModel):
    """Массовое создание назначений"""
    user_ids: List[int] = Field(..., min_items=1, description="Список ID пользователей")
    department_id: int = Field(..., description="ID подразделения")
    role_id: int = Field(..., description="ID роли")
    assignment_type: AssignmentType = Field(AssignmentType.permanent)
    workload_percentage: int = Field(100, ge=1, le=100)
    assignment_date: date = Field(default_factory=date.today)
    end_date: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=1000)

class BulkAssignmentResponse(BaseModel):
    """Ответ массового создания назначений"""
    created_count: int
    failed_count: int
    created_assignments: List[AssignmentResponse]
    errors: List[str] 