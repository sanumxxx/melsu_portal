from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class AnnouncementBase(BaseModel):
    title: str = Field(..., max_length=255, description="Заголовок объявления")
    description: Optional[str] = Field(None, description="Описание объявления")
    image_url: Optional[str] = Field(None, max_length=500, description="URL изображения")
    target_roles: Optional[List[str]] = Field(None, description="Роли для которых показывать (null = все)")

class AnnouncementCreate(AnnouncementBase):
    is_active: bool = Field(True, description="Активно ли объявление")

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255, description="Заголовок объявления")
    description: Optional[str] = Field(None, description="Описание объявления")
    image_url: Optional[str] = Field(None, max_length=500, description="URL изображения")
    target_roles: Optional[List[str]] = Field(None, description="Роли для которых показывать")
    is_active: Optional[bool] = Field(None, description="Активно ли объявление")

class AnnouncementResponse(AnnouncementBase):
    id: int
    is_active: bool
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    
    # Дополнительные поля
    created_by_name: Optional[str] = None
    is_viewed: Optional[bool] = None
    
    class Config:
        from_attributes = True

class AnnouncementListResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    target_roles: Optional[List[str]] = None
    is_active: bool
    created_by_id: int
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    views_count: int = 0
    
    class Config:
        from_attributes = True

class AnnouncementViewCreate(BaseModel):
    announcement_id: int

class AnnouncementViewResponse(BaseModel):
    id: int
    announcement_id: int
    user_id: int
    viewed_at: datetime
    
    class Config:
        from_attributes = True

class CurrentAnnouncementResponse(BaseModel):
    """Текущее объявление для показа пользователю"""
    announcement: Optional[AnnouncementResponse] = None
    has_unviewed: bool = False 