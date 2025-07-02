from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import date

from ..dependencies import get_db, get_current_user, require_admin
from ..models import User, UserDepartmentAssignment, Department, Role
from ..schemas.assignment import (
    AssignmentCreate, AssignmentUpdate, AssignmentResponse, 
    UserAssignmentsResponse, DepartmentAssignmentsResponse,
    BulkAssignmentCreate, BulkAssignmentResponse, AssignmentStats,
    UserInfo, DepartmentInfo, RoleInfo
)

router = APIRouter(prefix="/assignments", tags=["assignments"])

def convert_assignment_to_response(assignment: UserDepartmentAssignment) -> AssignmentResponse:
    """Конвертирует SQLAlchemy модель назначения в Pydantic схему"""
    # Создаем DepartmentInfo
    department_info = DepartmentInfo(
        id=assignment.department.id,
        name=assignment.department.name,
        short_name=assignment.department.short_name,
        department_type=assignment.department.department_type
    )
    
    # Создаем RoleInfo
    role_info = RoleInfo(
        id=assignment.role.id,
        name=assignment.role.name,
        display_name=assignment.role.display_name
    )
    
    # Создаем UserInfo для created_by_user если есть
    created_by_user_info = None
    if assignment.created_by_user:
        created_by_user_info = UserInfo(
            id=assignment.created_by_user.id,
            first_name=assignment.created_by_user.first_name,
            last_name=assignment.created_by_user.last_name,
            middle_name=assignment.created_by_user.middle_name,
            email=assignment.created_by_user.email,
            roles=assignment.created_by_user.roles or [],
            is_active=assignment.created_by_user.is_active,
            is_verified=assignment.created_by_user.is_verified
        )
    
    # Создаем и возвращаем AssignmentResponse
    return AssignmentResponse(
        id=assignment.id,
        user_id=assignment.user_id,
        department_id=assignment.department_id,
        role_id=assignment.role_id,
        is_primary=assignment.is_primary,
        assignment_date=assignment.assignment_date,
        end_date=assignment.end_date,
        assignment_type=assignment.assignment_type,
        workload_percentage=assignment.workload_percentage,
        notes=assignment.notes,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
        created_by=assignment.created_by,
        department=department_info,
        role=role_info,
        created_by_user=created_by_user_info,
        is_active=assignment.is_active,
        assignment_type_display=assignment.assignment_type_display
    )

