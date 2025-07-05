from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, or_, and_, func
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from ...database import get_db
from ...dependencies import get_current_user
from ...models.user import User
from ...models.department import Department
from ...models.directory_access import DirectoryAccess, DirectoryAccessTemplate, AccessType, AccessScope
from ...schemas.directory_access import *
from ...services.directory_access_service import DirectoryAccessService

router = APIRouter()

# ===========================================
# ПРОВЕРКА ДОСТУПА К АДМИНИСТРИРОВАНИЮ
# ===========================================

def check_admin_access(user: User):
    """Проверка доступа к администрированию справочников"""
    if 'admin' not in user.roles:
        raise HTTPException(
            status_code=403,
            detail="Доступ к администрированию справочников разрешен только администраторам"
        )

# ===========================================
# УПРАВЛЕНИЕ ДОСТУПОМ
# ===========================================

@router.get("/accesses", response_model=DirectoryAccessList)
async def get_directory_accesses(
    page: int = Query(1, ge=1, description="Номер страницы"),
    limit: int = Query(20, ge=1, le=100, description="Количество записей на странице"),
    user_id: Optional[int] = Query(None, description="Фильтр по пользователю"),
    department_id: Optional[int] = Query(None, description="Фильтр по подразделению"),
    access_type: Optional[AccessType] = Query(None, description="Фильтр по типу доступа"),
    scope: Optional[AccessScope] = Query(None, description="Фильтр по области доступа"),
    is_active: Optional[bool] = Query(None, description="Фильтр по активности"),
    expires_soon: Optional[bool] = Query(None, description="Доступы, истекающие в течение 30 дней"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение списка доступов с фильтрацией"""
    check_admin_access(current_user)
    
    # Базовый запрос
    query = db.query(DirectoryAccess).options(
        joinedload(DirectoryAccess.user),
        joinedload(DirectoryAccess.department),
        joinedload(DirectoryAccess.granted_by_user)
    )
    
    # Применяем фильтры
    if user_id:
        query = query.filter(DirectoryAccess.user_id == user_id)
    
    if department_id:
        query = query.filter(DirectoryAccess.department_id == department_id)
    
    if access_type:
        query = query.filter(DirectoryAccess.access_type == access_type)
    
    if scope:
        query = query.filter(DirectoryAccess.scope == scope)
    
    if is_active is not None:
        query = query.filter(DirectoryAccess.is_active == is_active)
    
    if expires_soon:
        # Доступы, истекающие в течение 30 дней
        thirty_days_from_now = datetime.utcnow() + timedelta(days=30)
        query = query.filter(
            and_(
                DirectoryAccess.expires_at.isnot(None),
                DirectoryAccess.expires_at <= thirty_days_from_now,
                DirectoryAccess.is_active == True
            )
        )
    
    # Подсчет общего количества
    total = query.count()
    
    # Пагинация
    offset = (page - 1) * limit
    accesses = query.offset(offset).limit(limit).all()
    
    # Формируем ответ
    result = []
    for access in accesses:
        # Информация о пользователе
        user_info = None
        if access.user:
            user_info = {
                "id": access.user.id,
                "first_name": access.user.first_name,
                "last_name": access.user.last_name,
                "middle_name": access.user.middle_name,
                "email": access.user.email,
                "roles": access.user.roles
            }
        
        # Информация о подразделении
        department_info = None
        if access.department:
            department_info = {
                "id": access.department.id,
                "name": access.department.name,
                "short_name": access.department.short_name,
                "department_type": access.department.department_type
            }
        
        # Информация о том, кто предоставил доступ
        granted_by_info = None
        if access.granted_by_user:
            granted_by_info = {
                "id": access.granted_by_user.id,
                "first_name": access.granted_by_user.first_name,
                "last_name": access.granted_by_user.last_name,
                "email": access.granted_by_user.email
            }
        
        access_data = DirectoryAccessResponse(
            id=access.id,
            user_id=access.user_id,
            department_id=access.department_id,
            access_type=access.access_type,
            scope=access.scope,
            inherit_children=access.inherit_children,
            restrictions=access.restrictions,
            description=access.description,
            expires_at=access.expires_at,
            is_active=access.is_active,
            granted_by=access.granted_by,
            granted_at=access.granted_at,
            created_at=access.created_at,
            updated_at=access.updated_at,
            user_info=user_info,
            department_info=department_info,
            granted_by_info=granted_by_info
        )
        result.append(access_data)
    
    return DirectoryAccessList(
        accesses=result,
        pagination={
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    )

@router.post("/accesses", response_model=DirectoryAccessResponse)
async def create_directory_access(
    access_data: DirectoryAccessCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создание нового доступа"""
    check_admin_access(current_user)
    
    # Проверяем, существует ли пользователь
    user = db.query(User).filter(User.id == access_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Проверяем, существует ли подразделение (если указано)
    if access_data.department_id:
        department = db.query(Department).filter(Department.id == access_data.department_id).first()
        if not department:
            raise HTTPException(status_code=404, detail="Подразделение не найдено")
    
    # Проверяем, не существует ли уже такой доступ
    existing_access = db.query(DirectoryAccess).filter(
        DirectoryAccess.user_id == access_data.user_id,
        DirectoryAccess.department_id == access_data.department_id,
        DirectoryAccess.scope == access_data.scope,
        DirectoryAccess.is_active == True
    ).first()
    
    if existing_access:
        raise HTTPException(
            status_code=400,
            detail="Пользователь уже имеет активный доступ к этому подразделению с такой же областью"
        )
    
    # Создаем доступ
    service = DirectoryAccessService(db)
    access = service.create_access(
        user_id=access_data.user_id,
        department_id=access_data.department_id,
        access_type=access_data.access_type,
        scope=access_data.scope,
        granted_by=current_user.id,
        inherit_children=access_data.inherit_children,
        restrictions=access_data.restrictions,
        description=access_data.description,
        expires_at=access_data.expires_at
    )
    
    # Загружаем связанные данные
    db.refresh(access)
    
    return DirectoryAccessResponse(
        id=access.id,
        user_id=access.user_id,
        department_id=access.department_id,
        access_type=access.access_type,
        scope=access.scope,
        inherit_children=access.inherit_children,
        restrictions=access.restrictions,
        description=access.description,
        expires_at=access.expires_at,
        is_active=access.is_active,
        granted_by=access.granted_by,
        granted_at=access.granted_at,
        created_at=access.created_at,
        updated_at=access.updated_at
    )

@router.put("/accesses/{access_id}", response_model=DirectoryAccessResponse)
async def update_directory_access(
    access_id: int,
    access_data: DirectoryAccessUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновление доступа"""
    check_admin_access(current_user)
    
    access = db.query(DirectoryAccess).filter(DirectoryAccess.id == access_id).first()
    if not access:
        raise HTTPException(status_code=404, detail="Доступ не найден")
    
    # Обновляем поля
    update_data = access_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(access, field, value)
    
    access.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(access)
    
    return DirectoryAccessResponse(
        id=access.id,
        user_id=access.user_id,
        department_id=access.department_id,
        access_type=access.access_type,
        scope=access.scope,
        inherit_children=access.inherit_children,
        restrictions=access.restrictions,
        description=access.description,
        expires_at=access.expires_at,
        is_active=access.is_active,
        granted_by=access.granted_by,
        granted_at=access.granted_at,
        created_at=access.created_at,
        updated_at=access.updated_at
    )

@router.delete("/accesses/{access_id}")
async def delete_directory_access(
    access_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удаление доступа"""
    check_admin_access(current_user)
    
    access = db.query(DirectoryAccess).filter(DirectoryAccess.id == access_id).first()
    if not access:
        raise HTTPException(status_code=404, detail="Доступ не найден")
    
    db.delete(access)
    db.commit()
    
    return {"message": "Доступ успешно удален"}

@router.post("/accesses/bulk", response_model=BulkAssignAccessResponse)
async def bulk_assign_access(
    bulk_data: BulkAssignAccessRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Массовое назначение доступа"""
    check_admin_access(current_user)
    
    service = DirectoryAccessService(db)
    created_accesses, errors = service.bulk_assign_access(
        user_ids=bulk_data.user_ids,
        department_ids=bulk_data.department_ids,
        access_type=bulk_data.access_type,
        scope=bulk_data.scope,
        granted_by=current_user.id,
        inherit_children=bulk_data.inherit_children,
        restrictions=bulk_data.restrictions,
        description=bulk_data.description,
        expires_at=bulk_data.expires_at
    )
    
    # Формируем ответ
    access_responses = []
    for access in created_accesses:
        access_responses.append(DirectoryAccessResponse(
            id=access.id,
            user_id=access.user_id,
            department_id=access.department_id,
            access_type=access.access_type,
            scope=access.scope,
            inherit_children=access.inherit_children,
            restrictions=access.restrictions,
            description=access.description,
            expires_at=access.expires_at,
            is_active=access.is_active,
            granted_by=access.granted_by,
            granted_at=access.granted_at,
            created_at=access.created_at,
            updated_at=access.updated_at
        ))
    
    return BulkAssignAccessResponse(
        success_count=len(created_accesses),
        failed_count=len(errors),
        errors=errors,
        created_accesses=access_responses
    )

# ===========================================
# ПРОВЕРКА ДОСТУПА
# ===========================================

@router.post("/check-access", response_model=CheckAccessResponse)
async def check_access(
    check_data: CheckAccessRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Проверка доступа пользователя"""
    check_admin_access(current_user)
    
    service = DirectoryAccessService(db)
    return service.check_user_access(
        user_id=check_data.user_id,
        department_id=check_data.department_id,
        scope=check_data.scope.value,
        required_access_type=check_data.required_access_type.value
    )

@router.get("/user-departments/{user_id}", response_model=UserDepartmentAccessResponse)
async def get_user_accessible_departments(
    user_id: int,
    scope: Optional[AccessScope] = Query(None, description="Фильтр по области доступа"),
    include_inherited: bool = Query(True, description="Включить наследуемые права"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение подразделений, доступных пользователю"""
    check_admin_access(current_user)
    
    service = DirectoryAccessService(db)
    departments = service.get_user_accessible_departments(
        user_id=user_id,
        scope=scope.value if scope else None,
        include_inherited=include_inherited
    )
    
    # Формируем сводку доступа
    access_summary = {
        "total_departments": len(departments),
        "by_access_type": {},
        "by_scope": {},
        "by_source": {}
    }
    
    for dept in departments:
        # По типу доступа
        access_type = dept.get("access_type", "unknown")
        access_summary["by_access_type"][access_type] = access_summary["by_access_type"].get(access_type, 0) + 1
        
        # По области доступа
        scope_value = dept.get("scope", "unknown")
        access_summary["by_scope"][scope_value] = access_summary["by_scope"].get(scope_value, 0) + 1
        
        # По источнику
        source = dept.get("source", "unknown")
        access_summary["by_source"][source] = access_summary["by_source"].get(source, 0) + 1
    
    return UserDepartmentAccessResponse(
        departments=departments,
        access_summary=access_summary
    )

# ===========================================
# ШАБЛОНЫ ДОСТУПА
# ===========================================

@router.get("/templates", response_model=DirectoryAccessTemplateList)
async def get_access_templates(
    page: int = Query(1, ge=1, description="Номер страницы"),
    limit: int = Query(20, ge=1, le=100, description="Количество записей на странице"),
    is_active: Optional[bool] = Query(None, description="Фильтр по активности"),
    for_role: Optional[str] = Query(None, description="Фильтр по роли"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение списка шаблонов доступа"""
    check_admin_access(current_user)
    
    query = db.query(DirectoryAccessTemplate).options(
        joinedload(DirectoryAccessTemplate.created_by_user)
    )
    
    if is_active is not None:
        query = query.filter(DirectoryAccessTemplate.is_active == is_active)
    
    if for_role:
        # Фильтр по роли (через JSON)
        query = query.filter(
            text(f"JSON_CONTAINS(for_roles, '\"{for_role}\"')")
        )
    
    # Подсчет общего количества
    total = query.count()
    
    # Пагинация
    offset = (page - 1) * limit
    templates = query.offset(offset).limit(limit).all()
    
    # Формируем ответ
    result = []
    for template in templates:
        # Подсчитываем количество использований
        usage_count = db.query(DirectoryAccess).filter(
            DirectoryAccess.description.ilike(f"%{template.name}%")
        ).count()
        
        # Информация о создателе
        created_by_info = None
        if template.created_by_user:
            created_by_info = {
                "id": template.created_by_user.id,
                "first_name": template.created_by_user.first_name,
                "last_name": template.created_by_user.last_name,
                "email": template.created_by_user.email
            }
        
        template_data = DirectoryAccessTemplateResponse(
            id=template.id,
            name=template.name,
            description=template.description,
            access_type=template.access_type,
            scope=template.scope,
            inherit_children=template.inherit_children,
            restrictions=template.restrictions,
            for_roles=template.for_roles,
            department_types=template.department_types,
            is_active=template.is_active,
            created_by=template.created_by,
            created_at=template.created_at,
            updated_at=template.updated_at,
            created_by_info=created_by_info,
            usage_count=usage_count
        )
        result.append(template_data)
    
    return DirectoryAccessTemplateList(
        templates=result,
        pagination={
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    )

@router.post("/templates", response_model=DirectoryAccessTemplateResponse)
async def create_access_template(
    template_data: DirectoryAccessTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создание шаблона доступа"""
    check_admin_access(current_user)
    
    template = DirectoryAccessTemplate(
        name=template_data.name,
        description=template_data.description,
        access_type=template_data.access_type,
        scope=template_data.scope,
        inherit_children=template_data.inherit_children,
        restrictions=template_data.restrictions,
        for_roles=template_data.for_roles,
        department_types=template_data.department_types,
        is_active=template_data.is_active,
        created_by=current_user.id
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return DirectoryAccessTemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        access_type=template.access_type,
        scope=template.scope,
        inherit_children=template.inherit_children,
        restrictions=template.restrictions,
        for_roles=template.for_roles,
        department_types=template.department_types,
        is_active=template.is_active,
        created_by=template.created_by,
        created_at=template.created_at,
        updated_at=template.updated_at
    )

@router.post("/templates/{template_id}/apply", response_model=ApplyTemplateResponse)
async def apply_access_template(
    template_id: int,
    apply_data: ApplyTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Применение шаблона доступа"""
    check_admin_access(current_user)
    
    service = DirectoryAccessService(db)
    created_accesses, errors = service.apply_template(
        template_id=template_id,
        user_ids=apply_data.user_ids,
        department_ids=apply_data.department_ids,
        granted_by=current_user.id,
        override_settings=apply_data.override_settings
    )
    
    # Формируем ответ
    access_responses = []
    for access in created_accesses:
        access_responses.append(DirectoryAccessResponse(
            id=access.id,
            user_id=access.user_id,
            department_id=access.department_id,
            access_type=access.access_type,
            scope=access.scope,
            inherit_children=access.inherit_children,
            restrictions=access.restrictions,
            description=access.description,
            expires_at=access.expires_at,
            is_active=access.is_active,
            granted_by=access.granted_by,
            granted_at=access.granted_at,
            created_at=access.created_at,
            updated_at=access.updated_at
        ))
    
    return ApplyTemplateResponse(
        success_count=len(created_accesses),
        failed_count=len(errors),
        errors=errors,
        created_accesses=access_responses
    )

# ===========================================
# СТАТИСТИКА
# ===========================================

@router.get("/statistics", response_model=AccessStatisticsResponse)
async def get_access_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение статистики доступа"""
    check_admin_access(current_user)
    
    service = DirectoryAccessService(db)
    stats = service.get_access_statistics()
    
    return AccessStatisticsResponse(**stats) 