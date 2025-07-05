from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, or_, and_, func
from typing import List, Optional, Dict, Any
from datetime import date, datetime

from ..database import get_db
from ..dependencies import get_current_user
from ..models.user import User
from ..models.user_profile import UserProfile
from ..models.group import Group
from ..models.department import Department
from ..schemas.user import User as UserSchema

router = APIRouter()

# ===========================================
# ПРОВЕРКА ДОСТУПА
# ===========================================

def check_directories_access(user: User, db: Session, scope: str = "all", department_id: Optional[int] = None):
    """
    Проверка доступа к справочникам с использованием новой системы доступа
    
    Args:
        user: Пользователь
        db: Сессия базы данных
        scope: Область доступа (students, groups, departments, all)
        department_id: ID подразделения (если требуется доступ к конкретному)
    """
    from ..services.directory_access_service import DirectoryAccessService
    
    # Администраторы имеют полный доступ
    if 'admin' in user.roles:
        return True
    
    # Используем новую систему доступа
    service = DirectoryAccessService(db)
    access_result = service.check_user_access(
        user_id=user.id,
        department_id=department_id,
        scope=scope,
        required_access_type="read"
    )
    
    if not access_result.has_access:
        raise HTTPException(
            status_code=403,
            detail="У вас нет доступа к данному разделу справочников. Обратитесь к администратору для получения доступа."
        )
    
    return access_result

# ===========================================
# СПРАВОЧНИК СТУДЕНТОВ
# ===========================================

