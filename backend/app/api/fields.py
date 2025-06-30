from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
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