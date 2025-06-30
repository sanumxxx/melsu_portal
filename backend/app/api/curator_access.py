from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, text
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel

from ..database import get_db
from ..models import Department, User, UserProfile, Group, Role
from ..models.user_assignment import UserDepartmentAssignment
from ..dependencies import get_current_user, UserInfo

router = APIRouter(prefix="/curator-access", tags=["Curator Access"])

class CuratorAssignmentRequest(BaseModel):
    curator_id: int
    group_ids: List[int] = []
    department_ids: List[int] = []
    access_level: str = "read"  # read, write, full
    notes: Optional[str] = None
    expires_at: Optional[datetime] = None

class CuratorAssignmentResponse(BaseModel):
    id: int
    curator_id: int
    curator_name: str
    groups: List[dict] = []
    departments: List[dict] = []
    access_level: str
    notes: Optional[str] = None
    assigned_by: int
    assigned_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool

@router.post("/assign-curator")
async def assign_curator_to_groups(
    request: CuratorAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Назначить куратора для групп или подразделений"""
    
    # Проверяем права доступа (только админы могут назначать кураторов)
    if not current_user.roles or 'admin' not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для назначения кураторов"
        )
    
    # Проверяем существование куратора
    curator = db.query(User).filter(User.id == request.curator_id).first()
    if not curator:
        raise HTTPException(status_code=404, detail="Куратор не найден")
    
    # Добавляем роль куратора, если её нет
    curator_roles = curator.roles or []
    if 'curator' not in curator_roles:
        curator_roles.append('curator')
        curator.roles = curator_roles
        db.commit()
    
    # Получаем роль куратора
    curator_role = db.query(Role).filter(Role.name == 'curator').first()
    if not curator_role:
        raise HTTPException(status_code=500, detail="Роль куратора не найдена в системе")
    
    # Создаем назначения для групп
    assignments = []
    
    # Назначения по группам
    for group_id in request.group_ids:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            continue
            
        # Создаем назначение к подразделению группы
        assignment = UserDepartmentAssignment(
            user_id=request.curator_id,
            department_id=group.department_id,
            role_id=curator_role.id,
            assignment_type='curator',
            notes=f"Куратор группы {group.name}. {request.notes or ''}".strip(),
            created_by=current_user.id
        )
        db.add(assignment)
        assignments.append(assignment)
    
    # Назначения по подразделениям
    for dept_id in request.department_ids:
        dept = db.query(Department).filter(Department.id == dept_id).first()
        if not dept:
            continue
            
        assignment = UserDepartmentAssignment(
            user_id=request.curator_id,
            department_id=dept_id,
            role_id=curator_role.id,
            assignment_type='curator',
            notes=f"Куратор подразделения {dept.name}. {request.notes or ''}".strip(),
            created_by=current_user.id
        )
        db.add(assignment)
        assignments.append(assignment)
    
    db.commit()
    
    return {
        "message": "Куратор успешно назначен",
        "assignments_created": len(assignments),
        "curator": {
            "id": curator.id,
            "name": f"{curator.last_name} {curator.first_name} {curator.middle_name or ''}".strip(),
            "email": curator.email
        }
    }

@router.get("/curator-students/{curator_id}")
async def get_curator_students(
    curator_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    group_filter: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить список студентов, которыми может управлять куратор"""
    
    # Проверяем права доступа
    if (current_user.id != curator_id and 
        (not current_user.roles or 'admin' not in current_user.roles)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра студентов"
        )
    
    # Получаем подразделения, к которым куратор имеет доступ
    curator_assignments = db.query(UserDepartmentAssignment).filter(
        UserDepartmentAssignment.user_id == curator_id,
        UserDepartmentAssignment.assignment_type == 'curator'
    ).all()
    
    if not curator_assignments:
        return {
            "students": [],
            "total": 0,
            "page": page,
            "size": size,
            "groups": []
        }
    
    # Получаем ID подразделений
    department_ids = [assignment.department_id for assignment in curator_assignments]
    
    # Получаем группы в этих подразделениях
    groups_query = db.query(Group).filter(
        Group.department_id.in_(department_ids)
    )
    
    if group_filter:
        groups_query = groups_query.filter(Group.id == group_filter)
    
    groups = groups_query.all()
    group_ids = [group.id for group in groups]
    
    if not group_ids:
        return {
            "students": [],
            "total": 0,
            "page": page,
            "size": size,
            "groups": []
        }
    
    # Получаем студентов из этих групп
    students_query = db.query(User).join(UserProfile).filter(
        User._roles.like('%student%'),
        UserProfile.group_id.in_(group_ids)
    )
    
    # Применяем поиск
    if search:
        search_filter = or_(
            User.first_name.ilike(f"%{search}%"),
            User.last_name.ilike(f"%{search}%"),
            User.middle_name.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%"),
            UserProfile.student_id.ilike(f"%{search}%")
        )
        students_query = students_query.filter(search_filter)
    
    # Подсчитываем общее количество
    total = students_query.count()
    
    # Применяем пагинацию
    offset = (page - 1) * size
    students = students_query.offset(offset).limit(size).all()
    
    # Формируем результат
    result_students = []
    for student in students:
        profile = student.profile
        result_students.append({
            "id": student.id,
            "email": student.email,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "middle_name": student.middle_name,
            "birth_date": student.birth_date.isoformat() if student.birth_date else None,
            "student_id": profile.student_id if profile else None,
            "group_name": profile.group.name if profile and profile.group else None,
            "course": profile.course if profile else None,
            "phone": profile.phone if profile else None,
            "academic_status": profile.academic_status if profile else None,
            "created_at": student.created_at.isoformat() if student.created_at else None
        })
    
    return {
        "students": result_students,
        "total": total,
        "page": page,
        "size": size,
        "groups": [
            {
                "id": group.id,
                "name": group.name,
                "department_name": group.department.name if group.department else None
            }
            for group in groups
        ]
    }

@router.get("/my-curator-access")
async def get_my_curator_access(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить информацию о кураторских назначениях текущего пользователя"""
    
    # Проверяем, есть ли роль куратора
    if not current_user.roles or 'curator' not in current_user.roles:
        return {
            "is_curator": False,
            "assignments": [],
            "total_students": 0,
            "groups": []
        }
    
    # Получаем назначения куратора
    assignments = db.query(UserDepartmentAssignment).options(
        joinedload(UserDepartmentAssignment.department)
    ).filter(
        UserDepartmentAssignment.user_id == current_user.id,
        UserDepartmentAssignment.assignment_type == 'curator'
    ).all()
    
    # Получаем подразделения
    department_ids = [assignment.department_id for assignment in assignments]
    
    # Получаем группы
    groups = db.query(Group).filter(
        Group.department_id.in_(department_ids)
    ).all() if department_ids else []
    
    # Подсчитываем студентов
    total_students = 0
    if groups:
        group_ids = [group.id for group in groups]
        total_students = db.query(User).join(UserProfile).filter(
            User._roles.like('%student%'),
            UserProfile.group_id.in_(group_ids)
        ).count()
    
    return {
        "is_curator": True,
        "assignments": [
            {
                "id": assignment.id,
                "department_id": assignment.department_id,
                "department_name": assignment.department.name,
                "assignment_date": assignment.assignment_date.isoformat(),
                "notes": assignment.notes
            }
            for assignment in assignments
        ],
        "total_students": total_students,
        "groups": [
            {
                "id": group.id,
                "name": group.name,
                "department_name": group.department.name if group.department else None,
                "specialization": group.specialization
            }
            for group in groups
        ]
    }

@router.get("/curators")
async def get_all_curators(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить список всех кураторов (только для админов)"""
    
    if not current_user.roles or 'admin' not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав"
        )
    
    # Получаем всех пользователей с ролью куратора
    curators = db.query(User).filter(
        User._roles.like('%curator%'),
        User.is_active == True
    ).all()
    
    result = []
    for curator in curators:
        # Получаем назначения куратора
        assignments = db.query(UserDepartmentAssignment).options(
            joinedload(UserDepartmentAssignment.department)
        ).filter(
            UserDepartmentAssignment.user_id == curator.id,
            UserDepartmentAssignment.assignment_type == 'curator'
        ).all()
        
        # Получаем группы
        department_ids = [assignment.department_id for assignment in assignments]
        groups = db.query(Group).filter(
            Group.department_id.in_(department_ids)
        ).all() if department_ids else []
        
        result.append({
            "id": curator.id,
            "email": curator.email,
            "first_name": curator.first_name,
            "last_name": curator.last_name,
            "middle_name": curator.middle_name,
            "assignments": [
                {
                    "department_id": assignment.department_id,
                    "department_name": assignment.department.name,
                    "assignment_date": assignment.assignment_date.isoformat()
                }
                for assignment in assignments
            ],
            "groups_count": len(groups),
            "groups": [
                {
                    "id": group.id,
                    "name": group.name
                }
                for group in groups
            ]
        })
    
    return {"curators": result}

@router.delete("/remove-curator/{curator_id}")
async def remove_curator_access(
    curator_id: int,
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Удалить кураторский доступ"""
    
    if not current_user.roles or 'admin' not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав"
        )
    
    # Строим фильтр
    filter_conditions = [
        UserDepartmentAssignment.user_id == curator_id,
        UserDepartmentAssignment.assignment_type == 'curator'
    ]
    
    if department_id:
        filter_conditions.append(UserDepartmentAssignment.department_id == department_id)
    
    # Удаляем назначения
    assignments = db.query(UserDepartmentAssignment).filter(
        and_(*filter_conditions)
    ).all()
    
    for assignment in assignments:
        db.delete(assignment)
    
    # Если у куратора больше нет назначений, убираем роль
    remaining_assignments = db.query(UserDepartmentAssignment).filter(
        UserDepartmentAssignment.user_id == curator_id,
        UserDepartmentAssignment.assignment_type == 'curator'
    ).count()
    
    if remaining_assignments == 0:
        curator = db.query(User).filter(User.id == curator_id).first()
        if curator and curator.roles:
            roles = curator.roles
            if 'curator' in roles:
                roles.remove('curator')
                curator.roles = roles
    
    db.commit()
    
    return {
        "message": "Кураторский доступ удален",
        "removed_assignments": len(assignments)
    } 