@router.get("/students")
async def get_students(
    page: int = Query(1, ge=1, description="Номер страницы"),
    limit: int = Query(20, ge=1, le=100, description="Количество записей на странице"),
    search: Optional[str] = Query(None, description="Поиск по ФИО, email или номеру студенческого билета"),
    faculty_id: Optional[int] = Query(None, description="Фильтр по факультету"),
    department_id: Optional[int] = Query(None, description="Фильтр по кафедре"),
    group_id: Optional[int] = Query(None, description="Фильтр по группе"),
    course: Optional[int] = Query(None, description="Фильтр по курсу"),
    education_form: Optional[str] = Query(None, description="Фильтр по форме обучения"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение списка студентов с пагинацией и фильтрами"""
    check_directories_access(current_user, db, "students")
    
    # Базовый запрос
    query = db.query(User).options(
        joinedload(User.profile)
    ).filter(
        text("roles::text LIKE '%student%'")
    )
    
    # Применяем фильтры с учетом иерархии подразделений
    join_applied = False
    
    if search:
        search_term = f"%{search.lower()}%"
        if not join_applied:
            query = query.join(UserProfile)
            join_applied = True
        query = query.filter(
            or_(
                func.lower(User.first_name).contains(search_term),
                func.lower(User.last_name).contains(search_term),
                func.lower(User.middle_name).contains(search_term),
                func.lower(User.email).contains(search_term),
                UserProfile.student_id.ilike(search_term)
            )
        )
    
    if faculty_id:
        if not join_applied:
            query = query.join(UserProfile)
            join_applied = True
        
        # Находим все кафедры этого факультета
        child_departments = db.query(Department).filter(
            Department.parent_id == faculty_id,
            Department.is_active == True
        ).all()
        child_dept_ids = [dept.id for dept in child_departments]
        
        # Находим все группы кафедр этого факультета
        faculty_groups = db.query(Group).filter(
            Group.department_id.in_(child_dept_ids)
        ).all() if child_dept_ids else []
        faculty_group_ids = [group.id for group in faculty_groups]
        
        # Студенты факультета: напрямую привязанные ИЛИ через группы кафедр факультета
        faculty_condition = or_(
            UserProfile.faculty_id == faculty_id,
            UserProfile.group_id.in_(faculty_group_ids) if faculty_group_ids else False
        )
        query = query.filter(faculty_condition)
    
    if department_id:
        if not join_applied:
            query = query.join(UserProfile)
            join_applied = True
            
        # Находим все группы этой кафедры
        dept_groups = db.query(Group).filter(Group.department_id == department_id).all()
        dept_group_ids = [group.id for group in dept_groups]
        
        # Студенты кафедры: напрямую привязанные ИЛИ через группы кафедры
        department_condition = or_(
            UserProfile.department_id == department_id,
            UserProfile.group_id.in_(dept_group_ids) if dept_group_ids else False
        )
        query = query.filter(department_condition)
    
    if group_id:
        if not join_applied:
            query = query.join(UserProfile)
            join_applied = True
        query = query.filter(UserProfile.group_id == group_id)
    
    if course:
        if not join_applied:
            query = query.join(UserProfile)
            join_applied = True
        query = query.filter(UserProfile.course == course)
    
    if education_form:
        if not join_applied:
            query = query.join(UserProfile)
            join_applied = True
        query = query.filter(UserProfile.education_form == education_form)
    
    # Подсчет общего количества
    total = query.count()
    
    # Пагинация
    offset = (page - 1) * limit
    students = query.offset(offset).limit(limit).all()
    
    # Формируем ответ с дополнительной информацией
    result = []
    for student in students:
        profile = student.profile
        
        # Получаем информацию о факультете, кафедре и группе
        faculty_info = None
        department_info = None
        group_info = None
        
        if profile:
            if profile.faculty_id:
                faculty = db.query(Department).filter(Department.id == profile.faculty_id).first()
                if faculty:
                    faculty_info = {"id": faculty.id, "name": faculty.name, "short_name": faculty.short_name}
            
            if profile.department_id:
                department = db.query(Department).filter(Department.id == profile.department_id).first()
                if department:
                    department_info = {"id": department.id, "name": department.name, "short_name": department.short_name}
            
            if profile.group_id:
                group = db.query(Group).filter(Group.id == profile.group_id).first()
                if group:
                    group_info = {"id": group.id, "name": group.name, "specialization": group.specialization, "course": group.course}
        
        student_data = {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "middle_name": student.middle_name,
            "email": student.email,
            "birth_date": student.birth_date.isoformat() if student.birth_date else None,
            "is_active": student.is_active,
            "created_at": student.created_at.isoformat() if student.created_at else None,
            "profile": {
                "student_id": profile.student_id if profile else None,
                "phone": profile.phone if profile else None,
                "course": profile.course if profile else None,
                "education_form": profile.education_form if profile else None,
                "education_level": profile.education_level if profile else None,
                "academic_status": profile.academic_status if profile else None,
                "faculty_info": faculty_info,
                "department_info": department_info,
                "group_info": group_info
            }
        }
        result.append(student_data)
    
    return {
        "students": result,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }

@router.get("/students/{student_id}")
async def get_student_details(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение детальной информации о студенте"""
    check_directories_access(current_user, db, "students")
    
    student = db.query(User).options(
        joinedload(User.profile)
    ).filter(
        User.id == student_id,
        text("roles::text LIKE '%student%'")
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")
    
    profile = student.profile
    
    # Получаем полную информацию о связанных сущностях
    faculty_info = None
    department_info = None
    group_info = None
    
    if profile:
        if profile.faculty_id:
            faculty = db.query(Department).filter(Department.id == profile.faculty_id).first()
            if faculty:
                faculty_info = {
                    "id": faculty.id,
                    "name": faculty.name,
                    "short_name": faculty.short_name,
                    "department_type": faculty.department_type
                }
        
        if profile.department_id:
            department = db.query(Department).options(
                joinedload(Department.parent)
            ).filter(Department.id == profile.department_id).first()
            if department:
                department_info = {
                    "id": department.id,
                    "name": department.name,
                    "short_name": department.short_name,
                    "department_type": department.department_type,
                    "parent_name": department.parent.name if department.parent else None
                }
        
        if profile.group_id:
            group = db.query(Group).filter(Group.id == profile.group_id).first()
            if group:
                # Подсчитываем количество студентов в группе
                group_students_count = db.query(UserProfile).filter(UserProfile.group_id == group.id).count()
                
                group_info = {
                    "id": group.id,
                    "name": group.name,
                    "specialization": group.specialization,
                    "course": group.course,
                    "education_level": group.education_level,
                    "education_form": group.education_form,
                    "admission_year": group.parsed_year,
                    "students_count": group_students_count
                }
    
    return {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "middle_name": student.middle_name,
        "email": student.email,
        "birth_date": student.birth_date.isoformat() if student.birth_date else None,
        "gender": student.gender,
        "is_active": student.is_active,
        "is_verified": student.is_verified,
        "created_at": student.created_at.isoformat() if student.created_at else None,
        "updated_at": student.updated_at.isoformat() if student.updated_at else None,
        "profile": {
            "student_id": profile.student_id if profile else None,
            "phone": profile.phone if profile else None,
            "alternative_email": profile.alternative_email if profile else None,
            "course": profile.course if profile else None,
            "semester": profile.semester if profile else None,
            "education_form": profile.education_form if profile else None,
            "education_level": profile.education_level if profile else None,
            "academic_status": profile.academic_status if profile else None,
            "specialization": profile.specialization if profile else None,
            "faculty_info": faculty_info,
            "department_info": department_info,
            "group_info": group_info,
            "created_at": profile.created_at.isoformat() if profile and profile.created_at else None,
            "updated_at": profile.updated_at.isoformat() if profile and profile.updated_at else None
        }
    }

# ===========================================
# СПРАВОЧНИК ГРУПП
# ===========================================

@router.get("/groups")
async def get_groups(
    page: int = Query(1, ge=1, description="Номер страницы"),
    limit: int = Query(20, ge=1, le=100, description="Количество записей на странице"),
    search: Optional[str] = Query(None, description="Поиск по названию группы или специализации"),
    department_id: Optional[int] = Query(None, description="Фильтр по подразделению"),
    course: Optional[int] = Query(None, description="Фильтр по курсу"),
    education_form: Optional[str] = Query(None, description="Фильтр по форме обучения"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение списка групп с пагинацией и фильтрами"""
    check_directories_access(current_user, db, "groups")
    
    # Базовый запрос
    query = db.query(Group)
    
    # Применяем фильтры
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(Group.name).contains(search_term),
                func.lower(Group.specialization).contains(search_term)
            )
        )
    
    if department_id:
        # Проверяем тип подразделения
        department = db.query(Department).filter(Department.id == department_id).first()
        if department and department.department_type == 'faculty':
            # Для факультета: группы всех его кафедр
            child_departments = db.query(Department).filter(
                Department.parent_id == department_id,
                Department.is_active == True
            ).all()
            child_dept_ids = [child_dept.id for child_dept in child_departments]
            query = query.filter(Group.department_id.in_(child_dept_ids)) if child_dept_ids else query.filter(False)
        else:
            # Для кафедры: только свои группы
            query = query.filter(Group.department_id == department_id)
    
    if course:
        query = query.filter(Group.course == course)
    
    if education_form:
        query = query.filter(Group.education_form == education_form)
    
    # Подсчет общего количества
    total = query.count()
    
    # Пагинация
    offset = (page - 1) * limit
    groups = query.offset(offset).limit(limit).all()
    
    # Формируем ответ с дополнительной информацией
    result = []
    for group in groups:
        # Подсчитываем количество студентов в группе
        students_count = db.query(UserProfile).filter(UserProfile.group_id == group.id).count()
        
        # Получаем информацию о подразделении
        department_info = None
        if group.department_id:
            department = db.query(Department).filter(Department.id == group.department_id).first()
            if department:
                department_info = {
                    "id": department.id,
                    "name": department.name,
                    "short_name": department.short_name,
                    "department_type": department.department_type
                }
        
        group_data = {
            "id": group.id,
            "name": group.name,
            "specialization": group.specialization,
            "course": group.course,
            "education_level": group.education_level,
            "education_form": group.education_form,
            "admission_year": group.parsed_year,
            "students_count": students_count,
            "department_info": department_info,
            "created_at": group.created_at.isoformat() if group.created_at else None
        }
        result.append(group_data)
    
    return {
        "groups": result,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }

@router.get("/groups/{group_id}")
async def get_group_details(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение детальной информации о группе"""
    check_directories_access(current_user, db, "groups")
    
    group = db.query(Group).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    
    # Получаем студентов группы
    students = db.query(User).options(
        joinedload(User.profile)
    ).join(UserProfile).filter(
        UserProfile.group_id == group_id,
        text("roles::text LIKE '%student%'")
    ).all()
    
    # Получаем информацию о подразделении
    department_info = None
    if group.department_id:
        department = db.query(Department).options(
            joinedload(Department.parent)
        ).filter(Department.id == group.department_id).first()
        if department:
            department_info = {
                "id": department.id,
                "name": department.name,
                "short_name": department.short_name,
                "department_type": department.department_type,
                "parent_name": department.parent.name if department.parent else None
            }
    
    # Формируем список студентов
    students_list = []
    for student in students:
        students_list.append({
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "middle_name": student.middle_name,
            "email": student.email,
            "student_id": student.profile.student_id if student.profile else None,
            "is_active": student.is_active
        })
    
    return {
        "id": group.id,
        "name": group.name,
        "specialization": group.specialization,
        "course": group.course,
        "education_level": group.education_level,
        "education_form": group.education_form,
        "admission_year": group.parsed_year,
        "department_info": department_info,
        "students": students_list,
        "students_count": len(students_list),
        "created_at": group.created_at.isoformat() if group.created_at else None
    }

# ===========================================
# СПРАВОЧНИК ПОДРАЗДЕЛЕНИЙ
# ===========================================

@router.get("/departments")
async def get_departments(
    department_type: Optional[str] = Query(None, description="Тип подразделения (faculty, department)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение списка подразделений"""
    check_directories_access(current_user, db, "departments")
    
    query = db.query(Department).filter(Department.is_active == True)
    
    if department_type:
        query = query.filter(Department.department_type == department_type)
    
    departments = query.order_by(Department.name).all()
    
    result = []
    for dept in departments:
        # Подсчитываем связанные сущности с учетом иерархии
        groups_count = 0
        students_count = 0
        
        if dept.department_type == 'faculty':
            # Для факультета: группы всех его кафедр
            child_departments = db.query(Department).filter(
                Department.parent_id == dept.id,
                Department.is_active == True
            ).all()
            child_dept_ids = [child_dept.id for child_dept in child_departments]
            
            # Группы кафедр факультета
            groups_count = db.query(Group).filter(
                Group.department_id.in_(child_dept_ids)
            ).count() if child_dept_ids else 0
            
            # Студенты: напрямую + через группы кафедр
            faculty_groups = db.query(Group).filter(
                Group.department_id.in_(child_dept_ids)
            ).all() if child_dept_ids else []
            faculty_group_ids = [group.id for group in faculty_groups]
            
            students_count = db.query(UserProfile).filter(
                or_(
                    UserProfile.faculty_id == dept.id,
                    UserProfile.group_id.in_(faculty_group_ids) if faculty_group_ids else False
                )
            ).count()
            
        else:
            # Для кафедры: свои группы
            groups_count = db.query(Group).filter(Group.department_id == dept.id).count()
            
            # Студенты: напрямую + через группы кафедры
            dept_groups = db.query(Group).filter(Group.department_id == dept.id).all()
            dept_group_ids = [group.id for group in dept_groups]
            
            students_count = db.query(UserProfile).filter(
                or_(
                    UserProfile.department_id == dept.id,
                    UserProfile.group_id.in_(dept_group_ids) if dept_group_ids else False
                )
            ).count()
        
        # Получаем информацию о родительском подразделении
        parent_info = None
        if dept.parent_id:
            parent = db.query(Department).filter(Department.id == dept.parent_id).first()
            if parent:
                parent_info = {
                    "id": parent.id,
                    "name": parent.name,
                    "short_name": parent.short_name
                }
        
        dept_data = {
            "id": dept.id,
            "name": dept.name,
            "short_name": dept.short_name,
            "department_type": dept.department_type,
            "parent_info": parent_info,
            "groups_count": groups_count,
            "students_count": students_count,
            "created_at": dept.created_at.isoformat() if dept.created_at else None
        }
        result.append(dept_data)
    
    return {"departments": result}

@router.get("/departments/tree")
async def get_departments_tree(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение иерархической структуры подразделений"""
    check_directories_access(current_user, db, "departments")
    
    # Получаем все активные подразделения
    departments = db.query(Department).filter(Department.is_active == True).all()
    
    # Строим иерархию
    def build_tree(parent_id=None):
        children = []
        for dept in departments:
            if dept.parent_id == parent_id:
                # Подсчитываем связанные сущности с учетом иерархии
                groups_count = 0
                students_count = 0
                
                if dept.department_type == 'faculty':
                    # Для факультета: группы всех его кафедр
                    child_departments = db.query(Department).filter(
                        Department.parent_id == dept.id,
                        Department.is_active == True
                    ).all()
                    child_dept_ids = [child_dept.id for child_dept in child_departments]
                    
                    groups_count = db.query(Group).filter(
                        Group.department_id.in_(child_dept_ids)
                    ).count() if child_dept_ids else 0
                    
                    # Студенты: напрямую + через группы кафедр
                    faculty_groups = db.query(Group).filter(
                        Group.department_id.in_(child_dept_ids)
                    ).all() if child_dept_ids else []
                    faculty_group_ids = [group.id for group in faculty_groups]
                    
                    students_count = db.query(UserProfile).filter(
                        or_(
                            UserProfile.faculty_id == dept.id,
                            UserProfile.group_id.in_(faculty_group_ids) if faculty_group_ids else False
                        )
                    ).count()
                    
                else:
                    # Для кафедры: свои группы
                    groups_count = db.query(Group).filter(Group.department_id == dept.id).count()
                    
                    # Студенты: напрямую + через группы кафедры
                    dept_groups = db.query(Group).filter(Group.department_id == dept.id).all()
                    dept_group_ids = [group.id for group in dept_groups]
                    
                    students_count = db.query(UserProfile).filter(
                        or_(
                            UserProfile.department_id == dept.id,
                            UserProfile.group_id.in_(dept_group_ids) if dept_group_ids else False
                        )
                    ).count()
                
                dept_data = {
                    "id": dept.id,
                    "name": dept.name,
                    "short_name": dept.short_name,
                    "department_type": dept.department_type,
                    "groups_count": groups_count,
                    "students_count": students_count,
                    "children": build_tree(dept.id)
                }
                children.append(dept_data)
        return children
    
    return {"departments_tree": build_tree()}

@router.get("/departments/{department_id}")
async def get_department_details(
    department_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение детальной информации о подразделении"""
    check_directories_access(current_user, db, "departments")
    
    department = db.query(Department).filter(
        Department.id == department_id,
        Department.is_active == True
    ).first()
    
    if not department:
        raise HTTPException(status_code=404, detail="Подразделение не найдено")
    
    # Получаем связанные группы с учетом иерархии
    if department.department_type == 'faculty':
        # Для факультета: все группы всех его кафедр
        child_departments = db.query(Department).filter(
            Department.parent_id == department_id,
            Department.is_active == True
        ).all()
        child_dept_ids = [child_dept.id for child_dept in child_departments]
        
        groups = db.query(Group).filter(
            Group.department_id.in_(child_dept_ids)
        ).all() if child_dept_ids else []
    else:
        # Для кафедры: только свои группы
        groups = db.query(Group).filter(Group.department_id == department_id).all()
    
    # Получаем студентов подразделения с учетом иерархии
    if department.department_type == 'faculty':
        # Для факультета: студенты напрямую + через группы кафедр
        child_departments = db.query(Department).filter(
            Department.parent_id == department_id,
            Department.is_active == True
        ).all()
        child_dept_ids = [child_dept.id for child_dept in child_departments]
        
        faculty_groups = db.query(Group).filter(
            Group.department_id.in_(child_dept_ids)
        ).all() if child_dept_ids else []
        faculty_group_ids = [group.id for group in faculty_groups]
        
        students_query = db.query(User).options(
            joinedload(User.profile)
        ).join(UserProfile).filter(
            or_(
                UserProfile.faculty_id == department_id,
                UserProfile.group_id.in_(faculty_group_ids) if faculty_group_ids else False
            ),
            text("roles::text LIKE '%student%'")
        )
    else:
        # Для кафедры: студенты напрямую + через группы кафедры
        dept_groups = db.query(Group).filter(Group.department_id == department_id).all()
        dept_group_ids = [group.id for group in dept_groups]
        
        students_query = db.query(User).options(
            joinedload(User.profile)
        ).join(UserProfile).filter(
            or_(
                UserProfile.department_id == department_id,
                UserProfile.group_id.in_(dept_group_ids) if dept_group_ids else False
            ),
            text("roles::text LIKE '%student%'")
        )
    
    students = students_query.all()
    
    # Получаем дочерние подразделения
    child_departments = db.query(Department).filter(
        Department.parent_id == department_id,
        Department.is_active == True
    ).all()
    
    # Получаем родительское подразделение
    parent_info = None
    if department.parent_id:
        parent = db.query(Department).filter(Department.id == department.parent_id).first()
        if parent:
            parent_info = {
                "id": parent.id,
                "name": parent.name,
                "short_name": parent.short_name,
                "department_type": parent.department_type
            }
    
    # Формируем списки
    groups_list = []
    for group in groups:
        group_students_count = db.query(UserProfile).filter(UserProfile.group_id == group.id).count()
        groups_list.append({
            "id": group.id,
            "name": group.name,
            "specialization": group.specialization,
            "course": group.course,
            "students_count": group_students_count
        })
    
    students_list = []
    for student in students[:50]:  # Ограничиваем до 50 для производительности
        students_list.append({
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "middle_name": student.middle_name,
            "email": student.email,
            "student_id": student.profile.student_id if student.profile else None
        })
    
    child_departments_list = []
    for child in child_departments:
        # Для кафедры: свои группы
        child_groups_count = db.query(Group).filter(Group.department_id == child.id).count()
        
        # Студенты: напрямую + через группы кафедры
        child_dept_groups = db.query(Group).filter(Group.department_id == child.id).all()
        child_dept_group_ids = [group.id for group in child_dept_groups]
        
        child_students_count = db.query(UserProfile).filter(
            or_(
                UserProfile.department_id == child.id,
                UserProfile.group_id.in_(child_dept_group_ids) if child_dept_group_ids else False
            )
        ).count()
        
        child_departments_list.append({
            "id": child.id,
            "name": child.name,
            "short_name": child.short_name,
            "department_type": child.department_type,
            "groups_count": child_groups_count,
            "students_count": child_students_count
        })
    
    return {
        "id": department.id,
        "name": department.name,
        "short_name": department.short_name,
        "department_type": department.department_type,
        "parent_info": parent_info,
        "groups": groups_list,
        "groups_count": len(groups_list),
        "students": students_list,
        "students_count": len(students),
        "child_departments": child_departments_list,
        "created_at": department.created_at.isoformat() if department.created_at else None
    }

# ===========================================
# ОБЩАЯ СТАТИСТИКА
# ===========================================

@router.get("/stats")
async def get_directories_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение общей статистики по справочникам"""
    check_directories_access(current_user, db, "all")
    
    # Подсчитываем основные метрики
    total_students = db.query(User).filter(text("roles::text LIKE '%student%'")).count()
    total_groups = db.query(Group).count()
    total_faculties = db.query(Department).filter(
        Department.department_type == 'faculty',
        Department.is_active == True
    ).count()
    total_departments = db.query(Department).filter(
        Department.department_type == 'department',
        Department.is_active == True
    ).count()
    
    # Статистика по курсам
    course_stats = db.query(
        UserProfile.course,
        func.count(UserProfile.id).label('count')
    ).join(User).filter(
        text("roles::text LIKE '%student%'"),
        UserProfile.course.isnot(None)
    ).group_by(UserProfile.course).all()
    
    # Статистика по формам обучения
    education_form_stats = db.query(
        UserProfile.education_form,
        func.count(UserProfile.id).label('count')
    ).join(User).filter(
        text("roles::text LIKE '%student%'"),
        UserProfile.education_form.isnot(None)
    ).group_by(UserProfile.education_form).all()
    
    return {
        "total_students": total_students,
        "total_groups": total_groups,
        "total_faculties": total_faculties,
        "total_departments": total_departments,
        "course_distribution": [
            {"course": item.course, "count": item.count}
            for item in course_stats
        ],
        "education_form_distribution": [
            {"form": item.education_form, "count": item.count}
            for item in education_form_stats
        ]
    } 