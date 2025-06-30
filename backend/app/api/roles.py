from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.role import Role
from ..models.user import User
from ..schemas.role import Role as RoleSchema, RoleCreate, RoleUpdate, UserRoleUpdate
from ..dependencies import get_current_user, UserInfo

router = APIRouter()

@router.get("/", response_model=List[RoleSchema])
async def get_roles(
    include_inactive: bool = Query(False, description="Включить неактивные роли"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение списка всех ролей"""
    query = db.query(Role)
    
    if not include_inactive:
        query = query.filter(Role.is_active == True)
    
    roles = query.order_by(Role.is_system.desc(), Role.name).all()
    return roles

@router.post("/", response_model=RoleSchema)
async def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Создание новой роли (только для админов)"""
    # Проверяем права админа
    if "admin" not in (current_user.roles or []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для создания ролей"
        )
    
    # Проверяем уникальность имени роли
    existing_role = db.query(Role).filter(Role.name == role_data.name).first()
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Роль с таким именем уже существует"
        )
    
    # Создаем роль
    db_role = Role(
        name=role_data.name,
        display_name=role_data.display_name,
        description=role_data.description,
        is_active=role_data.is_active,
        is_system=False  # Пользовательские роли не являются системными
    )
    
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    
    return db_role

@router.put("/{role_id}", response_model=RoleSchema)
async def update_role(
    role_id: int,
    role_update: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Обновление роли (только для админов)"""
    # Проверяем права админа
    if "admin" not in (current_user.roles or []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для редактирования ролей"
        )
    
    # Находим роль
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Роль не найдена"
        )
    
    # Обновляем поля
    update_data = role_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)
    
    db.commit()
    db.refresh(role)
    
    return role

@router.delete("/{role_id}")
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Удаление роли (только для админов, нельзя удалять системные роли)"""
    # Проверяем права админа
    if "admin" not in (current_user.roles or []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для удаления ролей"
        )
    
    # Находим роль
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Роль не найдена"
        )
    
    # Нельзя удалять системные роли
    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалять системные роли"
        )
    
    # Проверяем, не назначена ли роль пользователям
    users_with_role = db.query(User).filter(User.roles.contains([role.name])).count()
    if users_with_role > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Роль назначена {users_with_role} пользователям. Сначала отзовите роль у всех пользователей."
        )
    
    db.delete(role)
    db.commit()
    
    return {"message": "Роль успешно удалена"}

@router.post("/assign-user-roles")
async def assign_user_roles(
    assignment: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Назначение ролей пользователю (только для админов)"""
    # Проверяем права админа
    if "admin" not in (current_user.roles or []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для назначения ролей"
        )
    
    # Находим пользователя
    user = db.query(User).filter(User.id == assignment.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Проверяем, что все роли существуют и активны
    for role_name in assignment.role_names:
        role = db.query(Role).filter(
            Role.name == role_name,
            Role.is_active == True
        ).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Роль '{role_name}' не найдена или неактивна"
            )
    
    # Назначаем роли
    user.roles = assignment.role_names
    db.commit()
    db.refresh(user)
    
    return {
        "message": "Роли успешно назначены",
        "user_id": user.id,
        "user_email": user.email,
        "assigned_roles": user.roles
    } 