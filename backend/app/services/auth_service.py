from datetime import datetime, timedelta, date
from typing import Optional
import random
import string
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..models.user import User, EmailVerification
from ..models.user_profile import UserProfile
from ..schemas.user import UserRegistration
from ..core.config import settings

security = HTTPBearer()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def generate_verification_code():
    return ''.join(random.choices(string.digits, k=6))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return email
    except JWTError:
        return None

async def send_verification_code(email: str, db: Session):
    # Проверяем, есть ли уже активный код
    existing_verification = db.query(EmailVerification).filter(
        EmailVerification.email == email,
        EmailVerification.expires_at > datetime.utcnow(),
        EmailVerification.is_used == False
    ).first()
    
    if existing_verification:
        return existing_verification.code
    
    # Генерируем новый код
    code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    verification = EmailVerification(
        email=email,
        code=code,
        expires_at=expires_at
    )
    
    db.add(verification)
    db.commit()
    
    # Отправляем код на email через MELSU почту
    from .email_service import email_service
    
    try:
        success = email_service.send_verification_code(email, code)
        if success:
            print(f"[EMAIL] Verification code sent to {email}")
        else:
            print(f"[EMAIL ERROR] Failed to send code to {email}")
    except Exception as e:
        print(f"[EMAIL ERROR] Exception while sending to {email}: {str(e)}")
        # В случае ошибки отправки показываем код в консоли для разработки
        print(f"[DEV FALLBACK] Verification code for {email}: {code}")
    
    return code

def verify_code(email: str, code: str, db: Session, mark_as_used: bool = True):
    print(f"[DEBUG] Verifying code {code} for email {email}, mark_as_used: {mark_as_used}")
    
    verification = db.query(EmailVerification).filter(
        EmailVerification.email == email,
        EmailVerification.code == code,
        EmailVerification.expires_at > datetime.utcnow(),
        EmailVerification.is_used == False
    ).first()
    
    if verification:
        print(f"[DEBUG] Code verification successful for {email}")
        if mark_as_used:
            verification.is_used = True
            db.commit()
            print(f"[DEBUG] Code marked as used for {email}")
        return True
    else:
        # Проверим что есть в базе для этого email
        all_codes = db.query(EmailVerification).filter(EmailVerification.email == email).all()
        print(f"[DEBUG] Found {len(all_codes)} verification codes for {email}")
        for v in all_codes:
            print(f"[DEBUG] Code: {v.code}, Expires: {v.expires_at}, Used: {v.is_used}, Current time: {datetime.utcnow()}")
        return False

def authenticate_user(email: str, password: str, db: Session):
    print(f"[DEBUG] Authenticating user: {email}")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"[DEBUG] User not found: {email}")
        return False
    
    print(f"[DEBUG] User found, verifying password...")
    if not verify_password(password, user.password_hash):
        print(f"[DEBUG] Password verification failed for: {email}")
        return False
    
    print(f"[DEBUG] Authentication successful for: {email}")
    return user

def create_user(user_data: UserRegistration, db: Session):
    print(f"[DEBUG] Creating user with email: {user_data.email}")
    print(f"[DEBUG] Verification code: {user_data.verification_code}")
    
    # Проверяем код верификации и помечаем как использованный
    if not verify_code(user_data.email, user_data.verification_code, db, mark_as_used=True):
        print(f"[DEBUG] Verification code invalid for {user_data.email}")
        return None
    
    # Проверяем, не существует ли уже пользователь
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        print(f"[DEBUG] User already exists: {user_data.email}")
        return None
    
    # Создаем пользователя
    hashed_password = get_password_hash(user_data.password)
    
    # Преобразуем строковую дату в date объект
    try:
        if isinstance(user_data.birth_date, str):
            birth_date_obj = datetime.strptime(user_data.birth_date, '%Y-%m-%d').date()
        else:
            birth_date_obj = user_data.birth_date
    except ValueError as e:
        print(f"[ERROR] Invalid birth_date format: {user_data.birth_date}")
        return None
    
    # Убеждаемся что gender это строка
    gender_str = str(user_data.gender)
    
    print(f"[DEBUG] Creating user with gender: {gender_str}, birth_date: {birth_date_obj}")
    
    db_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        middle_name=user_data.middle_name,
        birth_date=birth_date_obj,
        gender=gender_str,
        is_verified=True,
        roles=[]  # Пустой список ролей при регистрации
    )
    
    print(f"[DEBUG] User created without roles - roles will be assigned by admin")
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    print(f"[DEBUG] User created successfully with ID: {db_user.id}")
    
    # Создаем пустой профиль для нового пользователя
    try:
        user_profile = UserProfile(user_id=db_user.id)
        db.add(user_profile)
        db.commit()
        db.refresh(user_profile)
        print(f"[DEBUG] Empty profile created for user ID: {db_user.id}")
    except Exception as e:
        print(f"[ERROR] Failed to create profile for user {db_user.id}: {str(e)}")
        # Не прерываем создание пользователя, профиль можно создать позже
    
    return db_user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Зависимость для получения текущего пользователя"""
    from ..database import get_db
    db = next(get_db())
    
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
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user 