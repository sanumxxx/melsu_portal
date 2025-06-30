from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, and_, or_
from typing import List, Optional
import os
import uuid
from datetime import datetime

from ..database import get_db
from ..models.announcement import Announcement, AnnouncementView
from ..models.user import User
from ..models.role import Role
from ..schemas.announcement import (
    AnnouncementCreate, 
    AnnouncementUpdate, 
    AnnouncementResponse,
    AnnouncementListResponse,
    AnnouncementViewCreate,
    CurrentAnnouncementResponse
)
from ..dependencies import get_current_user, UserInfo
from ..services.activity_service import ActivityService

router = APIRouter(prefix="/announcements", tags=["Announcements"])

def check_admin_role(current_user: UserInfo):
    """Проверка админских прав"""
    if "admin" not in (current_user.roles if hasattr(current_user, 'roles') else []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен: требуются права администратора"
        )

def get_role_display_names(db: Session) -> dict:
    """Получение словаря названий ролей для отображения"""
    roles = db.query(Role).filter(Role.is_active == True).all()
    return {role.name: role.display_name or role.name for role in roles}

@router.post("/", response_model=AnnouncementResponse)
async def create_announcement(
    announcement_data: AnnouncementCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Создание объявления (только для админов)"""
    check_admin_role(current_user)
    
    announcement = Announcement(
        title=announcement_data.title,
        description=announcement_data.description,
        image_url=announcement_data.image_url,
        target_roles=announcement_data.target_roles,
        is_active=announcement_data.is_active,
        created_by_id=current_user.id
    )
    
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    
    # Логирование создания объявления
    activity_service = ActivityService(db)
    activity_service.log_activity(
        action="announcement_publish",
        description=f"Создано объявление: {announcement.title}",
        user_id=current_user.id,
        resource_type="announcement",
        resource_id=str(announcement.id),
        details={
            "title": announcement.title,
            "target_roles": announcement.target_roles,
            "is_active": announcement.is_active
        },
        request=request
    )
    
    # Добавляем имя создателя
    creator = db.query(User).filter(User.id == current_user.id).first()
    response = AnnouncementResponse.from_orm(announcement)
    response.created_by_name = f"{creator.first_name} {creator.last_name}" if creator else None
    
    return response

@router.get("/", response_model=List[AnnouncementListResponse])
async def get_announcements(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение списка объявлений (только для админов)"""
    check_admin_role(current_user)
    
    query = db.query(Announcement).options(
        joinedload(Announcement.created_by)
    ).order_by(desc(Announcement.created_at))
    
    if is_active is not None:
        query = query.filter(Announcement.is_active == is_active)
    
    announcements = query.offset(skip).limit(limit).all()
    
    # Получаем словарь названий ролей
    role_names = get_role_display_names(db)
    
    result = []
    for announcement in announcements:
        # Подсчитываем количество просмотров
        views_count = db.query(AnnouncementView).filter(
            AnnouncementView.announcement_id == announcement.id
        ).count()
        
        announcement_data = AnnouncementListResponse.from_orm(announcement)
        announcement_data.created_by_name = f"{announcement.created_by.first_name} {announcement.created_by.last_name}" if announcement.created_by else None
        announcement_data.views_count = views_count
        
        # Преобразуем роли в читаемые названия
        if announcement_data.target_roles:
            announcement_data.target_roles = [
                role_names.get(role, role) for role in announcement_data.target_roles
            ]
        
        result.append(announcement_data)
    
    return result

@router.get("/current", response_model=CurrentAnnouncementResponse)
async def get_current_announcement(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение текущего объявления для пользователя"""
    
    # Получаем последнее активное объявление, которое подходит пользователю по ролям
    query = db.query(Announcement).filter(
        Announcement.is_active == True
    ).order_by(desc(Announcement.created_at))
    
    # Фильтруем по ролям пользователя
    user_roles = current_user.roles if hasattr(current_user, 'roles') else []
    
    announcements = query.all()
    suitable_announcement = None
    
    for announcement in announcements:
        # Если target_roles не указаны (null), показываем всем
        if not announcement.target_roles:
            suitable_announcement = announcement
            break
        
        # Проверяем пересечение ролей пользователя с целевыми ролями
        if any(role in announcement.target_roles for role in user_roles):
            suitable_announcement = announcement
            break
    
    if not suitable_announcement:
        return CurrentAnnouncementResponse(
            announcement=None,
            has_unviewed=False
        )
    
    # Проверяем, просматривал ли пользователь это объявление
    existing_view = db.query(AnnouncementView).filter(
        AnnouncementView.announcement_id == suitable_announcement.id,
        AnnouncementView.user_id == current_user.id
    ).first()
    
    has_unviewed = existing_view is None
    
    if has_unviewed:
        # Загружаем создателя для отображения
        creator = db.query(User).filter(User.id == suitable_announcement.created_by_id).first()
        
        # Получаем словарь названий ролей
        role_names = get_role_display_names(db)
        
        response_announcement = AnnouncementResponse.from_orm(suitable_announcement)
        response_announcement.created_by_name = f"{creator.first_name} {creator.last_name}" if creator else None
        response_announcement.is_viewed = False
        
        # Преобразуем роли в читаемые названия
        if response_announcement.target_roles:
            response_announcement.target_roles = [
                role_names.get(role, role) for role in response_announcement.target_roles
            ]
        
        return CurrentAnnouncementResponse(
            announcement=response_announcement,
            has_unviewed=True
        )
    
    return CurrentAnnouncementResponse(
        announcement=None,
        has_unviewed=False
    )

@router.post("/mark-viewed")
async def mark_announcement_viewed(
    view_data: AnnouncementViewCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Отметить объявление как просмотренное"""
    
    # Проверяем, существует ли объявление
    announcement = db.query(Announcement).filter(
        Announcement.id == view_data.announcement_id
    ).first()
    
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Объявление не найдено"
        )
    
    # Проверяем, не отмечено ли уже как просмотренное
    existing_view = db.query(AnnouncementView).filter(
        AnnouncementView.announcement_id == view_data.announcement_id,
        AnnouncementView.user_id == current_user.id
    ).first()
    
    if existing_view:
        return {"message": "Объявление уже отмечено как просмотренное"}
    
    # Создаем запись о просмотре
    view = AnnouncementView(
        announcement_id=view_data.announcement_id,
        user_id=current_user.id
    )
    
    db.add(view)
    db.commit()
    
    return {"message": "Объявление отмечено как просмотренное"}

@router.get("/available-roles")
async def get_available_roles(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение доступных ролей для таргетинга объявлений (только для админов)"""
    check_admin_role(current_user)
    
    roles = db.query(Role).filter(Role.is_active == True).order_by(Role.name).all()
    
    return [
        {
            "value": role.name,
            "label": role.display_name or role.name,
            "description": role.description
        }
        for role in roles
    ]

@router.get("/{announcement_id}", response_model=AnnouncementResponse)
async def get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение объявления по ID (только для админов)"""
    check_admin_role(current_user)
    
    announcement = db.query(Announcement).options(
        joinedload(Announcement.created_by)
    ).filter(Announcement.id == announcement_id).first()
    
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Объявление не найдено"
        )
    
    response = AnnouncementResponse.from_orm(announcement)
    response.created_by_name = f"{announcement.created_by.first_name} {announcement.created_by.last_name}" if announcement.created_by else None
    
    return response

@router.put("/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement(
    announcement_id: int,
    announcement_data: AnnouncementUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Обновление объявления (только для админов)"""
    check_admin_role(current_user)
    
    announcement = db.query(Announcement).filter(
        Announcement.id == announcement_id
    ).first()
    
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Объявление не найдено"
        )
    
    # Обновляем поля
    update_data = announcement_data.dict(exclude_unset=True)
    old_title = announcement.title
    
    for field, value in update_data.items():
        setattr(announcement, field, value)
    
    announcement.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(announcement)
    
    # Логирование обновления объявления
    activity_service = ActivityService(db)
    activity_service.log_activity(
        action="announcement_update",
        description=f"Обновлено объявление: {announcement.title}",
        user_id=current_user.id,
        resource_type="announcement",
        resource_id=str(announcement.id),
        details={
            "old_title": old_title,
            "new_title": announcement.title,
            "updated_fields": list(update_data.keys()),
            "is_active": announcement.is_active
        },
        request=request
    )
    
    # Добавляем имя создателя
    creator = db.query(User).filter(User.id == announcement.created_by_id).first()
    response = AnnouncementResponse.from_orm(announcement)
    response.created_by_name = f"{creator.first_name} {creator.last_name}" if creator else None
    
    return response

@router.delete("/{announcement_id}")
async def delete_announcement(
    announcement_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Удаление объявления (только для админов)"""
    check_admin_role(current_user)
    
    announcement = db.query(Announcement).filter(
        Announcement.id == announcement_id
    ).first()
    
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Объявление не найдено"
        )
    
    # Сохраняем данные для логирования перед удалением
    title = announcement.title
    
    db.delete(announcement)
    db.commit()
    
    # Логирование удаления объявления
    activity_service = ActivityService(db)
    activity_service.log_activity(
        action="announcement_delete",
        description=f"Удалено объявление: {title}",
        user_id=current_user.id,
        resource_type="announcement",
        resource_id=str(announcement_id),
        details={
            "title": title
        },
        request=request
    )
    
    return {"message": "Объявление удалено"}

@router.post("/upload-image")
async def upload_announcement_image(
    file: UploadFile = File(...),
    current_user: UserInfo = Depends(get_current_user)
):
    """Загрузка изображения для объявления (только для админов)"""
    check_admin_role(current_user)
    
    # Проверяем тип файла
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Файл должен быть изображением"
        )
    
    # Проверяем размер файла (максимум 5MB)
    max_size = 5 * 1024 * 1024  # 5MB
    if file.size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Размер файла не должен превышать 5MB"
        )
    
    # Создаем директорию если её нет
    upload_dir = "uploads/announcements"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Генерируем уникальное имя файла
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    # Сохраняем файл
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка сохранения файла: {str(e)}"
        )
    
    # Возвращаем URL файла
    file_url = f"/uploads/announcements/{filename}"
    
    return {
        "message": "Изображение загружено успешно",
        "file_url": file_url,
        "filename": filename
    } 