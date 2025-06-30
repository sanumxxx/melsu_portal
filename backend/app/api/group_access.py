from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, text
from typing import List, Optional
from datetime import datetime, date

from ..database import get_db
from ..models import Department, User, UserProfile, Group
from ..models.user_assignment import UserDepartmentAssignment
from ..dependencies import get_current_user, UserInfo

router = APIRouter(prefix="/group-access", tags=["Group Access"])

@router.get("/my-groups")
async def get_my_accessible_groups(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    faculty_filter: Optional[str] = Query(None),
    department_filter: Optional[str] = Query(None),
    course_filter: Optional[int] = Query(None),
    education_level_filter: Optional[str] = Query(None),
    education_form_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить список групп, к которым у текущего пользователя есть доступ"""
    
    today = date.today()
    
    # Получаем активные назначения пользователя в подразделения
    user_assignments = db.query(UserDepartmentAssignment).filter(
        UserDepartmentAssignment.user_id == current_user.id
    ).filter(
        # Назначение активно, если end_date is None или end_date >= today
        (UserDepartmentAssignment.end_date.is_(None)) | 
        (UserDepartmentAssignment.end_date >= today)
    ).all()
    
    if not user_assignments:
        return {
            "groups": [],
            "total": 0,
            "page": page,
            "size": size,
            "departments": []
        }
    
    # Получаем ID подразделений, к которым есть доступ
    department_ids = [assignment.department_id for assignment in user_assignments]
    
    # Получаем информацию о подразделениях
    departments = db.query(Department).filter(Department.id.in_(department_ids)).all()
    
    # Расширяем список доступных подразделений с учетом иерархии
    accessible_department_ids = set(department_ids)
    
    for dept in departments:
        if dept.department_type == 'faculty':
            # Добавляем все кафедры этого факультета
            child_departments = db.query(Department).filter(
                Department.parent_id == dept.id,
                Department.department_type == 'department',
                Department.is_active == True
            ).all()
            for child in child_departments:
                accessible_department_ids.add(child.id)
        elif dept.department_type == 'department':
            # Добавляем факультет этой кафедры
            if dept.parent_id:
                accessible_department_ids.add(dept.parent_id)
    
    # Базовый запрос групп
    groups_query = db.query(Group).options(
        joinedload(Group.department)
    ).filter(
        Group.department_id.in_(list(accessible_department_ids))
    )
    
    # Применяем дополнительные фильтры
    if search:
        search_filter = or_(
            Group.name.ilike(f"%{search}%"),
            Group.specialization.ilike(f"%{search}%")
        )
        groups_query = groups_query.filter(search_filter)
    
    if faculty_filter:
        # Фильтр по факультету - находим кафедры этого факультета
        faculty_dept = db.query(Department).filter(
            Department.name == faculty_filter,
            Department.department_type == 'faculty'
        ).first()
        if faculty_dept:
            faculty_department_ids = [faculty_dept.id]
            child_depts = db.query(Department).filter(
                Department.parent_id == faculty_dept.id
            ).all()
            faculty_department_ids.extend([child.id for child in child_depts])
            groups_query = groups_query.filter(Group.department_id.in_(faculty_department_ids))
    
    if department_filter:
        # Фильтр по кафедре
        dept = db.query(Department).filter(
            Department.name == department_filter,
            Department.department_type == 'department'
        ).first()
        if dept:
            groups_query = groups_query.filter(Group.department_id == dept.id)
    
    if course_filter:
        # Фильтр по курсу - используем вычисляемое свойство
        # Поскольку это property, фильтруем после получения данных
        pass  # Будем фильтровать после запроса
    
    if education_level_filter:
        # Фильтр по уровню образования - также используем вычисляемое свойство
        pass  # Будем фильтровать после запроса
    
    if education_form_filter:
        # Фильтр по форме обучения - также используем вычисляемое свойство
        pass  # Будем фильтровать после запроса
    
    # Получаем группы
    all_groups = groups_query.all()
    
    # Применяем фильтры по вычисляемым свойствам
    filtered_groups = []
    for group in all_groups:
        # Фильтр по курсу
        if course_filter and group.course != course_filter:
            continue
        
        # Фильтр по уровню образования
        if education_level_filter and group.parsed_education_level != education_level_filter:
            continue
        
        # Фильтр по форме обучения
        if education_form_filter and group.parsed_education_form != education_form_filter:
            continue
        
        filtered_groups.append(group)
    
    # Пагинация
    total = len(filtered_groups)
    offset = (page - 1) * size
    paginated_groups = filtered_groups[offset:offset + size]
    
    # Получаем информацию о факультетах для каждой группы
    result_groups = []
    for group in paginated_groups:
        department = group.department
        faculty_name = None
        
        if department:
            if department.department_type == 'faculty':
                faculty_name = department.name
            elif department.parent:
                faculty_name = department.parent.name
        
        result_groups.append({
            "id": group.id,
            "name": group.name,
            "specialization": group.specialization,
            "department_id": group.department_id,
            "department_name": department.name if department else None,
            "faculty_name": faculty_name,
            "course": group.course,
            "admission_year": group.parsed_year,
            "education_level": group.parsed_education_level,
            "education_form": group.parsed_education_form,
            "created_at": group.created_at.isoformat() if group.created_at else None,
            "updated_at": group.updated_at.isoformat() if group.updated_at else None
        })
    
    return {
        "groups": result_groups,
        "total": total,
        "page": page,
        "size": size,
        "departments": [
            {
                "id": dept.id,
                "name": dept.name,
                "department_type": dept.department_type,
                "access_level": "write",
                "accessible_child_departments": [
                    child.name for child in db.query(Department).filter(
                        Department.parent_id == dept.id,
                        Department.is_active == True
                    ).all()
                ] if dept.department_type == 'faculty' else []
            }
            for dept in departments
        ]
    }

@router.get("/check-access/{group_id}")
async def check_group_access(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Проверить доступ к конкретной группе"""
    
    # Получаем группу
    group = db.query(Group).options(joinedload(Group.department)).filter(
        Group.id == group_id
    ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    
    today = date.today()
    
    # Получаем назначения пользователя
    user_assignments = db.query(UserDepartmentAssignment).filter(
        UserDepartmentAssignment.user_id == current_user.id
    ).filter(
        (UserDepartmentAssignment.end_date.is_(None)) | 
        (UserDepartmentAssignment.end_date >= today)
    ).all()
    
    if not user_assignments:
        return {"has_access": False, "access_level": None}
    
    # Проверяем доступ к группе
    department_ids = [assignment.department_id for assignment in user_assignments]
    
    # Прямое совпадение подразделения
    if group.department_id in department_ids:
        return {"has_access": True, "access_level": "write", "group": {
            "id": group.id,
            "name": group.name,
            "department_name": group.department.name if group.department else None,
            "specialization": group.specialization
        }}
    
    # Проверяем через иерархию (если есть доступ к факультету)
    if group.department and group.department.parent_id in department_ids:
        return {"has_access": True, "access_level": "write", "group": {
            "id": group.id,
            "name": group.name,
            "department_name": group.department.name if group.department else None,
            "specialization": group.specialization
        }}
    
    return {"has_access": False, "access_level": None} 