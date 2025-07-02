from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel
import re
from ..database import get_db
from ..models.field import FieldType as FieldTypeModel, Field as FieldModel
from ..schemas.field import FieldType, FieldTypeCreate, Field, FieldCreate, FieldUpdate
from ..dependencies import get_current_user, UserInfo

router = APIRouter()

# Проверка админских прав
def check_admin_role(current_user: UserInfo):
    if "admin" not in (current_user.roles if hasattr(current_user, 'roles') else []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен: требуются права администратора"
        )

# ===========================================
# ТИПЫ ПОЛЕЙ
# ===========================================

@router.get("/field-types", response_model=List[FieldType])
async def get_field_types(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение всех типов полей"""
    check_admin_role(current_user)
    field_types = db.query(FieldTypeModel).all()
    return field_types

@router.post("/field-types", response_model=FieldType)
async def create_field_type(
    field_type: FieldTypeCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Создание нового типа поля"""
    check_admin_role(current_user)
    
    # Проверяем уникальность имени
    existing = db.query(FieldTypeModel).filter(FieldTypeModel.name == field_type.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Тип поля с таким именем уже существует"
        )
    
    db_field_type = FieldTypeModel(**field_type.dict())
    db.add(db_field_type)
    db.commit()
    db.refresh(db_field_type)
    return db_field_type

# ===========================================
# ПОЛЯ
# ===========================================

@router.get("/templates/{template_id}/fields", response_model=List[Field])
async def get_template_fields(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение полей конкретного шаблона"""
    check_admin_role(current_user)
    fields = db.query(FieldModel).filter(FieldModel.template_id == template_id).order_by(FieldModel.sort_order).all()
    return fields

@router.get("/templates/{template_id}/fields/public", response_model=List[Field])
async def get_template_fields_public(
    template_id: int,
    db: Session = Depends(get_db)
):
    """Получение полей конкретного шаблона для обычных пользователей"""
    from ..models.request_template import RequestTemplate
    
    # Проверяем, что шаблон активен
    template = db.query(RequestTemplate).filter(
        RequestTemplate.id == template_id,
        RequestTemplate.is_active == True
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Активный шаблон не найден"
        )
    
    # Возвращаем только видимые поля
    fields = db.query(FieldModel).filter(
        FieldModel.template_id == template_id,
        FieldModel.is_visible == True
    ).order_by(FieldModel.sort_order).all()
    return fields

@router.post("/templates/{template_id}/fields", response_model=Field)
async def create_field(
    template_id: int,
    field: FieldCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Создание нового поля для шаблона"""
    check_admin_role(current_user)
    
    # Устанавливаем template_id из URL
    field_data = field.dict()
    field_data['template_id'] = template_id
    
    # Проверяем уникальность имени поля в рамках шаблона
    existing = db.query(FieldModel).filter(
        FieldModel.template_id == template_id,
        FieldModel.name == field.name
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Поле с таким именем уже существует в этом шаблоне"
        )
    
    db_field = FieldModel(**field_data)
    db.add(db_field)
    db.commit()
    db.refresh(db_field)
    return db_field

@router.get("/fields/{field_id}", response_model=Field)
async def get_field(
    field_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение поля по ID"""
    check_admin_role(current_user)
    
    field = db.query(FieldModel).filter(FieldModel.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Поле не найдено"
        )
    return field

@router.put("/fields/{field_id}", response_model=Field)
async def update_field(
    field_id: int,
    field_update: FieldUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Обновление поля"""
    check_admin_role(current_user)
    
    field = db.query(FieldModel).filter(FieldModel.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Поле не найдено"
        )
    
    # Проверяем уникальность имени при обновлении
    if field_update.name and field_update.name != field.name:
        existing = db.query(FieldModel).filter(
            FieldModel.template_id == field.template_id,
            FieldModel.name == field_update.name
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Поле с таким именем уже существует в этом шаблоне"
            )
    
    update_data = field_update.dict(exclude_unset=True)
    for field_name, value in update_data.items():
        setattr(field, field_name, value)
    
    db.commit()
    db.refresh(field)
    return field

@router.delete("/fields/{field_id}")
async def delete_field(
    field_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Удаление поля"""
    check_admin_role(current_user)
    
    field = db.query(FieldModel).filter(FieldModel.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Поле не найдено"
        )
    
    db.delete(field)
    db.commit()
    return {"message": "Поле удалено успешно"}

# ===========================================
# ОПЦИИ ДЛЯ ДИНАМИЧЕСКИХ ПОЛЕЙ
# ===========================================

@router.get("/field-options/departments")
async def get_department_options(
    db: Session = Depends(get_db)
):
    """Получение списка кафедр для поля выбора кафедры"""
    from ..models.department import Department
    
    departments = db.query(Department).filter(
        Department.department_type == 'department',
        Department.is_active == True
    ).order_by(Department.name).all()
    
    return {
        "options": [
            {
                "value": str(dept.id),
                "label": dept.name,
                "faculty_id": dept.parent_id,
                "faculty_name": dept.parent.name if dept.parent else None
            }
            for dept in departments
        ]
    }

@router.get("/field-options/faculties")
async def get_faculty_options(
    db: Session = Depends(get_db)
):
    """Получение списка факультетов для поля выбора факультета"""
    from ..models.department import Department
    
    faculties = db.query(Department).filter(
        Department.department_type == 'faculty',
        Department.is_active == True
    ).order_by(Department.name).all()
    
    return {
        "options": [
            {
                "value": str(faculty.id),
                "label": faculty.name,
                "short_name": faculty.short_name
            }
            for faculty in faculties
        ]
    }

@router.get("/field-options/groups")
async def get_group_options(
    db: Session = Depends(get_db)
):
    """Получение списка групп для поля выбора группы"""
    from ..models.group import Group
    from sqlalchemy.orm import joinedload
    
    groups = db.query(Group).options(
        joinedload(Group.department)
    ).order_by(Group.name).all()
    
    return {
        "options": [
            {
                "value": str(group.id),
                "label": f"{group.name} ({group.specialization})" if group.specialization else group.name,
                "name": group.name,
                "specialization": group.specialization,
                "department_id": group.department_id,
                "department_name": group.department.name if group.department else None,
                "course": group.course,
                "admission_year": group.parsed_year
            }
            for group in groups
        ]
    }

# ===========================================
# ВАЛИДАЦИЯ МАСОК
# ===========================================

class FieldValueValidationRequest(BaseModel):
    field_id: int
    value: str

class FieldValueValidationResponse(BaseModel):
    is_valid: bool
    error_message: str = None
    formatted_value: str = None

class MaskTemplateRequest(BaseModel):
    mask_pattern: str
    value: str

class MaskTemplateResponse(BaseModel):
    is_valid: bool
    error_message: str = None

def validate_mask_value(value: str, mask_pattern: str, validation_regex: str = None) -> Dict[str, Any]:
    """Валидация значения по маске"""
    if not value or not mask_pattern:
        return {"is_valid": True}
    
    # Если есть regex для валидации, используем его
    if validation_regex:
        try:
            pattern = re.compile(validation_regex)
            if pattern.match(value):
                return {"is_valid": True, "formatted_value": value}
            else:
                return {
                    "is_valid": False, 
                    "error_message": "Значение не соответствует формату маски"
                }
        except re.error:
            # Если regex некорректный, используем простую проверку длины
            pass
    
    # Простая валидация по длине маски
    mask_length = len(mask_pattern)
    if len(value) != mask_length:
        return {
            "is_valid": False,
            "error_message": f"Значение должно содержать {mask_length} символов"
        }
    
    return {"is_valid": True, "formatted_value": value}

@router.post("/validate-field-value", response_model=FieldValueValidationResponse)
async def validate_field_value(
    validation_request: FieldValueValidationRequest,
    db: Session = Depends(get_db)
):
    """Валидация значения поля с маской"""
    field = db.query(FieldModel).filter(FieldModel.id == validation_request.field_id).first()
    
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Поле не найдено"
        )
    
    # Если маска не включена, считаем значение валидным
    if not field.mask_enabled:
        return FieldValueValidationResponse(
            is_valid=True,
            formatted_value=validation_request.value
        )
    
    # Валидируем по маске
    result = validate_mask_value(
        validation_request.value,
        field.mask_pattern,
        field.mask_validation_regex
    )
    
    return FieldValueValidationResponse(
        is_valid=result["is_valid"],
        error_message=result.get("error_message"),
        formatted_value=result.get("formatted_value", validation_request.value)
    )

@router.post("/validate-mask", response_model=MaskTemplateResponse)
async def validate_mask_template(
    mask_request: MaskTemplateRequest,
    current_user: UserInfo = Depends(get_current_user)
):
    """Валидация значения по шаблону маски (для тестирования в конструкторе)"""
    check_admin_role(current_user)
    
    # Создаем временный regex из маски
    try:
        # Конвертируем маску в regex
        regex_pattern = mask_request.mask_pattern
        regex_pattern = regex_pattern.replace('9', r'\d')  # 9 -> цифра
        regex_pattern = regex_pattern.replace('A', r'[A-Za-z]')  # A -> буква
        regex_pattern = regex_pattern.replace('a', r'[a-z]')  # a -> строчная буква
        regex_pattern = regex_pattern.replace('S', r'[A-Za-z0-9]')  # S -> буква или цифра
        regex_pattern = regex_pattern.replace('Я', r'[А-Яа-я]')  # Я -> кириллица
        regex_pattern = regex_pattern.replace('я', r'[а-я]')  # я -> строчная кириллица
        regex_pattern = regex_pattern.replace('*', r'.')  # * -> любой символ
        
        # Экранируем спецсимволы regex
        for char in '.^$+?{}[]|()\\':
            if char in regex_pattern and char not in ['.', '^', '$', '\\']:
                regex_pattern = regex_pattern.replace(char, f'\\{char}')
        
        regex_pattern = f'^{regex_pattern}$'
        
        # Валидируем значение
        result = validate_mask_value(
            mask_request.value,
            mask_request.mask_pattern,
            regex_pattern
        )
        
        return MaskTemplateResponse(
            is_valid=result["is_valid"],
            error_message=result.get("error_message")
        )
        
    except Exception as e:
        return MaskTemplateResponse(
            is_valid=False,
            error_message=f"Ошибка валидации маски: {str(e)}"
        )

@router.get("/mask-templates")
async def get_mask_templates(
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение доступных шаблонов масок"""
    check_admin_role(current_user)
    
    templates = {
        # Телефоны
        "phone_ru": {
            "id": "phone_ru",
            "name": "Телефон России",
            "pattern": "+7 (999) 999-99-99",
            "placeholder": "+7 (___) ___-__-__",
            "regex": r"^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$",
            "example": "+7 (123) 456-78-90",
            "category": "phone"
        },
        "phone_ua": {
            "id": "phone_ua",
            "name": "Телефон Украины",
            "pattern": "+38 (999) 999-99-99",
            "placeholder": "+38 (___) ___-__-__",
            "regex": r"^\+38 \(\d{3}\) \d{3}-\d{2}-\d{2}$",
            "example": "+38 (123) 456-78-90",
            "category": "phone"
        },
        
        # Документы РФ
        "passport_rf": {
            "id": "passport_rf",
            "name": "Паспорт РФ",
            "pattern": "99 99 999999",
            "placeholder": "__ __ ______",
            "regex": r"^\d{2} \d{2} \d{6}$",
            "example": "12 34 567890",
            "category": "document"
        },
        "snils": {
            "id": "snils",
            "name": "СНИЛС",
            "pattern": "999-999-999 99",
            "placeholder": "___-___-___ __",
            "regex": r"^\d{3}-\d{3}-\d{3} \d{2}$",
            "example": "123-456-789 01",
            "category": "document"
        },
        "inn_personal": {
            "id": "inn_personal",
            "name": "ИНН физ. лица",
            "pattern": "999999999999",
            "placeholder": "____________",
            "regex": r"^\d{12}$",
            "example": "123456789012",
            "category": "document"
        },
        
        # Банковские данные
        "card_number": {
            "id": "card_number",
            "name": "Номер банковской карты",
            "pattern": "9999 9999 9999 9999",
            "placeholder": "____ ____ ____ ____",
            "regex": r"^\d{4} \d{4} \d{4} \d{4}$",
            "example": "1234 5678 9012 3456",
            "category": "bank"
        },
        
        # Образовательные коды
        "student_id": {
            "id": "student_id",
            "name": "Студенческий билет",
            "pattern": "9999999999",
            "placeholder": "__________",
            "regex": r"^\d{10}$",
            "example": "1234567890",
            "category": "education"
        },
        
        # Даты
        "date_ru": {
            "id": "date_ru",
            "name": "Дата (ДД.ММ.ГГГГ)",
            "pattern": "99.99.9999",
            "placeholder": "__.__.____",
            "regex": r"^\d{2}\.\d{2}\.\d{4}$",
            "example": "01.01.2025",
            "category": "date"
        }
    }
    
    categories = {
        "phone": {"name": "Телефоны", "icon": "phone"},
        "document": {"name": "Документы", "icon": "document"},
        "bank": {"name": "Банковские данные", "icon": "credit-card"},
        "education": {"name": "Образование", "icon": "academic-cap"},
        "date": {"name": "Дата и время", "icon": "calendar"}
    }
    
    return {
        "templates": templates,
        "categories": categories
    } 