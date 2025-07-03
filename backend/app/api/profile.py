from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, validator
import re
from ..database import get_db
from ..models.user import User
from ..models.user_profile import UserProfile
from ..models.department import Department
from ..models.role import Role
from ..models.user_assignment import UserDepartmentAssignment
from ..models.group import Group
from ..schemas.user_profile import UserProfileResponse, UserProfileCreate, UserProfileUpdate
from ..services.auth_service import verify_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter()
security = HTTPBearer()

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> int:
    """Получение ID текущего пользователя"""
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
    
    return user.id

@router.get("/profile/extended", response_model=UserProfileResponse)
async def get_extended_profile(current_user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Получение расширенного профиля пользователя"""
    
    # Получаем пользователя с профилем
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Получаем или создаем профиль
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user_id).first()
    if not profile:
        # Создаем пустой профиль если его нет
        profile = UserProfile(user_id=current_user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return profile

@router.put("/profile/extended", response_model=UserProfileResponse)
async def update_extended_profile(
    profile_data: UserProfileUpdate,
    current_user_id: int = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    """Обновление расширенного профиля пользователя"""
    
    # Получаем существующий профиль
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user_id).first()
    if not profile:
        # Создаем новый профиль
        profile = UserProfile(user_id=current_user_id)
        db.add(profile)
    
    # Обновляем поля профиля
    update_data = profile_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(profile, field):
            setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    
    return profile

@router.get("/profile/basic")
async def get_basic_profile(current_user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Получение базовой информации профиля с расширенными данными"""
    
    # Получаем пользователя
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Получаем профиль
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user_id).first()
    
    # Получаем основное назначение пользователя в подразделение
    primary_assignment = db.query(UserDepartmentAssignment).filter(
        UserDepartmentAssignment.user_id == current_user_id,
        UserDepartmentAssignment.is_primary == True
    ).first()
    
    # Если основного назначения нет, берем любое активное назначение
    if not primary_assignment:
        from datetime import date
        primary_assignment = db.query(UserDepartmentAssignment).filter(
            UserDepartmentAssignment.user_id == current_user_id,
            UserDepartmentAssignment.end_date.is_(None) | (UserDepartmentAssignment.end_date > date.today())
        ).first()
    
    # Формируем информацию о подразделении и роли
    department_info = None
    department_role_name = None
    department_id = None
    
    if primary_assignment:
        # Получаем подразделение
        department = db.query(Department).filter(Department.id == primary_assignment.department_id).first()
        if department:
            department_info = {
                "id": department.id,
                "name": department.name,
                "short_name": department.short_name,
                "department_type": department.department_type,
                "level": department.level
            }
            department_id = department.id
        
        # Получаем роль
        role = db.query(Role).filter(Role.id == primary_assignment.role_id).first()
        if role:
            department_role_name = role.name
    
    # Объединяем данные
    user_data = {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "middle_name": user.middle_name,
        "birth_date": user.birth_date.isoformat() if user.birth_date else None,
        "gender": user.gender,
        "roles": user.roles,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None
    }
    
    # Получаем или создаем профиль
    if not profile:
        # Создаем пустой профиль если его нет
        profile = UserProfile(user_id=current_user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    # Получаем информацию о группе если она указана
    group_info = None
    if profile.group_id:
        group = db.query(Group).filter(Group.id == profile.group_id).first()
        if group:
            group_info = {
                "id": group.id,
                "name": group.name,
                "specialization": group.specialization,
                "course": group.course,
                "admission_year": group.parsed_year,
                "education_level": group.parsed_education_level,
                "education_form": group.parsed_education_form
            }
    
    # Добавляем все данные профиля
    profile_data = {
        # Назначение в подразделение (из новой системы назначений)
        "department_id": department_id,
        "department_role": department_role_name,
        "assigned_department": department_info,
        
        # Контактная информация
        "phone": profile.phone,
        "alternative_email": profile.alternative_email,
        
        # Паспортные данные
        "passport_series": profile.passport_series,
        "passport_number": profile.passport_number,
        "passport_issued_by": profile.passport_issued_by,
        "passport_issued_date": profile.passport_issued_date.isoformat() if profile.passport_issued_date else None,
        "snils": profile.snils,
        "inn": profile.inn,
        
        # Адрес регистрации
        "registration_region": profile.registration_region,
        "registration_city": profile.registration_city,
        "registration_address": profile.registration_address,
        "registration_postal_code": profile.registration_postal_code,
        
        # Адрес проживания
        "residence_region": profile.residence_region,
        "residence_city": profile.residence_city,
        "residence_address": profile.residence_address,
        "residence_postal_code": profile.residence_postal_code,
        
        # Академическая информация
        "student_id": profile.student_id,
        "group_id": profile.group_id,
        "group": group_info,
        "course": profile.course,
        "semester": profile.semester,
        "faculty": profile.faculty,
        "department": profile.department,
        "specialization": profile.specialization,
        "education_level": profile.education_level,
        "education_form": profile.education_form,
        "funding_type": profile.funding_type,
        "enrollment_date": profile.enrollment_date.isoformat() if profile.enrollment_date else None,
        "graduation_date": profile.graduation_date.isoformat() if profile.graduation_date else None,
        "academic_status": profile.academic_status,
        
        # Профессиональная информация
        "employee_id": profile.employee_id,
        "hire_date": profile.hire_date.isoformat() if profile.hire_date else None,
        "employment_type": profile.employment_type,
        "work_schedule": profile.work_schedule,
        
        # Образование и квалификация
        "education_degree": profile.education_degree,
        "education_title": profile.education_title,
        "work_experience": profile.work_experience,
        "pedagogical_experience": profile.pedagogical_experience,
        
        # Дополнительная информация
        "marital_status": profile.marital_status,
        "children_count": profile.children_count,
        "emergency_contact": profile.emergency_contact,
        "social_category": profile.social_category,
        "military_service": profile.military_service,
        
        # Социальные сети
        "vk_id": profile.vk_id,
        "telegram_id": profile.telegram_id,
        
        # Достижения
        "gpa": profile.gpa,
    }
    user_data.update(profile_data)
    
    return user_data


# Схемы для подключения социальных сетей
class SocialNetworkConnect(BaseModel):
    """Схема для подключения социальной сети"""
    network_id: str
    
    @validator('network_id')
    def validate_network_id(cls, v):
        if not v or not v.strip():
            raise ValueError('ID социальной сети не может быть пустым')
        return v.strip()


class VKConnect(SocialNetworkConnect):
    """Схема для подключения ВКонтакте"""
    
    @validator('network_id')
    def validate_vk_id(cls, v):
        v = v.strip()
        
        # Проверяем если это ссылка на профиль VK
        if v.startswith('http'):
            # Извлекаем ID из ссылки
            vk_pattern = r'vk\.com/(?:id(\d+)|([a-zA-Z0-9_]+))'
            match = re.search(vk_pattern, v)
            if match:
                if match.group(1):  # Числовой ID
                    return match.group(1)
                else:  # Текстовый ID
                    return match.group(2)
            else:
                raise ValueError('Неверная ссылка на профиль ВКонтакте')
        
        # Проверяем если это просто ID (числовой или текстовый)
        if v.isdigit() or re.match(r'^[a-zA-Z0-9_]+$', v):
            return v
        
        raise ValueError('Неверный формат ID ВКонтакте')


class TelegramConnect(SocialNetworkConnect):
    """Схема для подключения Telegram"""
    
    @validator('network_id')
    def validate_telegram_id(cls, v):
        v = v.strip()
        
        # Проверяем если это ссылка на профиль Telegram
        if v.startswith('http'):
            # Извлекаем username из ссылки
            tg_pattern = r't\.me/([a-zA-Z0-9_]+)'
            match = re.search(tg_pattern, v)
            if match:
                return match.group(1)
            else:
                raise ValueError('Неверная ссылка на профиль Telegram')
        
        # Проверяем если это username (может начинаться с @)
        if v.startswith('@'):
            v = v[1:]
        
        if re.match(r'^[a-zA-Z0-9_]+$', v):
            return v
        
        raise ValueError('Неверный формат username Telegram')


@router.post("/profile/social/vk/connect")
async def connect_vk(
    vk_data: VKConnect,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Подключение ВКонтакте к профилю"""
    
    # Получаем или создаем профиль
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user_id).first()
    if not profile:
        profile = UserProfile(user_id=current_user_id)
        db.add(profile)
    
    # Проверяем, не используется ли уже этот VK ID
    existing_profile = db.query(UserProfile).filter(
        UserProfile.vk_id == vk_data.network_id,
        UserProfile.user_id != current_user_id
    ).first()
    
    if existing_profile:
        raise HTTPException(
            status_code=400,
            detail="Этот аккаунт ВКонтакте уже привязан к другому профилю"
        )
    
    # Обновляем профиль
    profile.vk_id = vk_data.network_id
    db.commit()
    db.refresh(profile)
    
    return {"message": "ВКонтакте успешно подключен", "vk_id": profile.vk_id}


@router.post("/profile/social/telegram/connect")
async def connect_telegram(
    telegram_data: TelegramConnect,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Подключение Telegram к профилю"""
    
    # Получаем или создаем профиль
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user_id).first()
    if not profile:
        profile = UserProfile(user_id=current_user_id)
        db.add(profile)
    
    # Проверяем, не используется ли уже этот Telegram ID
    existing_profile = db.query(UserProfile).filter(
        UserProfile.telegram_id == telegram_data.network_id,
        UserProfile.user_id != current_user_id
    ).first()
    
    if existing_profile:
        raise HTTPException(
            status_code=400,
            detail="Этот аккаунт Telegram уже привязан к другому профилю"
        )
    
    # Обновляем профиль
    profile.telegram_id = telegram_data.network_id
    db.commit()
    db.refresh(profile)
    
    return {"message": "Telegram успешно подключен", "telegram_id": profile.telegram_id}


@router.delete("/profile/social/vk/disconnect")
async def disconnect_vk(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Отключение ВКонтакте от профиля"""
    
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль не найден")
    
    if not profile.vk_id:
        raise HTTPException(status_code=400, detail="ВКонтакте не подключен")
    
    profile.vk_id = None
    db.commit()
    
    return {"message": "ВКонтакте успешно отключен"}


@router.delete("/profile/social/telegram/disconnect")
async def disconnect_telegram(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Отключение Telegram от профиля"""
    
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль не найден")
    
    if not profile.telegram_id:
        raise HTTPException(status_code=400, detail="Telegram не подключен")
    
    profile.telegram_id = None
    db.commit()
    
    return {"message": "Telegram успешно отключен"}


@router.get("/profile/social/status")
async def get_social_status(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Получение статуса подключения социальных сетей"""
    
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user_id).first()
    
    return {
        "vk_connected": bool(profile and profile.vk_id),
        "telegram_connected": bool(profile and profile.telegram_id),
        "vk_id": profile.vk_id if profile else None,
        "telegram_id": profile.telegram_id if profile else None
    }