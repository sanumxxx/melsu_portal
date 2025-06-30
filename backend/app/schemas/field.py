from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime

# Схемы для типов полей
class FieldTypeBase(BaseModel):
    name: str
    label: str
    description: Optional[str] = None
    input_type: str
    has_options: bool = False

class FieldTypeCreate(FieldTypeBase):
    pass

class FieldType(FieldTypeBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Схемы для полей
class FieldBase(BaseModel):
    name: str
    label: str
    description: Optional[str] = None
    placeholder: Optional[str] = None
    is_required: bool = False
    is_visible: bool = True
    sort_order: int = 0
    validation_rules: Optional[Dict[str, Any]] = None
    options: Optional[List[Dict[str, Any]]] = None
    default_value: Optional[str] = None
    conditional_field_id: Optional[int] = None
    conditional_value: Optional[str] = None
    conditional_operator: Optional[str] = "equals"
    profile_field_mapping: Optional[str] = None
    update_profile_on_submit: bool = False
    update_profile_on_approve: bool = False

class FieldCreate(FieldBase):
    field_type_id: int

class FieldUpdate(BaseModel):
    name: Optional[str] = None
    label: Optional[str] = None
    description: Optional[str] = None
    placeholder: Optional[str] = None
    is_required: Optional[bool] = None
    is_visible: Optional[bool] = None
    sort_order: Optional[int] = None
    validation_rules: Optional[Dict[str, Any]] = None
    options: Optional[List[Dict[str, Any]]] = None
    default_value: Optional[str] = None
    field_type_id: Optional[int] = None
    conditional_field_id: Optional[int] = None
    conditional_value: Optional[str] = None
    conditional_operator: Optional[str] = None
    profile_field_mapping: Optional[str] = None
    update_profile_on_submit: Optional[bool] = None
    update_profile_on_approve: Optional[bool] = None

class Field(FieldBase):
    id: int
    template_id: int
    field_type_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    field_type: FieldType
    conditional_field: Optional['Field'] = None

    class Config:
        from_attributes = True 