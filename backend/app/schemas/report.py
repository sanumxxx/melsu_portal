from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class ReportBase(BaseModel):
    template_id: int
    data: Dict[str, Any]
    notes: Optional[str] = None
    status: Optional[str] = "submitted"

class ReportCreate(ReportBase):
    pass

class ReportUpdate(BaseModel):
    data: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class ReportResponse(ReportBase):
    id: int
    submitted_by_id: int
    submitted_at: datetime
    
    # Информация о пользователе
    submitter_name: Optional[str] = None
    submitter_email: Optional[str] = None
    submitter_department: Optional[str] = None
    submitter_position: Optional[str] = None
    
    # Информация о шаблоне
    template_name: Optional[str] = None

    class Config:
        from_attributes = True

class ReportList(BaseModel):
    id: int
    template_id: int
    template_name: str
    submitted_by_id: int
    submitted_at: datetime
    submitter_name: str
    submitter_email: str
    submitter_department: Optional[str]
    submitter_position: Optional[str]
    has_notes: bool
    status: str
    data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True 