from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Announcement(Base):
    __tablename__ = "announcements"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, comment="Заголовок объявления")
    description = Column(Text, nullable=True, comment="Описание объявления")
    image_url = Column(String(500), nullable=True, comment="URL изображения")
    
    # Настройки видимости
    is_active = Column(Boolean, default=True, nullable=False, comment="Активно ли объявление")
    target_roles = Column(JSON, nullable=True, comment="Роли для которых показывать (null = все)")
    
    # Метаданные
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Связи
    created_by = relationship("User", back_populates="created_announcements")
    views = relationship("AnnouncementView", back_populates="announcement", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Announcement(id={self.id}, title='{self.title}', active={self.is_active})>"

class AnnouncementView(Base):
    __tablename__ = "announcement_views"
    
    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    viewed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Связи
    announcement = relationship("Announcement", back_populates="views")
    user = relationship("User", back_populates="announcement_views")
    
    def __repr__(self):
        return f"<AnnouncementView(announcement_id={self.announcement_id}, user_id={self.user_id})>" 