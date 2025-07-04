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
    
    # Для кураторов используем другую логику - через группы
    curator_assignments = [a for a in user_assignments if a.assignment_type == 'curator']
    regular_assignments = [a for a in user_assignments if a.assignment_type != 'curator']
    
    # Собираем все условия фильтрации
    filter_conditions = []
    
    if curator_assignments:
        # Для кураторов: получаем студентов через группы
        curator_dept_ids = [a.department_id for a in curator_assignments]
        
        # Получаем группы в подразделениях куратора
        groups = db.query(Group).filter(
            Group.department_id.in_(curator_dept_ids)
        ).all()
        
        if groups:
            group_ids = [group.id for group in groups]
            filter_conditions.append(UserProfile.group_id.in_(group_ids))
    
    # Для обычных назначений: используем старую логику через факультеты/кафедры
    if regular_assignments:
        regular_dept_ids = [a.department_id for a in regular_assignments]
        regular_departments = db.query(Department).filter(Department.id.in_(regular_dept_ids)).all()
        
        # Расширяем список доступных подразделений с учетом иерархии
        accessible_department_names = set()
        accessible_faculty_names = set()
        
        for dept in regular_departments:
            if dept.department_type == 'faculty':
                accessible_faculty_names.add(dept.name)
                # Добавляем все кафедры этого факультета
                child_departments = db.query(Department).filter(
                    Department.parent_id == dept.id,
                    Department.department_type == 'department',
                    Department.is_active == True
                ).all()
                for child in child_departments:
                    accessible_department_names.add(child.name)
            elif dept.department_type == 'department':
                accessible_department_names.add(dept.name)
                # Добавляем факультет этой кафедры
                if dept.parent:
                    accessible_faculty_names.add(dept.parent.name)
        
        # Фильтруем студентов по доступным подразделениям
        department_filter_conditions = []
        if accessible_faculty_names:
            department_filter_conditions.append(UserProfile.faculty.in_(accessible_faculty_names))
        if accessible_department_names:
            department_filter_conditions.append(UserProfile.department.in_(accessible_department_names))
        
        if department_filter_conditions:
            filter_conditions.extend(department_filter_conditions)
    
    # Если нет ни кураторских, ни обычных назначений
    if not filter_conditions:
        return {
            "students": [],
            "total": 0,
            "page": page,
            "size": size,
            "departments": []
        }
    
    # Базовый запрос студентов
    students_query = db.query(User).join(UserProfile).options(
        joinedload(User.profile)
    ).filter(
        text("roles::text LIKE '%student%'"),
        or_(*filter_conditions)
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
    
    if faculty_filter:
        students_query = students_query.filter(UserProfile.faculty == faculty_filter)
    
    if department_filter:
        students_query = students_query.filter(UserProfile.department == department_filter)
    
    if course_filter:
        students_query = students_query.filter(UserProfile.course == course_filter)
    
    # Получаем общее количество
    total = students_query.count()
    
    # Применяем пагинацию
    offset = (page - 1) * size
    students = students_query.offset(offset).limit(size).all()
    
    return {
        "students": [
            {
                "id": student.id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "middle_name": student.middle_name,
                "email": student.email,
                "faculty": student.profile.faculty if student.profile else None,
                "department": student.profile.department if student.profile else None,
                "group_number": student.profile.group.name if student.profile and student.profile.group else None,
                "course": student.profile.course if student.profile else None,
                "student_id": student.profile.student_id if student.profile else None,
                "education_level": student.profile.education_level if student.profile else None,
                "education_form": student.profile.education_form if student.profile else None,
                "academic_status": student.profile.academic_status if student.profile else None,
                "phone": student.profile.phone if student.profile else None
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
    
    if not student.profile:
        return {"has_access": False, "access_level": None}
    
    # Получаем назначения доступа для текущего пользователя
    access_assignments = db.query(StudentAccess).filter(
        StudentAccess.employee_id == current_user.id,
        StudentAccess.is_active == True
    ).all()
    
    if not access_assignments:
        return {"has_access": False, "access_level": None}
    
    # Проверяем доступ к студенту
    accessible_assignments = []
    
    for assignment in access_assignments:
        department = db.query(Department).filter(Department.id == assignment.department_id).first()
        if not department:
            continue
            
        # Прямое совпадение названия подразделения
        if (department.name == student.profile.faculty or 
            department.name == student.profile.department):
            accessible_assignments.append(assignment)
            continue
        
        # Если это доступ к факультету, проверяем принадлежность к кафедрам факультета
        if department.department_type == 'faculty':
            # Проверяем, что студент принадлежит к этому факультету
            if department.name == student.profile.faculty:
                accessible_assignments.append(assignment)
                continue
                
            # Или что кафедра студента принадлежит к этому факультету
            student_department = db.query(Department).filter(
                Department.name == student.profile.department,
                Department.parent_id == department.id
            ).first()
            if student_department:
                accessible_assignments.append(assignment)
    
    if not accessible_assignments:
        return {"has_access": False, "access_level": None}
    
    # Возвращаем максимальный уровень доступа
    access_levels = ["read", "write", "full"]
    max_level = max(
        access_levels.index(assignment.access_level) 
        for assignment in accessible_assignments
    )
    
    return {
        "has_access": True, 
        "access_level": access_levels[max_level],
        "student": {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "email": student.email,
            "faculty": student.profile.faculty,
            "department": student.profile.department,
            "group_id": student.profile.group_id,
            "group": {
                "id": student.profile.group.id,
                "name": student.profile.group.name,
                "specialization": student.profile.group.specialization
            } if student.profile.group else None,
            "course": student.profile.course
        }
    } 

@router.get("/students/accessible", response_model=List[UserResponse])
async def get_accessible_students(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение списка студентов доступных текущему пользователю (деканат/сотрудники)"""
    
    # Получаем назначения текущего пользователя в подразделениях
    user_assignments = db.query(UserDepartmentAssignment).filter(
        UserDepartmentAssignment.user_id == current_user.id,
        UserDepartmentAssignment.is_active == True
    ).all()
    
    if not user_assignments:
        return []
    
    # Получаем ID подразделений где работает пользователь
    department_ids = [assignment.department_id for assignment in user_assignments]
    
    # Получаем названия подразделений
    departments = db.query(Department).filter(
        Department.id.in_(department_ids)
    ).all()
    
    department_names = [dept.name for dept in departments]
    
    # Ищем студентов, у которых в профиле указаны эти подразделения
    accessible_students = []
    
    # Поиск по факультетам
    faculty_departments = [dept for dept in departments if dept.department_type == "faculty"]
    if faculty_departments:
        faculty_names = [dept.name for dept in faculty_departments]
        students_by_faculty = db.query(User).join(UserProfile).filter(
            UserProfile.faculty.in_(faculty_names),
            User.roles.contains(["student"])
        ).all()
        accessible_students.extend(students_by_faculty)
    
    # Поиск по кафедрам  
    department_departments = [dept for dept in departments if dept.department_type == "department"]
    if department_departments:
        department_names = [dept.name for dept in department_departments]
        students_by_department = db.query(User).join(UserProfile).filter(
            UserProfile.department.in_(department_names),
            User.roles.contains(["student"])
        ).all()
        accessible_students.extend(students_by_department)
    
    # Поиск по группам (через связь с подразделениями)
    groups = db.query(Group).filter(
        Group.department_id.in_(department_ids)
    ).all()
    
    if groups:
        group_ids = [group.id for group in groups]
        students_by_group = db.query(User).join(UserProfile).filter(
            UserProfile.group_id.in_(group_ids),
            User.roles.contains(["student"])
        ).all()
        accessible_students.extend(students_by_group)
    
    # Убираем дубликаты
    unique_students = []
    seen_ids = set()
    for student in accessible_students:
        if student.id not in seen_ids:
            unique_students.append(student)
            seen_ids.add(student.id)
    
    return unique_students

@router.get("/students/by-department/{department_id}", response_model=List[UserResponse])
async def get_students_by_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Получение студентов конкретного подразделения"""
    
    # Проверяем, что пользователь имеет доступ к этому подразделению
    user_assignment = db.query(UserDepartmentAssignment).filter(
        UserDepartmentAssignment.user_id == current_user.id,
        UserDepartmentAssignment.department_id == department_id,
        UserDepartmentAssignment.is_active == True
    ).first()
    
    if not user_assignment and 'admin' not in (current_user.roles or []):
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для просмотра студентов этого подразделения"
        )
    
    # Получаем подразделение
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Подразделение не найдено")
    
    students = []
    
    # Поиск студентов в зависимости от типа подразделения
    if department.department_type == "faculty":
        # Поиск по факультету
        students = db.query(User).join(UserProfile).filter(
            UserProfile.faculty == department.name,
            User.roles.contains(["student"])
        ).all()
    elif department.department_type == "department":
        # Поиск по кафедре
        students = db.query(User).join(UserProfile).filter(
            UserProfile.department == department.name,
            User.roles.contains(["student"])
        ).all()
    else:
        # Поиск по группам этого подразделения
        groups = db.query(Group).filter(Group.department_id == department_id).all()
        if groups:
            group_ids = [group.id for group in groups]
            students = db.query(User).join(UserProfile).filter(
                UserProfile.group_id.in_(group_ids),
                User.roles.contains(["student"])
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
    
    # Получаем профиль студента
    profile = db.query(UserProfile).filter(UserProfile.user_id == student_id).first()
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
            faculty_names = [dept.name for dept in faculty_departments]
            if profile.faculty in faculty_names:
                has_access = True
        
        # Проверяем доступ по кафедре
        if not has_access:
            department_departments = [dept for dept in departments if dept.department_type == "department"]
            if department_departments:
                department_names = [dept.name for dept in department_departments]
                if profile.department in department_names:
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
        "faculty": profile.faculty,
        "department": profile.department,
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