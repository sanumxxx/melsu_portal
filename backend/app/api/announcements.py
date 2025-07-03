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
        created_by_id=current_user.id,
        # Медиафайлы
        has_media=announcement_data.has_media,
        media_type=announcement_data.media_type,
        media_url=announcement_data.media_url,
        media_filename=announcement_data.media_filename,
        media_size=announcement_data.media_size,
        media_duration=announcement_data.media_duration,
        media_thumbnail_url=announcement_data.media_thumbnail_url,
        media_width=announcement_data.media_width,
        media_height=announcement_data.media_height,
        media_autoplay=announcement_data.media_autoplay,
        media_loop=announcement_data.media_loop,
        media_muted=announcement_data.media_muted
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

@router.post("/upload-media")
async def upload_announcement_media(
    file: UploadFile = File(...),
    current_user: UserInfo = Depends(get_current_user)
):
    """Загрузка медиафайла для объявления: изображения, GIF, видео (только для админов)"""
    check_admin_role(current_user)
    
    # Определяем допустимые типы файлов и их размеры
    allowed_types = {
        # Изображения
        'image/jpeg': {'max_size': 10 * 1024 * 1024, 'type': 'image'},  # 10MB
        'image/png': {'max_size': 10 * 1024 * 1024, 'type': 'image'},   # 10MB
        'image/gif': {'max_size': 50 * 1024 * 1024, 'type': 'gif'},     # 50MB для GIF
        'image/webp': {'max_size': 10 * 1024 * 1024, 'type': 'image'},  # 10MB
        # Видео
        'video/mp4': {'max_size': 200 * 1024 * 1024, 'type': 'video'},  # 200MB
        'video/webm': {'max_size': 200 * 1024 * 1024, 'type': 'video'}, # 200MB
        'video/mov': {'max_size': 200 * 1024 * 1024, 'type': 'video'},  # 200MB
        'video/quicktime': {'max_size': 200 * 1024 * 1024, 'type': 'video'},  # 200MB for .mov files
    }
    
    print(f"📁 Upload request - Content type: {file.content_type}, Filename: {file.filename}")
    
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Неподдерживаемый тип файла: {file.content_type}. Разрешены: JPEG, PNG, GIF, WebP, MP4, WebM, MOV"
        )
    
    file_config = allowed_types[file.content_type]
    
    # Читаем содержимое файла для проверки размера
    try:
        content = await file.read()
        actual_size = len(content)
        print(f"📊 File size: {actual_size} bytes ({actual_size / 1024 / 1024:.2f} MB)")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ошибка чтения файла: {str(e)}"
        )
    
    # Проверяем размер файла
    if actual_size > file_config['max_size']:
        max_size_mb = file_config['max_size'] / 1024 / 1024
        actual_size_mb = actual_size / 1024 / 1024
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Размер файла {actual_size_mb:.1f}MB превышает лимит {max_size_mb:.0f}MB для типа {file_config['type']}"
        )
    
    # Создаем директорию если её нет
    # Определяем абсолютный путь к папке uploads относительно структуры проекта
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(current_dir))
    upload_dir = os.path.join(backend_dir, "uploads", "announcements")
    upload_dir = os.path.abspath(upload_dir)
    
    os.makedirs(upload_dir, exist_ok=True)
    print(f"📂 Upload directory: {upload_dir}")
    
    # Генерируем уникальное имя файла
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    print(f"💾 Saving file to: {os.path.abspath(file_path)}")
    
    # Сохраняем файл
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Проверяем, что файл сохранился
        if not os.path.exists(file_path):
            raise Exception("Файл не был сохранен")
        
        saved_size = os.path.getsize(file_path)
        print(f"✅ File saved successfully. Size on disk: {saved_size} bytes")
        
        if saved_size != actual_size:
            print(f"⚠️ Warning: Size mismatch - uploaded: {actual_size}, saved: {saved_size}")
            
    except Exception as e:
        print(f"❌ Error saving file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка сохранения файла: {str(e)}"
        )
    
    # Возвращаем URL файла и метаданные
    file_url = f"/uploads/announcements/{filename}"
    print(f"🔗 Generated file URL: {file_url}")
    
    # Получаем дополнительную информацию о файле
    result = {
        "message": "Медиафайл загружен успешно",
        "file_url": file_url,
        "filename": file.filename,
        "media_type": file_config['type'],
        "content_type": file.content_type,
        "size": actual_size
    }
    
    # Для видео пытаемся получить дополнительную информацию
    if file_config['type'] == 'video':
        try:
            import subprocess
            import json
            
            # Пытаемся получить информацию о видео через ffprobe
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json', 
                '-show_format', '-show_streams', file_path
            ]
            
            process = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if process.returncode == 0:
                video_info = json.loads(process.stdout)
                
                # Извлекаем информацию о видео
                for stream in video_info.get('streams', []):
                    if stream.get('codec_type') == 'video':
                        result['media_width'] = stream.get('width')
                        result['media_height'] = stream.get('height')
                        duration = stream.get('duration') or video_info.get('format', {}).get('duration')
                        if duration:
                            result['media_duration'] = int(float(duration))
                        break
                
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError) as e:
            # Если ffprobe недоступен или произошла ошибка, продолжаем без метаданных
            print(f"⚠️ ffprobe unavailable or failed: {str(e)}")
            pass
    
    print(f"📤 Returning result: {result}")
    return result

@router.post("/upload-image")
async def upload_announcement_image(
    file: UploadFile = File(...),
    current_user: UserInfo = Depends(get_current_user)
):
    """Загрузка изображения для объявления (устаревший эндпоинт, используйте /upload-media)"""
    check_admin_role(current_user)
    
    # Проверяем тип файла
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Файл должен быть изображением"
        )
    
    # Читаем содержимое файла для проверки размера
    try:
        content = await file.read()
        actual_size = len(content)
        print(f"📊 Image file size: {actual_size} bytes ({actual_size / 1024 / 1024:.2f} MB)")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ошибка чтения файла: {str(e)}"
        )
    
    # Проверяем размер файла (максимум 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    if actual_size > max_size:
        actual_size_mb = actual_size / 1024 / 1024
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Размер файла {actual_size_mb:.1f}MB превышает лимит 10MB"
        )
    
    # Создаем директорию если её нет
    # Определяем абсолютный путь к папке uploads относительно структуры проекта  
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(current_dir))
    upload_dir = os.path.join(backend_dir, "uploads", "announcements")
    upload_dir = os.path.abspath(upload_dir)
    
    os.makedirs(upload_dir, exist_ok=True)
    print(f"📂 Upload directory (legacy): {upload_dir}")
    
    # Генерируем уникальное имя файла
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    print(f"💾 Saving image to: {os.path.abspath(file_path)}")
    
    # Сохраняем файл
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Проверяем, что файл сохранился
        if not os.path.exists(file_path):
            raise Exception("Файл не был сохранен")
        
        saved_size = os.path.getsize(file_path)
        print(f"✅ Image saved successfully. Size on disk: {saved_size} bytes")
        
    except Exception as e:
        print(f"❌ Error saving image: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка сохранения файла: {str(e)}"
        )
    
    # Возвращаем URL файла
    file_url = f"/uploads/announcements/{filename}"
    print(f"🔗 Generated image URL: {file_url}")
    
    return {
        "message": "Изображение загружено успешно",
        "file_url": file_url,
        "filename": file.filename,
        "media_type": "image",
        "content_type": file.content_type,
        "size": actual_size
    } 