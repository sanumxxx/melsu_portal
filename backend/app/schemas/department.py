from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    short_name: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    department_type: str = Field(..., pattern="^(university|rectorate|institute|faculty|department|chair|management|directorate|lab|center|service|sector|group)$")
    head_name: Optional[str] = Field(None, max_length=200)
    head_title: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=100)
    website: Optional[str] = Field(None, max_length=200)
    address: Optional[str] = None
    room_number: Optional[str] = Field(None, max_length=20)
    is_active: bool = True
    established_date: Optional[datetime] = None

class DepartmentCreate(DepartmentBase):
    parent_id: Optional[int] = None
    sort_order: int = 0

class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    short_name: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    department_type: Optional[str] = Field(None, pattern="^(university|rectorate|institute|faculty|department|chair|management|directorate|lab|center|service|sector|group)$")
    head_name: Optional[str] = Field(None, max_length=200)
    head_title: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=100)
    website: Optional[str] = Field(None, max_length=200)
    address: Optional[str] = None
    room_number: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    established_date: Optional[datetime] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None

class DepartmentResponse(DepartmentBase):
    id: int
    parent_id: Optional[int]
    level: int
    sort_order: int
    created_at: datetime
    updated_at: datetime
    children_count: int = 0

    class Config:
        from_attributes = True

class DepartmentTree(DepartmentResponse):
    children: List['DepartmentTree'] = []

    class Config:
        from_attributes = True

# Для корректной работы self-referencing модели
DepartmentTree.model_rebuild() 