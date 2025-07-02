from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class AnnouncementBase(BaseModel):
    title: str = Field(..., max_length=255, description="Заголовок объявления")
    description: Optional[str] = Field(None, description="Описание объявления")
    image_url: Optional[str] = Field(None, max_length=500, description="URL изображения (устарело)")
    target_roles: Optional[List[str]] = Field(None, description="Роли для которых показывать (null = все)")
    
    # Медиафайлы
    has_media: bool = Field(False, description="Есть ли медиафайл")
    media_type: Optional[str] = Field(None, description="Тип медиа: image, gif, video")
    media_url: Optional[str] = Field(None, description="URL медиафайла")
    media_filename: Optional[str] = Field(None, description="Оригинальное имя файла")
    media_size: Optional[int] = Field(None, description="Размер файла в байтах")
    media_duration: Optional[int] = Field(None, description="Длительность видео в секундах")
    media_thumbnail_url: Optional[str] = Field(None, description="URL превью для видео")
    media_width: Optional[int] = Field(None, description="Ширина медиа")
    media_height: Optional[int] = Field(None, description="Высота медиа")
    media_autoplay: bool = Field(True, description="Автопроигрывание")
    media_loop: bool = Field(True, description="Зацикливание")
    media_muted: bool = Field(True, description="Без звука по умолчанию")

class AnnouncementCreate(AnnouncementBase):
    is_active: bool = Field(True, description="Активно ли объявление")

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255, description="Заголовок объявления")
    description: Optional[str] = Field(None, description="Описание объявления")
    image_url: Optional[str] = Field(None, max_length=500, description="URL изображения")
    target_roles: Optional[List[str]] = Field(None, description="Роли для которых показывать")
    is_active: Optional[bool] = Field(None, description="Активно ли объявление")
    
    # Медиафайлы
    has_media: Optional[bool] = Field(None, description="Есть ли медиафайл")
    media_type: Optional[str] = Field(None, description="Тип медиа: image, gif, video")
    media_url: Optional[str] = Field(None, description="URL медиафайла")
    media_filename: Optional[str] = Field(None, description="Оригинальное имя файла")
    media_size: Optional[int] = Field(None, description="Размер файла в байтах")
    media_duration: Optional[int] = Field(None, description="Длительность видео в секундах")
    media_thumbnail_url: Optional[str] = Field(None, description="URL превью для видео")
    media_width: Optional[int] = Field(None, description="Ширина медиа")
    media_height: Optional[int] = Field(None, description="Высота медиа")
    media_autoplay: Optional[bool] = Field(None, description="Автопроигрывание")
    media_loop: Optional[bool] = Field(None, description="Зацикливание")
    media_muted: Optional[bool] = Field(None, description="Без звука по умолчанию")

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
    
    # Медиафайлы
    has_media: bool = False
    media_type: Optional[str] = None
    media_url: Optional[str] = None
    media_thumbnail_url: Optional[str] = None
    
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