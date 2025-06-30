from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RequestFileBase(BaseModel):
    filename: str
    field_name: str
    file_size: int
    content_type: str

class RequestFileCreate(BaseModel):
    filename: str
    field_name: str
    file_size: int
    content_type: str

class RequestFile(RequestFileBase):
    id: int
    request_id: int
    file_path: str
    uploaded_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class RequestFileResponse(BaseModel):
    id: int
    filename: str
    field_name: str
    file_size: int
    content_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True 