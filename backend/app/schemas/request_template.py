from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..models.request_template import RoutingType

# Схема для правил маршрутизации
class RoutingRule(BaseModel):
    field: str                    # Поле формы (например, "faculty")
    value: str                    # Значение поля (например, "technical")
    assignees: List[int]          # Список ID ответственных

class RequestTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    deadline_days: int = 7
    is_active: bool = True
    routing_type: str = RoutingType.MANUAL.value
    default_assignees: Optional[List[int]] = None
    auto_assign_enabled: bool = False
    department_routing: bool = False
    routing_rules: Optional[List[RoutingRule]] = None

class RequestTemplateCreate(RequestTemplateBase):
    pass

class RequestTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    deadline_days: Optional[int] = None
    is_active: Optional[bool] = None
    routing_type: Optional[str] = None
    default_assignees: Optional[List[int]] = None
    auto_assign_enabled: Optional[bool] = None
    department_routing: Optional[bool] = None
    routing_rules: Optional[List[RoutingRule]] = None

class RequestTemplate(RequestTemplateBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True 