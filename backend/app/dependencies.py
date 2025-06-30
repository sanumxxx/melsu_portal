from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from .database import get_db
from .services.auth_service import verify_token
from .models.user import User as UserModel

security = HTTPBearer()

class UserInfo(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    roles: List[str] = []
    is_active: bool
    is_verified: bool

    class Config:
        from_attributes = True

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), 
    db: Session = Depends(get_db)
) -> UserInfo:
    """Зависимость для получения текущего пользователя"""
    token = credentials.credentials
    
    # Проверяем токен
    email = verify_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Получаем пользователя из БД
    user = db.query(UserModel).filter(UserModel.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserInfo(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        middle_name=user.middle_name,
        roles=user.roles or [],
        is_active=user.is_active,
        is_verified=user.is_verified
    )

async def require_admin(current_user: UserInfo = Depends(get_current_user)) -> UserInfo:
    """Зависимость для проверки прав администратора"""
    if 'admin' not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

async def get_current_user_from_token(token: str) -> Optional[UserInfo]:
    """Получение пользователя по токену (для middleware)"""
    try:
        from .database import SessionLocal
        
        # Проверяем токен
        email = verify_token(token)
        if email is None:
            return None
        
        # Получаем пользователя из БД
        db = SessionLocal()
        try:
            user = db.query(UserModel).filter(UserModel.email == email).first()
            if user is None:
                return None
            
            return UserInfo(
                id=user.id,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                middle_name=user.middle_name,
                roles=user.roles or [],
                is_active=user.is_active,
                is_verified=user.is_verified
            )
        finally:
            db.close()
    except Exception:
        return None 