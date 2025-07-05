from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, text
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import StudentAccess, Department, User, UserProfile
from ..schemas.student_access import (
    StudentAccessCreate, 
    StudentAccessUpdate, 
    StudentAccessResponse, 
    StudentAccessList,
    AccessLevels,
    StudentAccessAssignRequest
)
from ..dependencies import get_current_user, UserInfo
from ..models.user import User
from ..models.user_profile import UserProfile
from ..models.department import Department
from ..models.group import Group
from ..models.user_assignment import UserDepartmentAssignment
from ..schemas.user import UserResponse

router = APIRouter(prefix="/student-access", tags=["Student Access"])

@router.get("/access-levels", response_model=AccessLevels)
async def get_access_levels():
    """Получить доступные уровни доступа"""
    return AccessLevels()

@router.post("/assign")
async def assign_student_access(
    request: StudentAccessAssignRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Назначить доступ сотруднику к студентам подразделения"""
    
    # Проверяем права (только админы могут назначать доступ)
    if 'admin' not in current_user.roles:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    # Проверяем существование сотрудника
    employee = db.query(User).filter(User.id == request.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")
    
    # Проверяем существование подразделения
    department = db.query(Department).filter(Department.id == request.department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Подразделение не найдено")
    
    # Проверяем, нет ли уже такого назначения
    existing = db.query(StudentAccess).filter(
        StudentAccess.employee_id == request.employee_id,
        StudentAccess.department_id == request.department_id,
        StudentAccess.is_active == True
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Доступ уже назначен")
    
    # Создаем новое назначение
    access = StudentAccess(
        employee_id=request.employee_id,
        department_id=request.department_id,
        access_level=request.access_level,
        notes=request.notes,
        assigned_by_id=current_user.id,
        assigned_at=datetime.utcnow()
    )
    
    db.add(access)
    db.commit()
    db.refresh(access)
    
    return {"message": "Доступ назначен", "access_id": access.id}

@router.get("/assignments", response_model=List[StudentAccessList])
async def get_student_access_assignments(
    department_id: Optional[int] = Query(None, description="Фильтр по подразделению"),
    employee_id: Optional[int] = Query(None, description="Фильтр по сотруднику"),
    access_level: Optional[str] = Query(None, description="Фильтр по уровню доступа"),
    active_only: bool = Query(True, description="Только активные назначения"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить список назначений доступа"""
    
    # Проверяем права (только админы)
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра назначений"
        )
    
    query = db.query(StudentAccess).options(
        joinedload(StudentAccess.employee),
        joinedload(StudentAccess.department)
    )
    
    # Фильтры
    if department_id:
        query = query.filter(StudentAccess.department_id == department_id)
    
    if employee_id:
        query = query.filter(StudentAccess.employee_id == employee_id)
    
    if access_level:
        query = query.filter(StudentAccess.access_level == access_level)
    
    if active_only:
        query = query.filter(StudentAccess.is_active == True)
    
    assignments = query.order_by(StudentAccess.created_at.desc()).all()
    
    # Преобразуем в схему списка
    result = []
    for assignment in assignments:
        result.append(StudentAccessList(
            id=assignment.id,
            employee_id=assignment.employee_id,
            department_id=assignment.department_id,
            access_level=assignment.access_level,
            is_active=assignment.is_active,
            assigned_at=assignment.assigned_at,
            expires_at=assignment.expires_at,
            employee_name=f"{assignment.employee.first_name} {assignment.employee.last_name}",
            department_name=assignment.department.name,
            department_type=assignment.department.department_type
        ))
    
    return result

