from pydantic import BaseModel, EmailStr, field_serializer
from typing import Optional, List, Union
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
    birth_date: Optional[str] = None  # Принимаем как строку для совместимости с frontend
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
    birth_date: Optional[Union[str, date]] = None
    gender: str
    roles: List[str] = []
    is_verified: bool
    is_active: bool

    @field_serializer('birth_date')
    def serialize_birth_date(self, value):
        """Преобразует datetime.date в строку"""
        if value is None:
            return None
        if isinstance(value, date):
            return value.strftime('%Y-%m-%d')
        return value

    class Config:
        from_attributes = True

class UserResponse(User):
    """Схема для ответов API с информацией о пользователе"""
    full_name: Optional[str] = None
    department_name: Optional[str] = None
    group_name: Optional[str] = None
    course: Optional[int] = None

    class Config:
        from_attributes = True

    @field_serializer('birth_date')
    def serialize_birth_date(self, value):
        """Преобразует datetime.date в строку"""
        if value is None:
            return None
        if isinstance(value, date):
            return value.strftime('%Y-%m-%d')
        return value

    @field_serializer('full_name')
    def get_full_name(self, value):
        """Генерирует полное имя из компонентов"""
        if value is not None:
            return value
        parts = [self.last_name, self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        return ' '.join(parts)

class UserRoleUpdate(BaseModel):
    user_id: int
    roles: List[str]

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None 