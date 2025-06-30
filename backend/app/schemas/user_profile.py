from pydantic import BaseModel, validator, Field
from datetime import date, datetime
from typing import Optional, List
import json

class UserProfileBase(BaseModel):
    """Базовая схема профиля пользователя"""
    
    # Старые поля подразделения удалены - используйте UserDepartmentAssignment
    
    # Контактная информация
    phone: Optional[str] = Field(None, max_length=20, description="Номер телефона")
    alternative_email: Optional[str] = Field(None, max_length=100, description="Дополнительный email")
    
    # Паспортные данные
    passport_series: Optional[str] = Field(None, max_length=10, description="Серия паспорта")
    passport_number: Optional[str] = Field(None, max_length=20, description="Номер паспорта")
    passport_issued_by: Optional[str] = Field(None, description="Кем выдан паспорт")
    passport_issued_date: Optional[date] = Field(None, description="Дата выдачи паспорта")
    
    # Документы
    snils: Optional[str] = Field(None, max_length=20, description="СНИЛС")
    inn: Optional[str] = Field(None, max_length=20, description="ИНН")
    
    # Адрес регистрации
    registration_region: Optional[str] = Field(None, max_length=100, description="Регион регистрации")
    registration_city: Optional[str] = Field(None, max_length=100, description="Город регистрации")
    registration_address: Optional[str] = Field(None, description="Адрес регистрации")
    registration_postal_code: Optional[str] = Field(None, max_length=10, description="Почтовый индекс регистрации")
    
    # Адрес проживания
    residence_region: Optional[str] = Field(None, max_length=100, description="Регион проживания")
    residence_city: Optional[str] = Field(None, max_length=100, description="Город проживания")
    residence_address: Optional[str] = Field(None, description="Адрес проживания")
    residence_postal_code: Optional[str] = Field(None, max_length=10, description="Почтовый индекс проживания")

class UserProfileAcademic(BaseModel):
    """Академическая информация"""
    
    student_id: Optional[str] = Field(None, max_length=50, description="Номер студенческого билета")
    group_id: Optional[int] = Field(None, description="ID группы")
    course: Optional[int] = Field(None, ge=1, le=6, description="Курс обучения")
    semester: Optional[int] = Field(None, ge=1, le=12, description="Семестр")
    faculty: Optional[str] = Field(None, max_length=200, description="Факультет")
    department: Optional[str] = Field(None, max_length=200, description="Кафедра")
    specialization: Optional[str] = Field(None, max_length=200, description="Специальность")
    education_level: Optional[str] = Field(None, max_length=50, description="Уровень образования")
    education_form: Optional[str] = Field(None, max_length=50, description="Форма обучения")
    funding_type: Optional[str] = Field(None, max_length=50, description="Основа обучения")
    enrollment_date: Optional[date] = Field(None, description="Дата поступления")
    graduation_date: Optional[date] = Field(None, description="Дата окончания")
    academic_status: Optional[str] = Field(default="active", max_length=50, description="Академический статус")

class UserProfileProfessional(BaseModel):
    """Профессиональная информация"""
    
    employee_id: Optional[str] = Field(None, max_length=50, description="Табельный номер")
    hire_date: Optional[date] = Field(None, description="Дата приема на работу")
    employment_type: Optional[str] = Field(None, max_length=50, description="Тип занятости")
    work_schedule: Optional[str] = Field(None, max_length=100, description="График работы")
    
    # Образование и квалификация
    education_degree: Optional[str] = Field(None, max_length=100, description="Ученая степень")
    education_title: Optional[str] = Field(None, max_length=100, description="Ученое звание")
    work_experience: Optional[int] = Field(None, ge=0, description="Общий стаж работы (лет)")
    pedagogical_experience: Optional[int] = Field(None, ge=0, description="Педагогический стаж (лет)")

class UserProfileAdditional(BaseModel):
    """Дополнительная информация"""
    
    marital_status: Optional[str] = Field(None, max_length=50, description="Семейное положение")
    children_count: Optional[int] = Field(default=0, ge=0, description="Количество детей")
    emergency_contact: Optional[str] = Field(None, max_length=200, description="Контакт для экстренных случаев")
    social_category: Optional[str] = Field(None, max_length=100, description="Социальная категория")
    military_service: Optional[str] = Field(None, max_length=100, description="Военная служба")
    
    # Достижения
    gpa: Optional[str] = Field(None, max_length=10, description="Средний балл")

class UserProfileCreate(UserProfileBase, UserProfileAcademic, UserProfileProfessional, UserProfileAdditional):
    """Схема для создания профиля пользователя"""
    

    
    @validator('education_level')
    def validate_education_level(cls, v):
        if v and v not in ['bachelor', 'master', 'postgraduate', 'doctorate']:
            raise ValueError('education_level должен быть bachelor, master, postgraduate или doctorate')
        return v
    
    @validator('education_form')
    def validate_education_form(cls, v):
        if v and v not in ['full_time', 'part_time', 'evening', 'distance']:
            raise ValueError('education_form должен быть full_time, part_time, evening или distance')
        return v
    
    @validator('funding_type')
    def validate_funding_type(cls, v):
        if v and v not in ['budget', 'contract', 'targeted']:
            raise ValueError('funding_type должен быть budget, contract или targeted')
        return v

class UserProfileUpdate(UserProfileCreate):
    """Схема для обновления профиля пользователя"""
    pass

class UserProfileResponse(UserProfileCreate):
    """Схема для возврата данных профиля"""
    
    id: int
    user_id: int
    department_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        
    def dict(self, **kwargs):
        """Переопределяем dict для обработки JSON полей"""
        data = super().dict(**kwargs)
        
        # Остались только критически важные поля, JSON поля удалены
        
        return data

class UserProfileSummary(BaseModel):
    """Краткая информация профиля для списков"""
    
    id: int
    user_id: int
    student_id: Optional[str] = None
    employee_id: Optional[str] = None
    faculty: Optional[str] = None
    department: Optional[str] = None
    course: Optional[int] = None
    group_id: Optional[int] = None
    
    class Config:
        from_attributes = True 