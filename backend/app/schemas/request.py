from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime
from ..models.request import RequestStatus
from .request_file import RequestFileResponse

# Схемы для пользователей (упрощенные)
class UserBase(BaseModel):
    id: int
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    class Config:
        from_attributes = True

# Схемы для комментариев
class RequestCommentBase(BaseModel):
    text: str
    is_internal: bool = False

class RequestCommentCreate(RequestCommentBase):
    pass

class RequestComment(RequestCommentBase):
    id: int
    request_id: int
    user_id: int
    created_at: datetime
    user: UserBase

    class Config:
        from_attributes = True

# Схемы для заявок
class RequestBase(BaseModel):
    title: str
    description: Optional[str] = None
    form_data: Dict[str, Any]

class RequestCreate(RequestBase):
    template_id: int

class RequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[RequestStatus] = None
    assignee_id: Optional[int] = None
    possible_assignees: Optional[List[int]] = None
    form_data: Optional[Dict[str, Any]] = None

class RequestAssign(BaseModel):
    assignee_id: int

class Request(RequestBase):
    id: int
    template_id: int
    author_id: int
    assignee_id: Optional[int] = None
    possible_assignees: Optional[List[int]] = None
    status: RequestStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    
    # Связанные объекты
    author: UserBase
    assignee: Optional[UserBase] = None
    comments: List[RequestComment] = []
    files: List[RequestFileResponse] = []

    class Config:
        from_attributes = True

class RequestList(BaseModel):
    id: int
    title: str
    template_id: int
    template_name: str
    author_id: int
    assignee_id: Optional[int] = None
    possible_assignees: Optional[List[int]] = None
    status: RequestStatus
    created_at: datetime
    deadline: Optional[datetime] = None
    
    # Связанные объекты (упрощенные для списка)
    author: UserBase
    assignee: Optional[UserBase] = None

    class Config:
        from_attributes = True 