@router.post("/users/{user_id}", response_model=AssignmentResponse)
async def create_assignment(
    user_id: int,
    assignment_data: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Создать новое назначение пользователя"""
    
    # Проверяем существование пользователя
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Проверяем существование подразделения
    department = db.query(Department).filter(Department.id == assignment_data.department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Подразделение не найдено")
    
    # Проверяем существование роли
    role = db.query(Role).filter(Role.id == assignment_data.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Роль не найдена")
    
    # Проверяем уникальность (один пользователь не может иметь одну роль в одном подразделении дважды)
    existing = db.query(UserDepartmentAssignment).filter(
        and_(
            UserDepartmentAssignment.user_id == user_id,
            UserDepartmentAssignment.department_id == assignment_data.department_id,
            UserDepartmentAssignment.role_id == assignment_data.role_id,
            or_(
                UserDepartmentAssignment.end_date.is_(None),
                UserDepartmentAssignment.end_date > date.today()
            )
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Пользователь уже имеет эту роль в данном подразделении"
        )
    
    # Если назначение основное, снимаем флаг с других назначений пользователя
    if assignment_data.is_primary:
        db.query(UserDepartmentAssignment).filter(
            and_(
                UserDepartmentAssignment.user_id == user_id,
                UserDepartmentAssignment.is_primary == True
            )
        ).update({"is_primary": False})
    
    # Создаем назначение
    assignment = UserDepartmentAssignment(
        user_id=user_id,
        created_by=current_user.id,
        **assignment_data.dict()
    )
    
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    # Загружаем связанные объекты
    assignment = db.query(UserDepartmentAssignment).options(
        selectinload(UserDepartmentAssignment.department),
        selectinload(UserDepartmentAssignment.role),
        selectinload(UserDepartmentAssignment.created_by_user)
    ).filter(UserDepartmentAssignment.id == assignment.id).first()
    
    return convert_assignment_to_response(assignment)

@router.get("/users/{user_id}", response_model=UserAssignmentsResponse)
async def get_user_assignments(
    user_id: int,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить все назначения пользователя"""
    
    # Проверяем права доступа (админ или сам пользователь)
    if current_user.id != user_id and 'admin' not in current_user.roles:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    # Проверяем существование пользователя
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Формируем запрос
    query = db.query(UserDepartmentAssignment).options(
        selectinload(UserDepartmentAssignment.department),
        selectinload(UserDepartmentAssignment.role),
        selectinload(UserDepartmentAssignment.created_by_user)
    ).filter(UserDepartmentAssignment.user_id == user_id)
    
    # Фильтруем по активности
    if not include_inactive:
        query = query.filter(
            or_(
                UserDepartmentAssignment.end_date.is_(None),
                UserDepartmentAssignment.end_date > date.today()
            )
        )
    
    assignments = query.order_by(UserDepartmentAssignment.is_primary.desc(), UserDepartmentAssignment.created_at.desc()).all()
    
    # Конвертируем SQLAlchemy объекты в Pydantic схемы
    assignment_responses = []
    primary_assignment = None
    
    for assignment in assignments:
        assignment_response = convert_assignment_to_response(assignment)
        assignment_responses.append(assignment_response)
        
        # Находим основное назначение
        if assignment.is_primary and assignment.is_active:
            primary_assignment = assignment_response
    
    # Преобразуем User в UserInfo
    user_info = UserInfo(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        middle_name=user.middle_name,
        email=user.email,
        roles=user.roles or [],
        is_active=user.is_active,
        is_verified=user.is_verified
    )
    
    return UserAssignmentsResponse(
        user_id=user_id,
        user=user_info,
        assignments=assignment_responses,
        primary_assignment=primary_assignment
    )

@router.get("/departments/{department_id}", response_model=DepartmentAssignmentsResponse)
async def get_department_assignments(
    department_id: int,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить все назначения подразделения"""
    
    # Проверяем существование подразделения
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Подразделение не найдено")
    
    # Формируем запрос
    query = db.query(UserDepartmentAssignment).options(
        selectinload(UserDepartmentAssignment.user),
        selectinload(UserDepartmentAssignment.role),
        selectinload(UserDepartmentAssignment.created_by_user)
    ).filter(UserDepartmentAssignment.department_id == department_id)
    
    # Фильтруем по активности
    if not include_inactive:
        query = query.filter(
            or_(
                UserDepartmentAssignment.end_date.is_(None),
                UserDepartmentAssignment.end_date > date.today()
            )
        )
    
    assignments = query.order_by(UserDepartmentAssignment.is_primary.desc(), UserDepartmentAssignment.created_at.desc()).all()
    
    return DepartmentAssignmentsResponse(
        department_id=department_id,
        department=department,
        assignments=assignments
    )

@router.put("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: int,
    assignment_data: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Обновить назначение"""
    
    assignment = db.query(UserDepartmentAssignment).filter(UserDepartmentAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Назначение не найдено")
    
    # Если устанавливаем как основное, снимаем флаг с других назначений пользователя
    if assignment_data.is_primary:
        db.query(UserDepartmentAssignment).filter(
            and_(
                UserDepartmentAssignment.user_id == assignment.user_id,
                UserDepartmentAssignment.is_primary == True,
                UserDepartmentAssignment.id != assignment_id
            )
        ).update({"is_primary": False})
    
    # Обновляем назначение
    update_data = assignment_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(assignment, field, value)
    
    assignment.updated_at = func.now()
    db.commit()
    db.refresh(assignment)
    
    # Загружаем связанные объекты
    assignment = db.query(UserDepartmentAssignment).options(
        selectinload(UserDepartmentAssignment.department),
        selectinload(UserDepartmentAssignment.role),
        selectinload(UserDepartmentAssignment.user),
        selectinload(UserDepartmentAssignment.created_by_user)
    ).filter(UserDepartmentAssignment.id == assignment_id).first()
    
    return convert_assignment_to_response(assignment)

@router.delete("/{assignment_id}")
async def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Удалить назначение"""
    
    assignment = db.query(UserDepartmentAssignment).filter(UserDepartmentAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Назначение не найдено")
    
    db.delete(assignment)
    db.commit()
    
    return {"message": "Назначение удалено"}

@router.put("/{assignment_id}/primary")
async def set_primary_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Сделать назначение основным"""
    
    assignment = db.query(UserDepartmentAssignment).filter(UserDepartmentAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Назначение не найдено")
    
    if not assignment.is_active:
        raise HTTPException(status_code=400, detail="Нельзя сделать неактивное назначение основным")
    
    # Снимаем флаг основного с других назначений пользователя
    db.query(UserDepartmentAssignment).filter(
        and_(
            UserDepartmentAssignment.user_id == assignment.user_id,
            UserDepartmentAssignment.is_primary == True
        )
    ).update({"is_primary": False})
    
    # Устанавливаем как основное
    assignment.is_primary = True
    assignment.updated_at = func.now()
    db.commit()
    
    return {"message": "Назначение установлено как основное"}

@router.post("/bulk", response_model=BulkAssignmentResponse)
async def bulk_create_assignments(
    bulk_data: BulkAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Массовое создание назначений"""
    
    created_assignments = []
    errors = []
    
    # Проверяем существование подразделения и роли
    department = db.query(Department).filter(Department.id == bulk_data.department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Подразделение не найдено")
    
    role = db.query(Role).filter(Role.id == bulk_data.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Роль не найдена")
    
    for user_id in bulk_data.user_ids:
        try:
            # Проверяем существование пользователя
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                errors.append(f"Пользователь {user_id} не найден")
                continue
            
            # Проверяем уникальность
            existing = db.query(UserDepartmentAssignment).filter(
                and_(
                    UserDepartmentAssignment.user_id == user_id,
                    UserDepartmentAssignment.department_id == bulk_data.department_id,
                    UserDepartmentAssignment.role_id == bulk_data.role_id,
                    or_(
                        UserDepartmentAssignment.end_date.is_(None),
                        UserDepartmentAssignment.end_date > date.today()
                    )
                )
            ).first()
            
            if existing:
                errors.append(f"Пользователь {user_id} уже имеет эту роль в подразделении")
                continue
            
            # Создаем назначение
            assignment = UserDepartmentAssignment(
                user_id=user_id,
                department_id=bulk_data.department_id,
                role_id=bulk_data.role_id,
                assignment_type=bulk_data.assignment_type,
                workload_percentage=bulk_data.workload_percentage,
                assignment_date=bulk_data.assignment_date,
                end_date=bulk_data.end_date,
                notes=bulk_data.notes,
                created_by=current_user.id
            )
            
            db.add(assignment)
            db.flush()  # Получаем ID без commit
            
            # Загружаем связанные объекты
            assignment = db.query(UserDepartmentAssignment).options(
                selectinload(UserDepartmentAssignment.department),
                selectinload(UserDepartmentAssignment.role),
                selectinload(UserDepartmentAssignment.user)
            ).filter(UserDepartmentAssignment.id == assignment.id).first()
            
            created_assignments.append(assignment)
            
        except Exception as e:
            errors.append(f"Ошибка для пользователя {user_id}: {str(e)}")
    
    db.commit()
    
    return BulkAssignmentResponse(
        created_count=len(created_assignments),
        failed_count=len(errors),
        created_assignments=created_assignments,
        errors=errors
    )

@router.get("/stats", response_model=AssignmentStats)
async def get_assignment_stats(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить статистику по назначениям"""
    
    # Базовый запрос
    query = db.query(UserDepartmentAssignment)
    
    # Фильтр по подразделению
    if department_id:
        query = query.filter(UserDepartmentAssignment.department_id == department_id)
    
    # Общая статистика
    total_assignments = query.count()
    active_assignments = query.filter(
        or_(
            UserDepartmentAssignment.end_date.is_(None),
            UserDepartmentAssignment.end_date > date.today()
        )
    ).count()
    primary_assignments = query.filter(UserDepartmentAssignment.is_primary == True).count()
    
    # Статистика по типам
    type_stats = {}
    for assignment_type in ['permanent', 'temporary', 'acting']:
        count = query.filter(UserDepartmentAssignment.assignment_type == assignment_type).count()
        type_stats[assignment_type] = count
    
    # Статистика по подразделениям (если не фильтруем по конкретному)
    dept_stats = {}
    if not department_id:
        dept_results = db.query(
            Department.name,
            func.count(UserDepartmentAssignment.id).label('count')
        ).join(UserDepartmentAssignment).group_by(Department.name).all()
        
        dept_stats = {name: count for name, count in dept_results}
    
    return AssignmentStats(
        total_assignments=total_assignments,
        active_assignments=active_assignments,
        primary_assignments=primary_assignments,
        by_type=type_stats,
        by_department=dept_stats
    ) 