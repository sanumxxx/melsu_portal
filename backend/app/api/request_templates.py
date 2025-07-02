from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.request_template import RequestTemplate as RequestTemplateModel
from ..schemas.request_template import RequestTemplate, RequestTemplateCreate, RequestTemplateUpdate
from ..dependencies import get_current_user, UserInfo

router = APIRouter()

# Проверка админских прав
def check_admin_role(current_user: UserInfo):
    if "admin" not in (current_user.roles if hasattr(current_user, 'roles') else []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен: требуются права администратора"
        )

@router.get("/", response_model=List[RequestTemplate])
async def get_templates(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение списка всех шаблонов заявок"""
    check_admin_role(current_user)
    templates = db.query(RequestTemplateModel).all()
    return templates

@router.get("/active", response_model=List[RequestTemplate])
async def get_active_templates(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение списка активных шаблонов заявок для обычных пользователей"""
    # Обычные пользователи могут видеть только активные шаблоны
    templates = db.query(RequestTemplateModel).filter(
        RequestTemplateModel.is_active == True
    ).all()
    return templates

@router.post("/", response_model=RequestTemplate)
async def create_template(
    template: RequestTemplateCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Создание нового шаблона заявки"""
    check_admin_role(current_user)
    
    # Проверяем уникальность имени
    existing = db.query(RequestTemplateModel).filter(RequestTemplateModel.name == template.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Шаблон с таким именем уже существует"
        )
    
    db_template = RequestTemplateModel(**template.dict())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/{template_id}", response_model=RequestTemplate)
async def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение шаблона по ID"""
    template = db.query(RequestTemplateModel).filter(RequestTemplateModel.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Шаблон не найден"
        )
    
    # Проверяем права доступа
    is_admin = "admin" in (current_user.roles if hasattr(current_user, 'roles') else [])
    
    # Админы могут получать любые шаблоны
    if is_admin:
        return template
    
    # Обычные пользователи могут получать только активные шаблоны
    if not template.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ к неактивному шаблону запрещен"
        )
    
    return template

@router.put("/{template_id}", response_model=RequestTemplate)
async def update_template(
    template_id: int,
    template_update: RequestTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Обновление шаблона"""
    check_admin_role(current_user)
    
    template = db.query(RequestTemplateModel).filter(RequestTemplateModel.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Шаблон не найден"
        )
    
    # Проверяем уникальность имени при обновлении
    if template_update.name and template_update.name != template.name:
        existing = db.query(RequestTemplateModel).filter(RequestTemplateModel.name == template_update.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Шаблон с таким именем уже существует"
            )
    
    update_data = template_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    
    db.commit()
    db.refresh(template)
    return template

@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Удаление шаблона"""
    check_admin_role(current_user)
    
    template = db.query(RequestTemplateModel).filter(RequestTemplateModel.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Шаблон не найден"
        )
    
    db.delete(template)
    db.commit()
    return {"message": "Шаблон удален успешно"}

@router.get("/{template_id}/debug")
async def debug_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Отладочный endpoint для проверки настроек шаблона"""
    check_admin_role(current_user)
    
    template = db.query(RequestTemplateModel).filter(RequestTemplateModel.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Шаблон не найден"
        )
    
    return {
        "id": template.id,
        "name": template.name,
        "routing_type": template.routing_type,
        "auto_assign_enabled": template.auto_assign_enabled,
        "default_assignees": template.default_assignees,
        "department_routing": template.department_routing,
        "debug_info": {
            "default_assignees_type": type(template.default_assignees).__name__,
            "default_assignees_length": len(template.default_assignees) if template.default_assignees else 0,
            "auto_assign_enabled_type": type(template.auto_assign_enabled).__name__
        }
    } 