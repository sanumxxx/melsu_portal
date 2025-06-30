from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User, UserRole
from ..core.config import settings
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class UserRoleAssignment(BaseModel):
    user_id: int
    roles: List[str]

class UserEmailRoleAssignment(BaseModel):
    email: str
    roles: List[str]

@router.post("/dev/assign-admin/{user_id}")
async def assign_admin_role(user_id: int, db: Session = Depends(get_db)):
    """
    DEV ENDPOINT: Назначить роль админа пользователю по ID
    ⚠️ ТОЛЬКО ДЛЯ РАЗРАБОТКИ! В продакшене удалить!
    """
    # В продакшене добавить проверку на debug режим
    # if not settings.DEBUG:
    #     raise HTTPException(status_code=404, detail="Not found")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Добавляем роль админа если её нет
    current_roles = user.roles or []
    if "admin" not in current_roles:
        current_roles.append("admin")
        user.roles = current_roles
        db.commit()
        db.refresh(user)
    
    return {
        "message": f"Роль админа назначена пользователю {user.email}",
        "user_id": user.id,
        "email": user.email,
        "roles": user.roles
    }

@router.get("/dev/assign-admin-by-email")
async def assign_admin_by_email_get(email: str, db: Session = Depends(get_db)):
    """
    DEV ENDPOINT: Назначить роль админа пользователю по email (GET версия)
    ⚠️ ТОЛЬКО ДЛЯ РАЗРАБОТКИ! В продакшене удалить!
    
    Пример использования:
    GET /dev/assign-admin-by-email?email=user@example.com
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"Пользователь с email {email} не найден")
    
    # Добавляем роль админа если её нет
    current_roles = user.roles or []
    if "admin" not in current_roles:
        current_roles.append("admin")
        user.roles = current_roles
        db.commit()
        db.refresh(user)
    
    return {
        "message": f"Роль админа назначена пользователю {email}",
        "user_id": user.id,
        "email": user.email,
        "roles": user.roles
    }

@router.post("/dev/assign-admin-by-email")
async def assign_admin_by_email(email: str, db: Session = Depends(get_db)):
    """
    DEV ENDPOINT: Назначить роль админа пользователю по email
    ⚠️ ТОЛЬКО ДЛЯ РАЗРАБОТКИ! В продакшене удалить!
    
    Пример использования:
    POST /dev/assign-admin-by-email?email=user@example.com
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"Пользователь с email {email} не найден")
    
    # Добавляем роль админа если её нет
    current_roles = user.roles or []
    if "admin" not in current_roles:
        current_roles.append("admin")
        user.roles = current_roles
        db.commit()
        db.refresh(user)
    
    return {
        "message": f"Роль админа назначена пользователю {email}",
        "user_id": user.id,
        "email": user.email,
        "roles": user.roles
    }

@router.post("/dev/assign-roles")
async def assign_roles(assignment: UserRoleAssignment, db: Session = Depends(get_db)):
    """
    DEV ENDPOINT: Назначить роли пользователю
    ⚠️ ТОЛЬКО ДЛЯ РАЗРАБОТКИ! В продакшене удалить!
    """
    user = db.query(User).filter(User.id == assignment.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Валидация ролей
    valid_roles = [role.value for role in UserRole]
    for role in assignment.roles:
        if role not in valid_roles:
            raise HTTPException(
                status_code=400, 
                detail=f"Недопустимая роль: {role}. Доступные роли: {valid_roles}"
            )
    
    # Назначаем роли
    user.roles = assignment.roles
    db.commit()
    db.refresh(user)
    
    return {
        "message": f"Роли назначены пользователю {user.email}",
        "user_id": user.id,
        "email": user.email,
        "roles": user.roles
    }

@router.get("/dev/users")
async def get_all_users_dev(db: Session = Depends(get_db)):
    """
    DEV ENDPOINT: Получить всех пользователей с их ролями
    ⚠️ ТОЛЬКО ДЛЯ РАЗРАБОТКИ! В продакшене удалить!
    """
    users = db.query(User).all()
    return {
        "users": [
            {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "roles": user.roles,
                "is_active": user.is_active,
                "created_at": user.created_at
            }
            for user in users
        ]
    }

@router.get("/dev/roles")
async def get_available_roles():
    """
    DEV ENDPOINT: Получить список всех доступных ролей
    ⚠️ ТОЛЬКО ДЛЯ РАЗРАБОТКИ! В продакшене удалить!
    """
    return {
        "available_roles": [role.value for role in UserRole],
        "role_descriptions": {
            "admin": "Администратор",
            "teacher": "Преподаватель", 
            "student": "Студент",
            "employee": "Сотрудник",
            "schoolchild": "Школьник"
        }
    }

 