from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from ..database import get_db
from ..dependencies import get_current_user, require_admin
from ..models.user import User
from ..schemas.activity_log import (
    ActivityLogFilter, ActivityLogListResponse, ActivityLogResponse
)
from ..services.activity_service import ActivityService

router = APIRouter()

@router.get("/", response_model=ActivityLogListResponse)
async def get_activity_logs(
    user_id: Optional[int] = Query(None, description="ID пользователя для фильтрации"),
    action: Optional[str] = Query(None, description="Тип действия для фильтрации"),
    resource_type: Optional[str] = Query(None, description="Тип ресурса для фильтрации"),
    resource_id: Optional[str] = Query(None, description="ID ресурса для фильтрации"),
    start_date: Optional[datetime] = Query(None, description="Начальная дата для фильтрации"),
    end_date: Optional[datetime] = Query(None, description="Конечная дата для фильтрации"),
    page: int = Query(1, ge=1, description="Номер страницы"),
    size: int = Query(50, ge=1, le=1000, description="Размер страницы"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Получить журнал активности с фильтрацией и пагинацией.
    Доступно только администраторам.
    """
    activity_service = ActivityService(db)
    
    filters = ActivityLogFilter(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        start_date=start_date,
        end_date=end_date,
        page=page,
        size=size
    )
    
    return activity_service.get_activity_logs(filters)

@router.get("/user/{user_id}", response_model=List[ActivityLogResponse])
async def get_user_activity_logs(
    user_id: int,
    limit: int = Query(100, ge=1, le=1000, description="Максимальное количество записей"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Получить последние действия конкретного пользователя.
    Доступно только администраторам.
    """
    activity_service = ActivityService(db)
    return activity_service.get_user_activities(user_id, limit)

@router.get("/my", response_model=List[ActivityLogResponse])
async def get_my_activity_logs(
    limit: int = Query(100, ge=1, le=500, description="Максимальное количество записей"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить свои последние действия.
    Доступно любому авторизованному пользователю.
    """
    activity_service = ActivityService(db)
    return activity_service.get_user_activities(current_user.id, limit)

@router.get("/stats")
async def get_activity_stats(
    days: int = Query(30, ge=1, le=365, description="Количество дней для статистики"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Получить статистику активности за указанный период.
    Доступно только администраторам.
    """
    activity_service = ActivityService(db)
    return activity_service.get_activity_stats(days)

@router.get("/actions")
async def get_available_actions(
    current_user: User = Depends(require_admin)
):
    """
    Получить список доступных типов действий для фильтрации.
    Доступно только администраторам.
    """
    from ..models.activity_log import ActionType
    
    actions = [
        {"value": action.value, "label": action.value.replace("_", " ").title()}
        for action in ActionType
    ]
    
    return {"actions": actions}

@router.get("/resource-types")
async def get_resource_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Получить список типов ресурсов, которые есть в журнале.
    Доступно только администраторам.
    """
    from sqlalchemy import distinct
    from ..models.activity_log import ActivityLog
    
    resource_types = db.query(distinct(ActivityLog.resource_type)).filter(
        ActivityLog.resource_type.isnot(None)
    ).all()
    
    types = [{"value": rt[0], "label": rt[0]} for rt in resource_types if rt[0]]
    
    return {"resource_types": types} 