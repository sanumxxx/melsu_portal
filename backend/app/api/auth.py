from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..dependencies import get_current_user
from ..schemas.user import (
    EmailVerificationRequest, 
    EmailVerificationCode, 
    UserRegistration, 
    UserLogin, 
    User, 
    Token
)
from ..services.auth_service import (
    send_verification_code,
    verify_code,
    authenticate_user,
    create_user,
    create_access_token,
    verify_token
)
from ..services.activity_service import ActivityService
from ..models.user import User as UserModel
from ..core.config import settings
from sqlalchemy import or_

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

@router.post("/send-verification-code")
async def send_code(request: EmailVerificationRequest, db: Session = Depends(get_db)):
    try:
        # Проверяем, не зарегистрирован ли уже пользователь
        existing_user = db.query(UserModel).filter(UserModel.email == request.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует"
            )
        
        code = await send_verification_code(request.email, db)
        return {
            "message": "Код подтверждения отправлен на email", 
            "code": code  # В продакшене убрать!
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка отправки кода"
        )

@router.post("/verify-code")
async def verify_email_code(request: EmailVerificationCode, db: Session = Depends(get_db)):
    # Проверяем код БЕЗ пометки как использованный (mark_as_used=False)
    if verify_code(request.email, request.code, db, mark_as_used=False):
        return {"message": "Код подтвержден успешно"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный или истекший код"
        )

@router.post("/register", response_model=Token)
async def register(user_data: UserRegistration, request: Request, db: Session = Depends(get_db)):
    try:
        print(f"[DEBUG] Registration attempt for {user_data.email}")
        
        # Проверяем, не существует ли уже пользователь
        existing_user = db.query(UserModel).filter(UserModel.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже зарегистрирован"
            )
        
        user = create_user(user_data, db)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный код верификации или код истек"
            )
        
        print(f"[DEBUG] User created successfully: {user.email}")
        
        # Логирование регистрации
        activity_service = ActivityService(db)
        activity_service.log_activity(
            action="user_create",
            description=f"Новый пользователь зарегистрирован: {user.email}",
            user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
            details={
                "first_name": user.first_name,
                "last_name": user.last_name,
                "roles": user.roles
            },
            request=request
        )
        
        # Создаем токен доступа для нового пользователя
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Registration failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Внутренняя ошибка сервера"
        )

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = authenticate_user(user_data.email, user_data.password, db)
    if not user:
        # Логирование неудачной попытки входа
        activity_service = ActivityService(db)
        activity_service.log_activity(
            action="login",
            description=f"Неудачная попытка входа: {user_data.email}",
            user_id=None,
            resource_type="auth",
            details={
                "email": user_data.email,
                "success": False
            },
            request=request
        )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Логирование успешного входа
    activity_service = ActivityService(db)
    activity_service.log_activity(
        action="login",
        description=f"Пользователь вошел в систему: {user.email}",
        user_id=user.id,
        resource_type="auth",
        details={
            "email": user.email,
            "success": True,
            "roles": user.roles
        },
        request=request
    )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=User)
async def get_current_user_info(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    email = verify_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(UserModel).filter(UserModel.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Создаем Pydantic схему с правильной сериализацией birth_date
    return User(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        middle_name=user.middle_name,
        birth_date=user.birth_date.strftime('%Y-%m-%d') if user.birth_date else '',
        gender=user.gender or '',
        roles=user.roles or [],
        is_verified=user.is_verified,
        is_active=user.is_active
    )

@router.get("/search")
async def search_users(
    q: str = Query(..., min_length=2, description="Поисковый запрос (минимум 2 символа)"),
    limit: int = Query(10, le=50, description="Количество результатов"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Поиск пользователей по имени, фамилии или email"""
    
    # Только авторизованные пользователи могут искать других пользователей
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация"
        )
    
    # Поиск по имени, фамилии или email
    search_query = f"%{q}%"
    users = db.query(UserModel)\
        .filter(
            or_(
                UserModel.first_name.ilike(search_query),
                UserModel.last_name.ilike(search_query),
                UserModel.email.ilike(search_query)
            )
        )\
        .filter(UserModel.is_active == True)\
        .limit(limit)\
        .all()
    
    # Возвращаем только необходимые поля
    result = []
    for user in users:
        full_name = f"{user.last_name} {user.first_name}"
        if user.middle_name:
            full_name += f" {user.middle_name}"
        
        result.append({
            "id": user.id,
            "email": user.email,
            "full_name": full_name,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "middle_name": user.middle_name,
            "roles": user.roles
        })
    
    return result

@router.post("/users/by-ids")
async def get_users_by_ids(
    user_ids: List[int],
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение пользователей по массиву ID"""
    
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация"
        )
    
    users = db.query(UserModel)\
        .filter(UserModel.id.in_(user_ids))\
        .filter(UserModel.is_active == True)\
        .all()
    
    # Возвращаем только необходимые поля
    result = []
    for user in users:
        full_name = f"{user.last_name} {user.first_name}"
        if user.middle_name:
            full_name += f" {user.middle_name}"
        
        result.append({
            "id": user.id,
            "email": user.email,
            "full_name": full_name,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "middle_name": user.middle_name,
            "roles": user.roles
        })
    
    return result