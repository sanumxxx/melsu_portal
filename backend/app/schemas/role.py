from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class RoleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="Системное имя роли")
    display_name: str = Field(..., min_length=1, max_length=100, description="Отображаемое имя роли")
    description: Optional[str] = Field(None, description="Описание роли")
    is_active: bool = Field(True, description="Активна ли роль")

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None

class Role(RoleBase):
    id: int
    is_system: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    user_id: int
    role_names: List[str] = Field(..., description="Список имен ролей для назначения пользователю") 