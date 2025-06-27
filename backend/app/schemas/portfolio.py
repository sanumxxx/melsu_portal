from pydantic import BaseModel, field_serializer
from typing import Optional, List
from datetime import datetime
from enum import Enum

class AchievementCategory(str, Enum):
    academic = "academic"
    sports = "sports"
    creative = "creative"
    volunteer = "volunteer"
    professional = "professional"

class PortfolioFileBase(BaseModel):
    filename: str
    original_filename: str
    file_size: int
    content_type: str

class PortfolioFileCreate(PortfolioFileBase):
    file_path: str

class PortfolioFile(PortfolioFileBase):
    id: int
    achievement_id: int
    file_path: str
    created_at: datetime

    @field_serializer('created_at')
    def serialize_created_at(self, value):
        """Преобразует datetime в ISO строку"""
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    class Config:
        from_attributes = True

class PortfolioAchievementBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: AchievementCategory
    achievement_date: datetime
    organization: Optional[str] = None

class PortfolioAchievementCreate(PortfolioAchievementBase):
    pass

class PortfolioAchievementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[AchievementCategory] = None
    achievement_date: Optional[datetime] = None
    organization: Optional[str] = None

class PortfolioAchievement(PortfolioAchievementBase):
    id: int
    user_id: int
    files: List[PortfolioFile] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_serializer('achievement_date', 'created_at', 'updated_at')
    def serialize_datetime(self, value):
        """Преобразует datetime в ISO строку"""
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    class Config:
        from_attributes = True

class PortfolioStats(BaseModel):
    total_achievements: int
    achievements_by_category: dict
    recent_achievements: List[PortfolioAchievement] = []

class FileUploadResponse(BaseModel):
    filename: str
    file_path: str
    file_size: int
    content_type: str 