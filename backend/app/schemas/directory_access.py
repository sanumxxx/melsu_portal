from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# Перечисления для схем
class AccessType(str, Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"

class AccessScope(str, Enum):
    STUDENTS = "students"
    GROUPS = "groups"
    DEPARTMENTS = "departments"
    ALL = "all"

# Базовые схемы для DirectoryAccess
class DirectoryAccessBase(BaseModel):
    user_id: int
    department_id: Optional[int] = None
    access_type: AccessType = AccessType.READ
    scope: AccessScope = AccessScope.ALL
    inherit_children: bool = True
    restrictions: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True

class DirectoryAccessCreate(DirectoryAccessBase):
    pass

class DirectoryAccessUpdate(BaseModel):
    access_type: Optional[AccessType] = None
    scope: Optional[AccessScope] = None
    inherit_children: Optional[bool] = None
    restrictions: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None

class DirectoryAccessResponse(DirectoryAccessBase):
    id: int
    granted_by: Optional[int] = None
    granted_at: datetime
    created_at: datetime
    updated_at: datetime
    
    # Дополнительная информация
    user_info: Optional[Dict[str, Any]] = None
    department_info: Optional[Dict[str, Any]] = None
    granted_by_info: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class DirectoryAccessList(BaseModel):
    accesses: List[DirectoryAccessResponse]
    pagination: Dict[str, int]

# Схемы для массового управления
class BulkAssignAccessRequest(BaseModel):
    user_ids: List[int]
    department_ids: Optional[List[int]] = None
    access_type: AccessType = AccessType.READ
    scope: AccessScope = AccessScope.ALL
    inherit_children: bool = True
    restrictions: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    expires_at: Optional[datetime] = None

class BulkAssignAccessResponse(BaseModel):
    success_count: int
    failed_count: int
    errors: List[str]
    created_accesses: List[DirectoryAccessResponse]

# Схемы для шаблонов доступа
class DirectoryAccessTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    access_type: AccessType = AccessType.READ
    scope: AccessScope = AccessScope.ALL
    inherit_children: bool = True
    restrictions: Optional[Dict[str, Any]] = None
    for_roles: Optional[List[str]] = None
    department_types: Optional[List[str]] = None
    is_active: bool = True

class DirectoryAccessTemplateCreate(DirectoryAccessTemplateBase):
    pass

class DirectoryAccessTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    access_type: Optional[AccessType] = None
    scope: Optional[AccessScope] = None
    inherit_children: Optional[bool] = None
    restrictions: Optional[Dict[str, Any]] = None
    for_roles: Optional[List[str]] = None
    department_types: Optional[List[str]] = None
    is_active: Optional[bool] = None

class DirectoryAccessTemplateResponse(DirectoryAccessTemplateBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    # Дополнительная информация
    created_by_info: Optional[Dict[str, Any]] = None
    usage_count: Optional[int] = None  # Количество использований шаблона

    class Config:
        from_attributes = True

class DirectoryAccessTemplateList(BaseModel):
    templates: List[DirectoryAccessTemplateResponse]
    pagination: Dict[str, int]

# Схемы для применения шаблонов
class ApplyTemplateRequest(BaseModel):
    template_id: int
    user_ids: List[int]
    department_ids: Optional[List[int]] = None
    override_settings: Optional[Dict[str, Any]] = None

class ApplyTemplateResponse(BaseModel):
    success_count: int
    failed_count: int
    errors: List[str]
    created_accesses: List[DirectoryAccessResponse]

# Схемы для проверки доступа
class CheckAccessRequest(BaseModel):
    user_id: int
    department_id: Optional[int] = None
    scope: AccessScope
    required_access_type: AccessType = AccessType.READ

class CheckAccessResponse(BaseModel):
    has_access: bool
    access_type: Optional[AccessType] = None
    restrictions: Optional[Dict[str, Any]] = None
    source: Optional[str] = None  # Источник доступа (direct, inherited, template)
    department_info: Optional[Dict[str, Any]] = None

# Схемы для получения доступных подразделений
class UserDepartmentAccessRequest(BaseModel):
    user_id: int
    scope: Optional[AccessScope] = None
    include_inherited: bool = True

class UserDepartmentAccessResponse(BaseModel):
    departments: List[Dict[str, Any]]
    access_summary: Dict[str, Any]

# Схемы для статистики доступа
class AccessStatisticsResponse(BaseModel):
    total_accesses: int
    active_accesses: int
    expired_accesses: int
    by_access_type: Dict[str, int]
    by_scope: Dict[str, int]
    by_department: List[Dict[str, Any]]
    recent_changes: List[Dict[str, Any]]

# Схемы для аудита
class AccessAuditLogResponse(BaseModel):
    id: int
    user_id: int
    department_id: Optional[int]
    action: str  # created, updated, deleted, accessed
    details: Dict[str, Any]
    performed_by: int
    performed_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class AccessAuditLogList(BaseModel):
    logs: List[AccessAuditLogResponse]
    pagination: Dict[str, int]

# Схемы для конфигурации системы доступа
class AccessConfigurationResponse(BaseModel):
    default_access_type: AccessType
    default_scope: AccessScope
    default_inherit_children: bool
    max_access_duration_days: Optional[int]
    require_approval: bool
    approval_roles: List[str]
    audit_enabled: bool
    notification_enabled: bool 