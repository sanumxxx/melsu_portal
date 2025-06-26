from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import datetime
import os
import uuid
import shutil
from ..database import get_db
from ..models.user import User
from ..models.portfolio import PortfolioAchievement, PortfolioFile, AchievementCategory
from ..schemas.portfolio import (
    PortfolioAchievement as PortfolioAchievementSchema,
    PortfolioAchievementCreate,
    PortfolioAchievementUpdate,
    PortfolioStats,
    FileUploadResponse,
    AchievementCategory as AchievementCategorySchema
)
from ..services.auth_service import verify_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter()
security = HTTPBearer()

# Путь для сохранения файлов портфолио
PORTFOLIO_UPLOAD_DIR = "uploads/portfolio"
os.makedirs(PORTFOLIO_UPLOAD_DIR, exist_ok=True)

# Разрешенные типы файлов
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.txt', '.ppt', '.pptx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    """Получение текущего пользователя"""
    token = credentials.credentials
    email = verify_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

def check_student_access(user: User):
    """Проверка доступа студента к портфолио"""
    if 'student' not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ к портфолио разрешен только студентам"
        )

@router.get("/achievements", response_model=List[PortfolioAchievementSchema])
async def get_achievements(
    category: Optional[AchievementCategorySchema] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение списка достижений пользователя"""
    check_student_access(current_user)
    
    query = db.query(PortfolioAchievement).options(
        joinedload(PortfolioAchievement.files)
    ).filter(PortfolioAchievement.user_id == current_user.id)
    
    if category:
        query = query.filter(PortfolioAchievement.category == category)
    
    achievements = query.order_by(PortfolioAchievement.achievement_date.desc()).all()
    return achievements

@router.post("/achievements", response_model=PortfolioAchievementSchema)
async def create_achievement(
    achievement: PortfolioAchievementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создание нового достижения"""
    check_student_access(current_user)
    
    db_achievement = PortfolioAchievement(
        user_id=current_user.id,
        **achievement.dict()
    )
    
    db.add(db_achievement)
    db.commit()
    db.refresh(db_achievement)
    
    return db_achievement

@router.get("/achievements/{achievement_id}", response_model=PortfolioAchievementSchema)
async def get_achievement(
    achievement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение конкретного достижения"""
    check_student_access(current_user)
    
    achievement = db.query(PortfolioAchievement).options(
        joinedload(PortfolioAchievement.files)
    ).filter(
        PortfolioAchievement.id == achievement_id,
        PortfolioAchievement.user_id == current_user.id
    ).first()
    
    if not achievement:
        raise HTTPException(status_code=404, detail="Достижение не найдено")
    
    return achievement

@router.put("/achievements/{achievement_id}", response_model=PortfolioAchievementSchema)
async def update_achievement(
    achievement_id: int,
    achievement_update: PortfolioAchievementUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновление достижения"""
    check_student_access(current_user)
    
    db_achievement = db.query(PortfolioAchievement).filter(
        PortfolioAchievement.id == achievement_id,
        PortfolioAchievement.user_id == current_user.id
    ).first()
    
    if not db_achievement:
        raise HTTPException(status_code=404, detail="Достижение не найдено")
    
    # Обновляем поля
    update_data = achievement_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_achievement, field, value)
    
    db.commit()
    db.refresh(db_achievement)
    
    return db_achievement

@router.delete("/achievements/{achievement_id}")
async def delete_achievement(
    achievement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удаление достижения"""
    check_student_access(current_user)
    
    db_achievement = db.query(PortfolioAchievement).filter(
        PortfolioAchievement.id == achievement_id,
        PortfolioAchievement.user_id == current_user.id
    ).first()
    
    if not db_achievement:
        raise HTTPException(status_code=404, detail="Достижение не найдено")
    
    # Удаляем связанные файлы с диска
    for file in db_achievement.files:
        file_path = file.file_path
        if os.path.exists(file_path):
            os.remove(file_path)
    
    db.delete(db_achievement)
    db.commit()
    
    return {"message": "Достижение успешно удалено"}

@router.post("/achievements/{achievement_id}/files", response_model=FileUploadResponse)
async def upload_file(
    achievement_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Загрузка файла к достижению"""
    check_student_access(current_user)
    
    # Проверяем что достижение принадлежит пользователю
    achievement = db.query(PortfolioAchievement).filter(
        PortfolioAchievement.id == achievement_id,
        PortfolioAchievement.user_id == current_user.id
    ).first()
    
    if not achievement:
        raise HTTPException(status_code=404, detail="Достижение не найдено")
    
    # Проверяем размер файла
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Файл слишком большой (макс. 10MB)")
    
    # Проверяем расширение файла
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Недопустимый тип файла")
    
    # Генерируем уникальное имя файла
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(PORTFOLIO_UPLOAD_DIR, unique_filename)
    
    # Сохраняем файл
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при сохранении файла: {str(e)}")
    
    # Создаем запись в БД
    db_file = PortfolioFile(
        achievement_id=achievement_id,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=file_path,
        file_size=file.size,
        content_type=file.content_type
    )
    
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    
    return FileUploadResponse(
        filename=unique_filename,
        file_path=file_path,
        file_size=file.size,
        content_type=file.content_type
    )

@router.delete("/files/{file_id}")
async def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удаление файла из достижения"""
    check_student_access(current_user)
    
    # Находим файл и проверяем права доступа
    file_record = db.query(PortfolioFile).join(PortfolioAchievement).filter(
        PortfolioFile.id == file_id,
        PortfolioAchievement.user_id == current_user.id
    ).first()
    
    if not file_record:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    # Удаляем файл с диска
    if os.path.exists(file_record.file_path):
        os.remove(file_record.file_path)
    
    # Удаляем запись из БД
    db.delete(file_record)
    db.commit()
    
    return {"message": "Файл успешно удален"}

@router.get("/stats", response_model=PortfolioStats)
async def get_portfolio_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение статистики портфолио пользователя"""
    check_student_access(current_user)
    
    # Общее количество достижений
    total_achievements = db.query(PortfolioAchievement).filter(
        PortfolioAchievement.user_id == current_user.id
    ).count()
    
    # Статистика по категориям
    achievements_by_category = {}
    for category in AchievementCategory:
        count = db.query(PortfolioAchievement).filter(
            PortfolioAchievement.user_id == current_user.id,
            PortfolioAchievement.category == category
        ).count()
        achievements_by_category[category.value] = count
    
    # Последние достижения
    recent_achievements = db.query(PortfolioAchievement).options(
        joinedload(PortfolioAchievement.files)
    ).filter(
        PortfolioAchievement.user_id == current_user.id
    ).order_by(PortfolioAchievement.created_at.desc()).limit(5).all()
    
    return PortfolioStats(
        total_achievements=total_achievements,
        achievements_by_category=achievements_by_category,
        recent_achievements=recent_achievements
    ) 