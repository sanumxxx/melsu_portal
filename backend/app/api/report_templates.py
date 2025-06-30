from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional

from ..database import get_db
from ..models import ReportTemplate, Report, User
from ..schemas.report_template import (
    ReportTemplateCreate,
    ReportTemplateUpdate,
    ReportTemplateResponse,
    ReportTemplateList
)
from ..dependencies import get_current_user, UserInfo

router = APIRouter(prefix="/report-templates", tags=["Report Templates"])

def check_template_access(template: ReportTemplate, current_user: UserInfo, action: str = "view") -> bool:
    """Проверка доступа к шаблону отчета"""
    
    # Админы имеют полный доступ
    if "admin" in current_user.roles:
        return True
    
    # Создатель шаблона имеет полный доступ
    if template.created_by_id == current_user.id:
        return True
    
    if action == "create_report":
        # Проверяем разрешенные роли для создания отчетов
        if template.allowed_roles:
            return any(role in current_user.roles for role in template.allowed_roles)
        return False
    
    if action == "view_reports":
        # Проверяем права на просмотр отчетов
        if template.viewers:
            for viewer in template.viewers:
                if viewer.get("type") == "role" and viewer.get("value") in current_user.roles:
                    return True
                if viewer.get("type") == "user" and viewer.get("value") == current_user.id:
                    return True
        return False
    
    return False

@router.post("/", response_model=ReportTemplateResponse)
async def create_report_template(
    template_data: ReportTemplateCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Создать новый шаблон отчета"""
    
    print(f"🔧 Получены данные для создания шаблона: {template_data}")
    print(f"🔧 Поля шаблона: {template_data.fields}")
    
    # Только админы могут создавать шаблоны
    if "admin" not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для создания шаблонов отчетов"
        )
    
    template = ReportTemplate(
        **template_data.dict(),
        created_by_id=current_user.id
    )
    
    print(f"🔧 Создан объект шаблона: {template}")
    print(f"🔧 Поля в объекте: {template.fields}")
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    print(f"🔧 Шаблон сохранен в БД с ID: {template.id}")
    
    # Загружаем с информацией о создателе
    template_with_creator = db.query(ReportTemplate).options(
        joinedload(ReportTemplate.creator)
    ).filter(ReportTemplate.id == template.id).first()
    
    result = ReportTemplateResponse.from_orm(template_with_creator)
    result.creator_name = f"{template_with_creator.creator.first_name} {template_with_creator.creator.last_name}"
    result.reports_count = 0
    
    print(f"🔧 Возвращаем результат: {result}")
    
    return result

@router.get("/", response_model=List[ReportTemplateList])
async def get_report_templates(
    active_only: bool = Query(True, description="Только активные шаблоны"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить список шаблонов отчетов"""
    
    # Сначала получаем шаблоны с количеством отчетов
    query = db.query(
        ReportTemplate.id,
        func.count(Report.id).label('reports_count')
    ).outerjoin(Report).group_by(ReportTemplate.id)
    
    if active_only:
        query = query.filter(ReportTemplate.is_active == True)
    
    template_counts = query.all()
    
    if not template_counts:
        return []
    
    # Получаем ID шаблонов
    template_ids = [tc[0] for tc in template_counts]
    
    # Загружаем полную информацию о шаблонах
    templates = db.query(ReportTemplate).options(
        joinedload(ReportTemplate.creator)
    ).filter(ReportTemplate.id.in_(template_ids)).all()
    
    # Создаем словарь для быстрого поиска количества отчетов
    counts_dict = {tc[0]: tc[1] for tc in template_counts}
    
    # Фильтруем по доступу
    if "admin" not in current_user.roles:
        # Показываем только те шаблоны, к которым есть доступ
        accessible_templates = []
        
        for template in templates:
            if (check_template_access(template, current_user, "create_report") or 
                check_template_access(template, current_user, "view_reports") or
                template.created_by_id == current_user.id):
                accessible_templates.append(template)
        
        templates = accessible_templates
    
    result = []
    for template in templates:
        reports_count = counts_dict.get(template.id, 0)
        
        template_item = ReportTemplateList(
            id=template.id,
            name=template.name,
            description=template.description,
            fields=template.fields,
            is_active=template.is_active,
            allowed_roles=template.allowed_roles,
            created_by_id=template.created_by_id,
            created_at=template.created_at,
            creator_name=f"{template.creator.first_name} {template.creator.last_name}",
            reports_count=reports_count
        )
        result.append(template_item)
    
    return result

@router.get("/{template_id}", response_model=ReportTemplateResponse)
async def get_report_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить шаблон отчета по ID"""
    
    template = db.query(ReportTemplate).options(
        joinedload(ReportTemplate.creator)
    ).filter(ReportTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Шаблон отчета не найден"
        )
    
    # Проверяем доступ
    if not check_template_access(template, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра этого шаблона"
        )
    
    reports_count = db.query(func.count(Report.id)).filter(
        Report.template_id == template_id
    ).scalar()
    
    result = ReportTemplateResponse.from_orm(template)
    result.creator_name = f"{template.creator.first_name} {template.creator.last_name}"
    result.reports_count = reports_count
    
    return result

@router.put("/{template_id}", response_model=ReportTemplateResponse)
async def update_report_template(
    template_id: int,
    template_data: ReportTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Обновить шаблон отчета"""
    
    template = db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Шаблон отчета не найден"
        )
    
    # Только админы и создатель могут редактировать
    if "admin" not in current_user.roles and template.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для редактирования этого шаблона"
        )
    
    # Обновляем поля
    update_data = template_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    
    db.commit()
    db.refresh(template)
    
    # Загружаем с информацией о создателе
    template_with_creator = db.query(ReportTemplate).options(
        joinedload(ReportTemplate.creator)
    ).filter(ReportTemplate.id == template.id).first()
    
    reports_count = db.query(func.count(Report.id)).filter(
        Report.template_id == template_id
    ).scalar()
    
    result = ReportTemplateResponse.from_orm(template_with_creator)
    result.creator_name = f"{template_with_creator.creator.first_name} {template_with_creator.creator.last_name}"
    result.reports_count = reports_count
    
    return result

@router.delete("/{template_id}")
async def delete_report_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Удалить шаблон отчета"""
    
    template = db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Шаблон отчета не найден"
        )
    
    # Только админы и создатель могут удалять
    if "admin" not in current_user.roles and template.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для удаления этого шаблона"
        )
    
    # Проверяем, есть ли отчеты по этому шаблону
    reports_count = db.query(func.count(Report.id)).filter(
        Report.template_id == template_id
    ).scalar()
    
    if reports_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Нельзя удалить шаблон, по которому создано {reports_count} отчетов"
        )
    
    db.delete(template)
    db.commit()
    
    return {"message": "Шаблон отчета удален"}

@router.get("/{template_id}/accessible")
async def check_template_access_endpoint(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Проверить доступ к шаблону отчета"""
    
    template = db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Шаблон отчета не найден"
        )
    
    return {
        "can_create_report": check_template_access(template, current_user, "create_report"),
        "can_view_reports": check_template_access(template, current_user, "view_reports"),
        "can_edit_template": ("admin" in current_user.roles or template.created_by_id == current_user.id)
    } 