from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum

class ActionType(str, Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    VIEW = "view"
    DOWNLOAD = "download"
    UPLOAD = "upload"
    APPROVE = "approve"
    REJECT = "reject"
    SUBMIT = "submit"
    ASSIGN = "assign"
    UNASSIGN = "unassign"
    GRANT_ACCESS = "grant_access"
    REVOKE_ACCESS = "revoke_access"
    PASSWORD_CHANGE = "password_change"
    EMAIL_VERIFY = "email_verify"
    REPORT_GENERATE = "report_generate"
    ANNOUNCEMENT_PUBLISH = "announcement_publish"
    REQUEST_SUBMIT = "request_submit"
    REQUEST_APPROVE = "request_approve"
    REQUEST_REJECT = "request_reject"
    PORTFOLIO_ADD = "portfolio_add"
    PORTFOLIO_UPDATE = "portfolio_update"
    GROUP_CREATE = "group_create"
    GROUP_UPDATE = "group_update"
    GROUP_DELETE = "group_delete"
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    ROLE_ASSIGN = "role_assign"
    ROLE_REVOKE = "role_revoke"
    DEPARTMENT_CREATE = "department_create"
    DEPARTMENT_UPDATE = "department_update"
    DEPARTMENT_DELETE = "department_delete"

class ActivityLogBase(BaseModel):
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    description: str
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class ActivityLogCreate(ActivityLogBase):
    user_id: Optional[int] = None

class ActivityLogInDB(ActivityLogBase):
    id: int
    user_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class ActivityLogResponse(ActivityLogInDB):
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None

class ActivityLogFilter(BaseModel):
    user_id: Optional[int] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    page: int = Field(1, ge=1)
    size: int = Field(50, ge=1, le=1000)

class ActivityLogListResponse(BaseModel):
    items: List[ActivityLogResponse]
    total: int
    page: int
    size: int
    pages: int 