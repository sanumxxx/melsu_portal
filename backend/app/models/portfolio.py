from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum

class AchievementCategory(enum.Enum):
    ACADEMIC = "academic"
    SPORTS = "sports"
    CREATIVE = "creative"
    VOLUNTEER = "volunteer"
    PROFESSIONAL = "professional"

class PortfolioAchievement(Base):
    __tablename__ = "portfolio_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(AchievementCategory), nullable=False)
    achievement_date = Column(DateTime(timezone=True), nullable=False)
    organization = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Связи
    user = relationship("User", back_populates="portfolio_achievements")
    files = relationship("PortfolioFile", back_populates="achievement", cascade="all, delete-orphan")

class PortfolioFile(Base):
    __tablename__ = "portfolio_files"

    id = Column(Integer, primary_key=True, index=True)
    achievement_id = Column(Integer, ForeignKey("portfolio_achievements.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Связи
    achievement = relationship("PortfolioAchievement", back_populates="files") 