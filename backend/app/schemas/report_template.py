from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class ReportTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    fields: List[Dict[str, Any]]
    allowed_roles: Optional[List[str]] = None
    viewers: Optional[List[Dict[str, Any]]] = None  # [{"type": "role", "value": "admin"}, {"type": "user", "value": 123}]
    is_active: bool = True

class ReportTemplateCreate(ReportTemplateBase):
    pass

class ReportTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    fields: Optional[List[Dict[str, Any]]] = None
    allowed_roles: Optional[List[str]] = None
    viewers: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = None

class ReportTemplateResponse(ReportTemplateBase):
    id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    creator_name: Optional[str] = None
    reports_count: Optional[int] = 0

    class Config:
        from_attributes = True

class ReportTemplateList(BaseModel):
    id: int
    name: str
    description: Optional[str]
    fields: List[Dict[str, Any]]
    is_active: bool
    allowed_roles: Optional[List[str]]
    created_by_id: int
    created_at: datetime
    creator_name: Optional[str]
    reports_count: int

    class Config:
        from_attributes = True 