from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List, Optional

from ..database import get_db
from ..models import Report, ReportTemplate, User, UserProfile, Department, Role
from ..models.user_assignment import UserDepartmentAssignment
from ..schemas.report import (
    ReportCreate,
    ReportUpdate,
    ReportResponse,
    ReportList
)
from ..dependencies import get_current_user, UserInfo
from ..services.activity_service import ActivityService

router = APIRouter(prefix="/reports", tags=["Reports"])

def get_user_department_info(user_id: int, db: Session) -> dict:
    """Получить информацию о подразделении и должности пользователя"""
    
    # Получаем последнее активное назначение
    assignment = db.query(UserDepartmentAssignment).options(
        joinedload(UserDepartmentAssignment.department),
        joinedload(UserDepartmentAssignment.role)
    ).filter(
        UserDepartmentAssignment.user_id == user_id,
        UserDepartmentAssignment.end_date.is_(None)
    ).order_by(desc(UserDepartmentAssignment.assignment_date)).first()
    
    if assignment and assignment.department:
        return {
            "department": assignment.department.name,
            "position": assignment.role.display_name if assignment.role else "Не указана"
        }
    
    return {
        "department": None,
        "position": None
    }

def check_report_access(template: ReportTemplate, current_user: UserInfo, action: str = "view") -> bool:
    """Проверка доступа к отчетам по шаблону"""
    
    # Админы имеют полный доступ
    if "admin" in current_user.roles:
        return True
    
    # Создатель шаблона имеет полный доступ
    if template.created_by_id == current_user.id:
        return True
    
    if action == "create":
        # Проверяем разрешенные роли для создания отчетов
        if template.allowed_roles:
            return any(role in current_user.roles for role in template.allowed_roles)
        return False
    
    if action == "view":
        # Проверяем права на просмотр отчетов
        if template.viewers:
            for viewer in template.viewers:
                if viewer.get("type") == "role" and viewer.get("value") in current_user.roles:
                    return True
                if viewer.get("type") == "user" and viewer.get("value") == current_user.id:
                    return True
        return False
    
    return False