@router.put("/assignments/{assignment_id}", response_model=StudentAccessResponse)
async def update_student_access(
    assignment_id: int,
    access_update: StudentAccessUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Обновить назначение доступа"""
    
    # Проверяем права (только админы)
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для изменения назначений"
        )
    
    assignment = db.query(StudentAccess).filter(StudentAccess.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Назначение не найдено"
        )
    
    # Обновляем поля
    if access_update.access_level is not None:
        assignment.access_level = access_update.access_level
    
    if access_update.notes is not None:
        assignment.notes = access_update.notes
    
    if access_update.expires_at is not None:
        assignment.expires_at = access_update.expires_at
        
    if access_update.is_active is not None:
        assignment.is_active = access_update.is_active
    
    assignment.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(assignment)
    
    # Загружаем связанные данные
    assignment_with_relations = db.query(StudentAccess).options(
        joinedload(StudentAccess.employee),
        joinedload(StudentAccess.department),
        joinedload(StudentAccess.assigner)
    ).filter(StudentAccess.id == assignment.id).first()
    
    return assignment_with_relations

@router.delete("/assignments/{access_id}")
async def revoke_student_access(
    access_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Отозвать доступ к студентам"""
    
    # Проверяем права
    if 'admin' not in current_user.roles:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    access = db.query(StudentAccess).filter(StudentAccess.id == access_id).first()
    if not access:
        raise HTTPException(status_code=404, detail="Назначение не найдено")
    
    access.is_active = False
    access.revoked_at = datetime.utcnow()
    access.revoked_by_id = current_user.id
    
    db.commit()
    
    return {"message": "Доступ отозван"}

@router.get("/my-students")
async def get_my_accessible_students(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    faculty_filter: Optional[str] = Query(None),
    department_filter: Optional[str] = Query(None),
    course_filter: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить список студентов, к которым у текущего пользователя есть доступ"""
    
    # Используем UserDepartmentAssignment вместо StudentAccess
    from ..models.user_assignment import UserDepartmentAssignment
    from ..models.group import Group
    from datetime import date
    
    today = date.today()
    
    # Получаем активные назначения пользователя в подразделения
    # Включаем обычные назначения И кураторские
    user_assignments = db.query(UserDepartmentAssignment).filter(
        UserDepartmentAssignment.user_id == current_user.id
    ).filter(
        # Назначение активно, если end_date is None или end_date >= today
        (UserDepartmentAssignment.end_date.is_(None)) | 
        (UserDepartmentAssignment.end_date >= today)
    ).all()
    
    if not user_assignments:
        return {
            "students": [],
            "total": 0,
            "page": page,
            "size": size,
            "departments": []
        }
    
    # Получаем ID подразделений, к которым есть доступ
    department_ids = [assignment.department_id for assignment in user_assignments]
    
    # Получаем информацию о подразделениях
    departments = db.query(Department).filter(Department.id.in_(department_ids)).all()
    
    # Собираем все доступные подразделения с учетом иерархии
    all_accessible_dept_ids = set(department_ids)
    
    for dept in departments:
        if dept.department_type == 'faculty':
            # Добавляем все кафедры этого факультета
            child_departments = db.query(Department).filter(
                Department.parent_id == dept.id,
                Department.department_type == 'department',
                Department.is_active == True
            ).all()
            for child in child_departments:
                all_accessible_dept_ids.add(child.id)
        elif dept.department_type == 'department':
            # Добавляем родительский факультет
            if dept.parent_id:
                all_accessible_dept_ids.add(dept.parent_id)
    
    # Создаем условия фильтрации - теперь включаем ТРИ способа доступа:
    # 1. Через группы (как раньше)
    # 2. Через прямую связь с факультетом (faculty_id)
    # 3. Через прямую связь с кафедрой (department_id)
    
    filter_conditions = []
    
    # 1. Фильтрация через группы (оригинальная логика)
    groups = db.query(Group).filter(
        Group.department_id.in_(all_accessible_dept_ids)
    ).all()
    
    if groups:
        group_ids = [group.id for group in groups]
        filter_conditions.append(UserProfile.group_id.in_(group_ids))
    
    # 2. Фильтрация через прямую связь с факультетом
    faculty_ids = [dept_id for dept_id in all_accessible_dept_ids 
                   if any(d.id == dept_id and d.department_type == 'faculty' for d in departments)]
    if faculty_ids:
        filter_conditions.append(UserProfile.faculty_id.in_(faculty_ids))
    
    # 3. Фильтрация через прямую связь с кафедрой
    department_only_ids = [dept_id for dept_id in all_accessible_dept_ids 
                          if any(d.id == dept_id and d.department_type == 'department' for d in departments)]
    if department_only_ids:
        filter_conditions.append(UserProfile.department_id.in_(department_only_ids))
    
    # Примечание: Старые текстовые поля faculty и department не существуют в БД
    # Фильтрация только через ID поля faculty_id и department_id
    
    if not filter_conditions:
        return {
            "students": [],
            "total": 0,
            "page": page,
            "size": size,
            "departments": []
        }
    
    # Базовый запрос студентов с РАСШИРЕННОЙ фильтрацией
    students_query = db.query(User).join(UserProfile).options(
        joinedload(User.profile).joinedload(UserProfile.faculty),
        joinedload(User.profile).joinedload(UserProfile.department), 
        joinedload(User.profile).joinedload(UserProfile.group)
    ).filter(
        text("roles::text LIKE '%student%'"),
        or_(*filter_conditions)  # Используем OR для всех условий доступа
    )
    
    # Применяем дополнительные фильтры
    if search:
        # Импортируем Group для поиска по названию группы
        from ..models.group import Group
        
        search_filter = or_(
            User.first_name.ilike(f"%{search}%"),
            User.last_name.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%"),
            UserProfile.student_id.ilike(f"%{search}%"),
            Group.name.ilike(f"%{search}%")
        )
        
        # Добавляем join с таблицей групп для поиска по названию группы
        students_query = students_query.outerjoin(Group, UserProfile.group_id == Group.id)
        students_query = students_query.filter(search_filter)
    
    # Улучшенная логика фильтрации по факультету
    if faculty_filter:
        # Ищем факультет по названию
        faculty = db.query(Department).filter(
            Department.name == faculty_filter,
            Department.department_type == 'faculty'
        ).first()
        if faculty:
            students_query = students_query.filter(
                or_(
                    UserProfile.faculty_id == faculty.id,      # Прямая связь
                    # Также через группы этого факультета
                    UserProfile.group_id.in_(
                        db.query(Group.id).filter(Group.department_id == faculty.id).subquery()
                    )
                )
            )
    
    # Улучшенная логика фильтрации по кафедре
    if department_filter:
        # Ищем кафедру по названию
        department = db.query(Department).filter(
            Department.name == department_filter,
            Department.department_type == 'department'
        ).first()
        if department:
            students_query = students_query.filter(
                or_(
                    UserProfile.department_id == department.id,    # Прямая связь
                    # Также через группы этой кафедры
                    UserProfile.group_id.in_(
                        db.query(Group.id).filter(Group.department_id == department.id).subquery()
                    )
                )
            )
    
    if course_filter:
        students_query = students_query.filter(UserProfile.course == course_filter)
    
    # Получаем общее количество
    total = students_query.count()
    
    # Применяем пагинацию
    offset = (page - 1) * size
    students = students_query.offset(offset).limit(size).all()
    
    # Определяем причину доступа для каждого студента
    def get_access_reason(student):
        reasons = []
        
        # Проверяем доступ через группу
        if student.profile and student.profile.group_id:
            group = db.query(Group).filter(Group.id == student.profile.group_id).first()
            if group and group.department_id in all_accessible_dept_ids:
                dept = db.query(Department).filter(Department.id == group.department_id).first()
                if dept:
                    reasons.append(f"Доступ через группу {group.name} ({dept.name})")
        
        # Проверяем прямой доступ к факультету
        if student.profile and student.profile.faculty_id and student.profile.faculty_id in all_accessible_dept_ids:
            faculty = db.query(Department).filter(Department.id == student.profile.faculty_id).first()
            if faculty:
                reasons.append(f"Прямой доступ к факультету {faculty.name}")
        
        # Проверяем прямой доступ к кафедре
        if student.profile and student.profile.department_id and student.profile.department_id in all_accessible_dept_ids:
            dept = db.query(Department).filter(Department.id == student.profile.department_id).first()
            if dept:
                reasons.append(f"Прямой доступ к кафедре {dept.name}")
        
        return reasons if reasons else ["Доступ через назначение"]

    return {
        "students": [
            {
                "id": student.id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "middle_name": student.middle_name,
                "email": student.email,
                # Старые текстовые поля для обратной совместимости
                "faculty": student.profile.faculty.name if student.profile and student.profile.faculty else None,
                "department": student.profile.department.name if student.profile and student.profile.department else None,
                # Новые поля с полной информацией о подразделениях
                "faculty_info": {
                    "id": student.profile.faculty.id,
                    "name": student.profile.faculty.name,
                    "short_name": student.profile.faculty.short_name,
                    "department_type": student.profile.faculty.department_type
                } if student.profile and student.profile.faculty else None,
                "department_info": {
                    "id": student.profile.department.id, 
                    "name": student.profile.department.name,
                    "short_name": student.profile.department.short_name,
                    "department_type": student.profile.department.department_type
                } if student.profile and student.profile.department else None,
                "group_number": student.profile.group.name if student.profile and student.profile.group else None,
                "group_info": {
                    "id": student.profile.group.id,
                    "name": student.profile.group.name,
                    "specialization": student.profile.group.specialization,
                    "course": student.profile.group.course,
                    "admission_year": student.profile.group.parsed_year
                } if student.profile and student.profile.group else None,
                "course": student.profile.course if student.profile else None,
                "student_id": student.profile.student_id if student.profile else None,
                "education_level": student.profile.education_level if student.profile else None,
                "education_form": student.profile.education_form if student.profile else None,
                "academic_status": student.profile.academic_status if student.profile else None,
                "phone": student.profile.phone if student.profile else None,
                "access_reasons": get_access_reason(student)
            }
            for student in students
        ],
        "total": total,
        "page": page,
        "size": size,
        "departments": [
            {
                "id": dept.id,
                "name": dept.name,
                "department_type": dept.department_type,
                "access_level": "write",  # Упрощаем - все назначения дают доступ на запись
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

@router.get("/check-access/{student_id}")
async def check_student_access(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Проверить доступ к конкретному студенту"""
    
    # Получаем студента
    student = db.query(User).options(joinedload(User.profile)).filter(
        User.id == student_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")
    
    if not student.profile or not student.profile.group_id:
        return {"has_access": False, "access_level": None}
    
    # Используем UserDepartmentAssignment вместо StudentAccess
    from ..models.user_assignment import UserDepartmentAssignment
    from ..models.group import Group
    from datetime import date
    
    today = date.today()
    
    # Получаем активные назначения пользователя
    user_assignments = db.query(UserDepartmentAssignment).filter(
        UserDepartmentAssignment.user_id == current_user.id
    ).filter(
        (UserDepartmentAssignment.end_date.is_(None)) | 
        (UserDepartmentAssignment.end_date >= today)
    ).all()
    
    if not user_assignments:
        return {"has_access": False, "access_level": None}
    
    # Получаем группу студента
    student_group = db.query(Group).filter(Group.id == student.profile.group_id).first()
    if not student_group:
        return {"has_access": False, "access_level": None}
    
    # Проверяем доступ через назначения
    accessible_assignments = []
    department_ids = [assignment.department_id for assignment in user_assignments]
    
    # Получаем все доступные подразделения с учетом иерархии
    departments = db.query(Department).filter(Department.id.in_(department_ids)).all()
    all_accessible_dept_ids = set(department_ids)
    
    for dept in departments:
        if dept.department_type == 'faculty':
            # Добавляем все кафедры этого факультета
            child_departments = db.query(Department).filter(
                Department.parent_id == dept.id,
                Department.department_type == 'department',
                Department.is_active == True
            ).all()
            for child in child_departments:
                all_accessible_dept_ids.add(child.id)
        elif dept.department_type == 'department':
            # Добавляем родительский факультет
            if dept.parent_id:
                all_accessible_dept_ids.add(dept.parent_id)
    
    # Проверяем, принадлежит ли группа студента к доступным подразделениям
    if student_group.department_id in all_accessible_dept_ids:
        return {
            "has_access": True, 
            "access_level": "write",  # Упрощаем уровень доступа
            "student": {
                "id": student.id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "email": student.email,
                "faculty": student.profile.faculty,
                "department": student.profile.department,
                "group_id": student.profile.group_id,
                "group": {
                    "id": student_group.id,
                    "name": student_group.name,
                    "specialization": student_group.specialization
                },
                "course": student.profile.course
            }
        }
    
    return {"has_access": False, "access_level": None}

@router.get("/students/accessible", response_model=List[UserResponse])
async def get_accessible_students(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить всех студентов, к которым у текущего пользователя есть доступ"""
    
    from ..models.user_assignment import UserDepartmentAssignment
    from ..models.group import Group
    from datetime import date
    
    today = date.today()
    
    # Получаем активные назначения пользователя в подразделения
    user_assignments = db.query(UserDepartmentAssignment).filter(
        UserDepartmentAssignment.user_id == current_user.id
    ).filter(
        (UserDepartmentAssignment.end_date.is_(None)) | 
        (UserDepartmentAssignment.end_date >= today)
    ).all()
    
    if not user_assignments:
        return []
    
    # Получаем ID подразделений, к которым есть доступ
    department_ids = [assignment.department_id for assignment in user_assignments]
    departments = db.query(Department).filter(Department.id.in_(department_ids)).all()
    
    # Собираем все доступные подразделения с учетом иерархии
    all_accessible_dept_ids = set(department_ids)
    
    for dept in departments:
        if dept.department_type == 'faculty':
            # Добавляем все кафедры этого факультета
            child_departments = db.query(Department).filter(
                Department.parent_id == dept.id,
                Department.department_type == 'department',
                Department.is_active == True
            ).all()
            for child in child_departments:
                all_accessible_dept_ids.add(child.id)
        elif dept.department_type == 'department':
            # Добавляем родительский факультет
            if dept.parent_id:
                all_accessible_dept_ids.add(dept.parent_id)
    
    # Создаем условия фильтрации - используем множественные способы доступа
    filter_conditions = []
    
    # 1. Фильтрация через группы
    groups = db.query(Group).filter(
        Group.department_id.in_(all_accessible_dept_ids)
    ).all()
    
    if groups:
        group_ids = [group.id for group in groups]
        filter_conditions.append(UserProfile.group_id.in_(group_ids))
    
    # 2. Фильтрация через прямую связь с факультетом
    faculty_ids = [dept_id for dept_id in all_accessible_dept_ids 
                   if any(d.id == dept_id and d.department_type == 'faculty' for d in departments)]
    if faculty_ids:
        filter_conditions.append(UserProfile.faculty_id.in_(faculty_ids))
    
    # 3. Фильтрация через прямую связь с кафедрой
    department_only_ids = [dept_id for dept_id in all_accessible_dept_ids 
                          if any(d.id == dept_id and d.department_type == 'department' for d in departments)]
    if department_only_ids:
        filter_conditions.append(UserProfile.department_id.in_(department_only_ids))
    
    # Примечание: Старые текстовые поля faculty и department не существуют в БД
    # Фильтрация только через ID поля faculty_id и department_id
    
    if not filter_conditions:
        return []
    
    # Получаем студентов с расширенной фильтрацией
    students = db.query(User).join(UserProfile).options(
        joinedload(User.profile).joinedload(UserProfile.faculty),
        joinedload(User.profile).joinedload(UserProfile.department), 
        joinedload(User.profile).joinedload(UserProfile.group)
    ).filter(
        text("roles::text LIKE '%student%'"),
        or_(*filter_conditions)
    ).all()
    
    # Определяем причину доступа для каждого студента
    def get_access_reason(student):
        reasons = []
        
        # Проверяем доступ через группу
        if student.profile and student.profile.group_id:
            group = db.query(Group).filter(Group.id == student.profile.group_id).first()
            if group and group.department_id in all_accessible_dept_ids:
                dept = db.query(Department).filter(Department.id == group.department_id).first()
                if dept:
                    reasons.append(f"Доступ через группу {group.name} ({dept.name})")
        
        # Проверяем прямой доступ к факультету
        if student.profile and student.profile.faculty_id and student.profile.faculty_id in all_accessible_dept_ids:
            faculty = db.query(Department).filter(Department.id == student.profile.faculty_id).first()
            if faculty:
                reasons.append(f"Прямой доступ к факультету {faculty.name}")
        
        # Проверяем прямой доступ к кафедре
        if student.profile and student.profile.department_id and student.profile.department_id in all_accessible_dept_ids:
            dept = db.query(Department).filter(Department.id == student.profile.department_id).first()
            if dept:
                reasons.append(f"Прямой доступ к кафедре {dept.name}")
        
        return reasons if reasons else ["Доступ через назначение"]
    
    # Преобразуем в расширенный формат для совместимости
    students_with_access = []
    for student in students:
        student_dict = {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "middle_name": student.middle_name,
            "email": student.email,
            "birth_date": student.birth_date.isoformat() if student.birth_date else None,
            "gender": student.gender,
            "roles": student.roles,
            "is_verified": student.is_verified,
            "is_active": student.is_active,
            "faculty": student.profile.faculty.name if student.profile and student.profile.faculty else None,
            "department": student.profile.department.name if student.profile and student.profile.department else None,
            "faculty_info": {
                "id": student.profile.faculty.id,
                "name": student.profile.faculty.name,
                "short_name": student.profile.faculty.short_name,
                "department_type": student.profile.faculty.department_type
            } if student.profile and student.profile.faculty else None,
            "department_info": {
                "id": student.profile.department.id, 
                "name": student.profile.department.name,
                "short_name": student.profile.department.short_name,
                "department_type": student.profile.department.department_type
            } if student.profile and student.profile.department else None,
            "group_number": student.profile.group.name if student.profile and student.profile.group else None,
            "group_info": {
                "id": student.profile.group.id,
                "name": student.profile.group.name,
                "specialization": student.profile.group.specialization,
                "course": student.profile.group.course,
                "admission_year": student.profile.group.parsed_year
            } if student.profile and student.profile.group else None,
            "course": student.profile.course if student.profile else None,
            "student_id": student.profile.student_id if student.profile else None,
            "education_level": student.profile.education_level if student.profile else None,
            "education_form": student.profile.education_form if student.profile else None,
            "academic_status": student.profile.academic_status if student.profile else None,
            "phone": student.profile.phone if student.profile else None,
            "access_reasons": get_access_reason(student)
        }
        students_with_access.append(student_dict)
    
    return students_with_access

@router.get("/students/by-department/{department_id}", response_model=List[UserResponse])
async def get_students_by_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получить студентов конкретного подразделения"""
    
    from ..models.user_assignment import UserDepartmentAssignment
    from ..models.group import Group
    from datetime import date
    
    today = date.today()
    
    # Проверяем доступ к подразделению
    has_access = db.query(UserDepartmentAssignment).filter(
        UserDepartmentAssignment.user_id == current_user.id,
        UserDepartmentAssignment.department_id == department_id,
        (UserDepartmentAssignment.end_date.is_(None)) | 
        (UserDepartmentAssignment.end_date >= today)
    ).first()
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Нет доступа к этому подразделению")
    
    # Получаем информацию о подразделении
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Подразделение не найдено")
    
    # Собираем ID доступных подразделений с учетом иерархии
    accessible_dept_ids = {department_id}
    
    if department.department_type == 'faculty':
        # Добавляем все кафедры этого факультета
        child_departments = db.query(Department).filter(
            Department.parent_id == department_id,
            Department.department_type == 'department',
            Department.is_active == True
        ).all()
        for child in child_departments:
            accessible_dept_ids.add(child.id)
    elif department.department_type == 'department':
        # Добавляем родительский факультет
        if department.parent_id:
            accessible_dept_ids.add(department.parent_id)
    
    # Создаем условия фильтрации
    filter_conditions = []
    
    # 1. Фильтрация через группы
    groups = db.query(Group).filter(
        Group.department_id.in_(accessible_dept_ids)
    ).all()
    
    if groups:
        group_ids = [group.id for group in groups]
        filter_conditions.append(UserProfile.group_id.in_(group_ids))
    
    # 2. Фильтрация через прямую связь с факультетом
    if department.department_type == 'faculty':
        filter_conditions.append(UserProfile.faculty_id == department_id)
    
    # 3. Фильтрация через прямую связь с кафедрой
    if department.department_type == 'department':
        filter_conditions.append(UserProfile.department_id == department_id)
    
    if not filter_conditions:
        return []
    
    # Получаем студентов с расширенной фильтрацией
    students = db.query(User).join(UserProfile).options(
        joinedload(User.profile).joinedload(UserProfile.faculty),
        joinedload(User.profile).joinedload(UserProfile.department), 
        joinedload(User.profile).joinedload(UserProfile.group)
    ).filter(
        text("roles::text LIKE '%student%'"),
        or_(*filter_conditions)
    ).all()
    
    return students

@router.get("/students/{student_id}/profile")
async def get_student_profile(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение профиля студента (для сотрудников деканата)"""
    
    # Получаем студента
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")
    
    # Проверяем, что это студент
    if 'student' not in (student.roles or []):
        raise HTTPException(status_code=404, detail="Пользователь не является студентом")
    
    # Получаем профиль студента с связанными данными
    profile = db.query(UserProfile).options(
        joinedload(UserProfile.faculty),
        joinedload(UserProfile.department)
    ).filter(UserProfile.user_id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль студента не найден")
    
    # Проверяем доступ - есть ли у текущего пользователя доступ к этому студенту
    has_access = False
    
    # Админы имеют доступ ко всем
    if 'admin' in (current_user.roles or []):
        has_access = True
    else:
        # Проверяем доступ через назначения в подразделениях
        user_assignments = db.query(UserDepartmentAssignment).filter(
            UserDepartmentAssignment.user_id == current_user.id,
            UserDepartmentAssignment.is_active == True
        ).all()
        
        department_ids = [assignment.department_id for assignment in user_assignments]
        departments = db.query(Department).filter(
            Department.id.in_(department_ids)
        ).all()
        
        # Проверяем доступ по факультету
        faculty_departments = [dept for dept in departments if dept.department_type == "faculty"]
        if faculty_departments:
            faculty_ids = [dept.id for dept in faculty_departments]
            if profile.faculty_id in faculty_ids:
                has_access = True
        
        # Проверяем доступ по кафедре
        if not has_access:
            department_departments = [dept for dept in departments if dept.department_type == "department"]
            if department_departments:
                department_ids = [dept.id for dept in department_departments]
                if profile.department_id in department_ids:
                    has_access = True
        
        # Проверяем доступ по группе
        if not has_access and profile.group_id:
            group = db.query(Group).filter(Group.id == profile.group_id).first()
            if group and group.department_id in department_ids:
                has_access = True
    
    if not has_access:
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для просмотра профиля этого студента"
        )
    
    # Получаем информацию о группе
    group_info = None
    if profile.group_id:
        group = db.query(Group).filter(Group.id == profile.group_id).first()
        if group:
            group_info = {
                "id": group.id,
                "name": group.name,
                "specialization": group.specialization,
                "course": group.course,
                "admission_year": group.parsed_year,
                "education_level": group.parsed_education_level,
                "education_form": group.parsed_education_form
            }
    
    # Формируем данные профиля
    profile_data = {
        "user_id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "middle_name": student.middle_name,
        "email": student.email,
        "birth_date": student.birth_date.isoformat() if student.birth_date else None,
        "gender": student.gender,
        "phone": profile.phone,
        "student_id": profile.student_id,
        "group_id": profile.group_id,
        "group": group_info,
        "course": profile.course,
        "semester": profile.semester,
        "faculty": profile.faculty.name if profile.faculty else None,
        "department": profile.department.name if profile.department else None,
        "specialization": profile.specialization,
        "education_level": profile.education_level,
        "education_form": profile.education_form,
        "funding_type": profile.funding_type,
        "enrollment_date": profile.enrollment_date.isoformat() if profile.enrollment_date else None,
        "graduation_date": profile.graduation_date.isoformat() if profile.graduation_date else None,
        "academic_status": profile.academic_status,
        "gpa": profile.gpa,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
    }
    
    return profile_data

@router.get("/departments/my-assignments")
async def get_my_department_assignments(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение назначений текущего пользователя в подразделениях"""
    
    assignments = db.query(UserDepartmentAssignment).options(
        joinedload(UserDepartmentAssignment.department),
        joinedload(UserDepartmentAssignment.role)
    ).filter(
        UserDepartmentAssignment.user_id == current_user.id,
        UserDepartmentAssignment.is_active == True
    ).all()
    
    result = []
    for assignment in assignments:
        assignment_data = {
            "id": assignment.id,
            "department_id": assignment.department_id,
            "department_name": assignment.department.name if assignment.department else None,
            "department_type": assignment.department.department_type if assignment.department else None,
            "role_id": assignment.role_id,
            "role_name": assignment.role.name if assignment.role else None,
            "is_primary": assignment.is_primary,
            "start_date": assignment.start_date.isoformat() if assignment.start_date else None,
            "end_date": assignment.end_date.isoformat() if assignment.end_date else None
        }
        result.append(assignment_data)
    
    return result