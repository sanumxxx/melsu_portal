from pydantic import BaseModel, EmailStr, field_serializer
from typing import Optional, List
from datetime import date

class UserBase(BaseModel):
    email: EmailStr

class EmailVerificationRequest(BaseModel):
    email: EmailStr

class EmailVerificationCode(BaseModel):
    email: EmailStr
    code: str

class UserRegistration(BaseModel):
    email: EmailStr
    verification_code: str
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    birth_date: str  # Принимаем как строку для совместимости с frontend
    gender: str      # Принимаем как строку вместо enum
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    birth_date: str
    gender: str
    roles: List[str] = []
    is_verified: bool
    is_active: bool

    @field_serializer('birth_date')
    def serialize_birth_date(self, value):
        """Преобразует datetime.date в строку"""
        if isinstance(value, date):
            return value.strftime('%Y-%m-%d')
        return value

    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    user_id: int
    roles: List[str]

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None 