@router.post("/", response_model=ReportResponse)
async def create_report(
    report_data: ReportCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Создать новый отчет"""
    
    # Проверяем существование шаблона
    template = db.query(ReportTemplate).filter(
        ReportTemplate.id == report_data.template_id,
        ReportTemplate.is_active == True
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Шаблон отчета не найден или неактивен"
        )
    
    # Проверяем права на создание отчета
    if not check_report_access(template, current_user, "create"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для создания отчета по этому шаблону"
        )
    
    # Создаем отчет
    report = Report(
        **report_data.dict(),
        submitted_by_id=current_user.id
    )
    
    db.add(report)
    db.commit()
    db.refresh(report)
    
    # Логирование создания отчета
    activity_service = ActivityService(db)
    activity_service.log_activity(
        action="report_generate",
        description=f"Создан отчет по шаблону: {template.name}",
        user_id=current_user.id,
        resource_type="report",
        resource_id=str(report.id),
        details={
            "template_name": template.name,
            "template_id": template.id,
            "status": report.status
        },
        request=request
    )
    
    # Загружаем с дополнительной информацией
    report_with_data = db.query(Report).options(
        joinedload(Report.template),
        joinedload(Report.submitted_by)
    ).filter(Report.id == report.id).first()
    
    # Получаем информацию о подразделении
    dept_info = get_user_department_info(current_user.id, db)
    
    result = ReportResponse.from_orm(report_with_data)
    result.submitter_name = f"{report_with_data.submitted_by.first_name} {report_with_data.submitted_by.last_name}"
    result.submitter_email = report_with_data.submitted_by.email
    result.submitter_department = dept_info["department"]
    result.submitter_position = dept_info["position"]
    result.template_name = report_with_data.template.name
    
    return result

@router.get("/", response_model=List[ReportList])
async def get_reports(
    template_id: Optional[int] = Query(None, description="Фильтр по шаблону"),
    status: Optional[str] = Query(None, description="Фильтр по статусу"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить список отчетов"""
    
    # Базовый запрос
    query = db.query(Report).options(
        joinedload(Report.template),
        joinedload(Report.submitted_by)
    )
    
    # Фильтр по шаблону
    if template_id:
        query = query.filter(Report.template_id == template_id)
        
        # Проверяем доступ к конкретному шаблону
        template = db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()
        if not template or not check_report_access(template, current_user, "view"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для просмотра отчетов по этому шаблону"
            )
    else:
        # Если шаблон не указан, показываем отчеты только по доступным шаблонам
        if "admin" not in current_user.roles:
            accessible_template_ids = []
            templates = db.query(ReportTemplate).filter(ReportTemplate.is_active == True).all()
            
            for template in templates:
                if check_report_access(template, current_user, "view"):
                    accessible_template_ids.append(template.id)
            
            if not accessible_template_ids:
                return []
            
            query = query.filter(Report.template_id.in_(accessible_template_ids))
    
    # Фильтр по статусу
    if status:
        query = query.filter(Report.status == status)
    
    # Сортировка по дате создания (новые сначала)
    query = query.order_by(desc(Report.submitted_at))
    
    # Пагинация
    total = query.count()
    offset = (page - 1) * size
    reports = query.offset(offset).limit(size).all()
    
    # Формируем результат
    result = []
    for report in reports:
        # Получаем информацию о подразделении
        dept_info = get_user_department_info(report.submitted_by_id, db)
        
        report_item = ReportList(
            id=report.id,
            template_id=report.template_id,
            template_name=report.template.name,
            submitted_by_id=report.submitted_by_id,
            submitted_at=report.submitted_at,
            submitter_name=f"{report.submitted_by.first_name} {report.submitted_by.last_name}",
            submitter_email=report.submitted_by.email,
            submitter_department=dept_info["department"],
            submitter_position=dept_info["position"],
            has_notes=bool(report.notes),
            status=report.status,
            data=report.data
        )
        result.append(report_item)
    
    return result

@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить отчет по ID"""
    
    report = db.query(Report).options(
        joinedload(Report.template),
        joinedload(Report.submitted_by)
    ).filter(Report.id == report_id).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Отчет не найден"
        )
    
    # Проверяем доступ к шаблону
    if not check_report_access(report.template, current_user, "view"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра этого отчета"
        )
    
    # Получаем информацию о подразделении
    dept_info = get_user_department_info(report.submitted_by_id, db)
    
    result = ReportResponse.from_orm(report)
    result.submitter_name = f"{report.submitted_by.first_name} {report.submitted_by.last_name}"
    result.submitter_email = report.submitted_by.email
    result.submitter_department = dept_info["department"]
    result.submitter_position = dept_info["position"]
    result.template_name = report.template.name
    
    return result

@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: int,
    report_data: ReportUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Обновить отчет"""
    
    report = db.query(Report).options(
        joinedload(Report.template),
        joinedload(Report.submitted_by)
    ).filter(Report.id == report_id).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Отчет не найден"
        )
    
    # Только автор отчета или админ могут редактировать
    if report.submitted_by_id != current_user.id and "admin" not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для редактирования этого отчета"
        )
    
    # Обновляем поля
    update_data = report_data.dict(exclude_unset=True)
    old_status = report.status
    
    for field, value in update_data.items():
        setattr(report, field, value)
    
    db.commit()
    db.refresh(report)
    
    # Логирование обновления отчета
    activity_service = ActivityService(db)
    activity_service.log_activity(
        action="report_update",
        description=f"Обновлен отчет: {report.template.name}",
        user_id=current_user.id,
        resource_type="report",
        resource_id=str(report.id),
        details={
            "template_name": report.template.name,
            "old_status": old_status,
            "new_status": report.status,
            "updated_fields": list(update_data.keys())
        },
        request=request
    )
    
    # Получаем информацию о подразделении
    dept_info = get_user_department_info(report.submitted_by_id, db)
    
    result = ReportResponse.from_orm(report)
    result.submitter_name = f"{report.submitted_by.first_name} {report.submitted_by.last_name}"
    result.submitter_email = report.submitted_by.email
    result.submitter_department = dept_info["department"]
    result.submitter_position = dept_info["position"]
    result.template_name = report.template.name
    
    return result

@router.delete("/{report_id}")
async def delete_report(
    report_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Удалить отчет"""
    
    report = db.query(Report).options(
        joinedload(Report.template)
    ).filter(Report.id == report_id).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Отчет не найден"
        )
    
    # Только автор отчета или админ могут удалять
    if report.submitted_by_id != current_user.id and "admin" not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для удаления этого отчета"
        )
    
    # Сохраняем данные для логирования перед удалением
    template_name = report.template.name if report.template else "Неизвестный шаблон"
    
    db.delete(report)
    db.commit()
    
    # Логирование удаления отчета
    activity_service = ActivityService(db)
    activity_service.log_activity(
        action="report_delete",
        description=f"Удален отчет: {template_name}",
        user_id=current_user.id,
        resource_type="report",
        resource_id=str(report_id),
        details={
            "template_name": template_name,
            "status": report.status
        },
        request=request
    )
    
    return {"message": "Отчет удален"}

@router.get("/template/{template_id}/stats")
async def get_template_stats(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить статистику по шаблону отчета"""
    
    template = db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Шаблон отчета не найден"
        )
    
    # Проверяем доступ
    if not check_report_access(template, current_user, "view"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра статистики по этому шаблону"
        )
    
    # Подсчитываем статистику
    total_reports = db.query(func.count(Report.id)).filter(
        Report.template_id == template_id
    ).scalar()
    
    # Отчеты за последние 30 дней
    from datetime import datetime, timedelta
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    recent_reports = db.query(func.count(Report.id)).filter(
        Report.template_id == template_id,
        Report.submitted_at >= thirty_days_ago
    ).scalar()
    
    return {
        "template_id": template_id,
        "template_name": template.name,
        "total_reports": total_reports,
        "recent_reports": recent_reports
    } 