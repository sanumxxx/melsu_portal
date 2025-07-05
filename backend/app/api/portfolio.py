from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import datetime
import os
import uuid
import shutil
from ..database import get_db
from ..models.user import User
from ..models.portfolio import PortfolioAchievement, PortfolioFile, AchievementCategory
from ..schemas.portfolio import (
    PortfolioAchievement as PortfolioAchievementSchema,
    PortfolioAchievementCreate,
    PortfolioAchievementUpdate,
    PortfolioStats,
    FileUploadResponse,
    AchievementCategory as AchievementCategorySchema
)
from ..services.auth_service import verify_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter()
security = HTTPBearer()

# Путь для сохранения файлов портфолио
PORTFOLIO_UPLOAD_DIR = "uploads/portfolio"
os.makedirs(PORTFOLIO_UPLOAD_DIR, exist_ok=True)

# Разрешенные типы файлов
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.txt', '.ppt', '.pptx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    """Получение текущего пользователя"""
    token = credentials.credentials
    email = verify_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

def check_student_access(user: User):
    """Проверка доступа студента к портфолио"""
    if 'student' not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ к портфолио разрешен только студентам"
        )

async def check_portfolio_view_access(user: User, student_id: int, db: Session) -> bool:
    """Проверка доступа к просмотру портфолио студента"""
    # Студент может смотреть свое портфолио
    if user.id == student_id:
        return True
    
    # Администраторы имеют полный доступ
    if 'admin' in user.roles:
        return True
    
    # Проверяем доступ через систему назначений
    from ..models.user_assignment import UserDepartmentAssignment
    from ..models.group import Group
    from ..models.user_profile import UserProfile
    from datetime import date
    
    # Получаем информацию о студенте
    student = db.query(User).options(joinedload(User.profile)).filter(
        User.id == student_id
    ).first()
    
    if not student or not student.profile:
        return False
    
    today = date.today()
    
    # Получаем активные назначения текущего пользователя
    user_assignments = db.query(UserDepartmentAssignment).filter(
        UserDepartmentAssignment.user_id == user.id
    ).filter(
        # Назначение активно, если end_date is None или end_date >= today
        (UserDepartmentAssignment.end_date.is_(None)) | 
        (UserDepartmentAssignment.end_date >= today)
    ).all()
    
    if not user_assignments:
        return False
    
    # Для кураторов - проверяем через группы
    curator_assignments = [a for a in user_assignments if a.assignment_type == 'curator']
    if curator_assignments:
        curator_dept_ids = [a.department_id for a in curator_assignments]
        
        # Получаем группы в подразделениях куратора
        groups = db.query(Group).filter(
            Group.department_id.in_(curator_dept_ids)
        ).all()
        
        if groups:
            group_ids = [group.id for group in groups]
            if student.profile.group_id in group_ids:
                return True
    
    # Для обычных назначений - проверяем через факультеты/кафедры
    regular_assignments = [a for a in user_assignments if a.assignment_type != 'curator']
    if regular_assignments:
        from ..models.department import Department
        
        regular_dept_ids = [a.department_id for a in regular_assignments]
        departments = db.query(Department).filter(Department.id.in_(regular_dept_ids)).all()
        
        # Расширяем список доступных подразделений с учетом иерархии
        accessible_faculty_names = set()
        accessible_department_names = set()
        
        for dept in departments:
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
        
        # Проверяем принадлежность студента к доступным подразделениям
        # Преобразуем имена в ID для сравнения
        accessible_faculty_ids = set()
        accessible_department_ids = set()
        
        for dept in my_departments:
            if dept.department_type == "faculty":
                accessible_faculty_ids.add(dept.id)
            elif dept.department_type == "department":
                accessible_department_ids.add(dept.id)
                # Добавляем родительский факультет если есть
                if dept.parent:
                    accessible_faculty_ids.add(dept.parent.id)
        
        if student.profile.faculty_id in accessible_faculty_ids or \
           student.profile.department_id in accessible_department_ids:
            return True
    
    return False

@router.get("/achievements", response_model=List[PortfolioAchievementSchema])
async def get_achievements(
    category: Optional[AchievementCategorySchema] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение списка достижений пользователя"""
    check_student_access(current_user)
    
    query = db.query(PortfolioAchievement).options(
        joinedload(PortfolioAchievement.files)
    ).filter(PortfolioAchievement.user_id == current_user.id)
    
    if category:
        query = query.filter(PortfolioAchievement.category == category)
    
    achievements = query.order_by(PortfolioAchievement.achievement_date.desc()).all()
    return achievements

@router.post("/achievements", response_model=PortfolioAchievementSchema)
async def create_achievement(
    achievement: PortfolioAchievementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создание нового достижения"""
    check_student_access(current_user)
    
    db_achievement = PortfolioAchievement(
        user_id=current_user.id,
        **achievement.dict()
    )
    
    db.add(db_achievement)
    db.commit()
    db.refresh(db_achievement)
    
    return db_achievement

@router.get("/achievements/{achievement_id}", response_model=PortfolioAchievementSchema)
async def get_achievement(
    achievement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение конкретного достижения"""
    check_student_access(current_user)
    
    achievement = db.query(PortfolioAchievement).options(
        joinedload(PortfolioAchievement.files)
    ).filter(
        PortfolioAchievement.id == achievement_id,
        PortfolioAchievement.user_id == current_user.id
    ).first()
    
    if not achievement:
        raise HTTPException(status_code=404, detail="Достижение не найдено")
    
    return achievement

@router.put("/achievements/{achievement_id}", response_model=PortfolioAchievementSchema)
async def update_achievement(
    achievement_id: int,
    achievement_update: PortfolioAchievementUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновление достижения"""
    check_student_access(current_user)
    
    db_achievement = db.query(PortfolioAchievement).filter(
        PortfolioAchievement.id == achievement_id,
        PortfolioAchievement.user_id == current_user.id
    ).first()
    
    if not db_achievement:
        raise HTTPException(status_code=404, detail="Достижение не найдено")
    
    # Обновляем поля
    update_data = achievement_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_achievement, field, value)
    
    db.commit()
    db.refresh(db_achievement)
    
    return db_achievement

@router.delete("/achievements/{achievement_id}")
async def delete_achievement(
    achievement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удаление достижения"""
    check_student_access(current_user)
    
    db_achievement = db.query(PortfolioAchievement).filter(
        PortfolioAchievement.id == achievement_id,
        PortfolioAchievement.user_id == current_user.id
    ).first()
    
    if not db_achievement:
        raise HTTPException(status_code=404, detail="Достижение не найдено")
    
    # Удаляем связанные файлы с диска
    for file in db_achievement.files:
        file_path = file.file_path
        if os.path.exists(file_path):
            os.remove(file_path)
    
    db.delete(db_achievement)
    db.commit()
    
    return {"message": "Достижение успешно удалено"}

@router.post("/achievements/{achievement_id}/files", response_model=FileUploadResponse)
async def upload_file(
    achievement_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Загрузка файла к достижению"""
    check_student_access(current_user)
    
    # Проверяем что достижение принадлежит пользователю
    achievement = db.query(PortfolioAchievement).filter(
        PortfolioAchievement.id == achievement_id,
        PortfolioAchievement.user_id == current_user.id
    ).first()
    
    if not achievement:
        raise HTTPException(status_code=404, detail="Достижение не найдено")
    
    # Проверяем размер файла
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Файл слишком большой (макс. 10MB)")
    
    # Проверяем расширение файла
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Недопустимый тип файла")
    
    # Генерируем уникальное имя файла
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(PORTFOLIO_UPLOAD_DIR, unique_filename)
    
    # Сохраняем файл
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при сохранении файла: {str(e)}")
    
    # Создаем запись в БД
    db_file = PortfolioFile(
        achievement_id=achievement_id,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=file_path,
        file_size=file.size,
        content_type=file.content_type
    )
    
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    
    return FileUploadResponse(
        filename=unique_filename,
        file_path=file_path,
        file_size=file.size,
        content_type=file.content_type
    )

@router.delete("/files/{file_id}")
async def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удаление файла из достижения"""
    check_student_access(current_user)
    
    # Находим файл и проверяем права доступа
    file_record = db.query(PortfolioFile).join(PortfolioAchievement).filter(
        PortfolioFile.id == file_id,
        PortfolioAchievement.user_id == current_user.id
    ).first()
    
    if not file_record:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    # Удаляем файл с диска
    if os.path.exists(file_record.file_path):
        os.remove(file_record.file_path)
    
    # Удаляем запись из БД
    db.delete(file_record)
    db.commit()
    
    return {"message": "Файл успешно удален"}

@router.get("/stats", response_model=PortfolioStats)
async def get_portfolio_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение статистики портфолио пользователя"""
    check_student_access(current_user)
    
    # Общее количество достижений
    total_achievements = db.query(PortfolioAchievement).filter(
        PortfolioAchievement.user_id == current_user.id
    ).count()
    
    # Статистика по категориям
    achievements_by_category = {}
    for category in AchievementCategory:
        count = db.query(PortfolioAchievement).filter(
            PortfolioAchievement.user_id == current_user.id,
            PortfolioAchievement.category == category
        ).count()
        achievements_by_category[category.value] = count
    
    # Последние достижения
    recent_achievements = db.query(PortfolioAchievement).options(
        joinedload(PortfolioAchievement.files)
    ).filter(
        PortfolioAchievement.user_id == current_user.id
    ).order_by(PortfolioAchievement.created_at.desc()).limit(5).all()
    
    return PortfolioStats(
        total_achievements=total_achievements,
        achievements_by_category=achievements_by_category,
        recent_achievements=recent_achievements
    )

# Новые endpoint'ы для доступа к портфолио студентов

@router.get("/student/{student_id}/achievements", response_model=List[PortfolioAchievementSchema])
async def get_student_achievements(
    student_id: int,
    category: Optional[AchievementCategorySchema] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение списка достижений студента (для кураторов и сотрудников подразделений)"""
    
    # Проверяем доступ
    has_access = await check_portfolio_view_access(current_user, student_id, db)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="У вас нет доступа к портфолио этого студента"
        )
    
    # Проверяем, что пользователь действительно студент
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")
    
    if 'student' not in (student.roles or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Указанный пользователь не является студентом"
        )
    
    query = db.query(PortfolioAchievement).options(
        joinedload(PortfolioAchievement.files)
    ).filter(PortfolioAchievement.user_id == student_id)
    
    if category:
        query = query.filter(PortfolioAchievement.category == category)
    
    achievements = query.order_by(PortfolioAchievement.achievement_date.desc()).all()
    return achievements

@router.get("/student/{student_id}/stats", response_model=PortfolioStats)
async def get_student_portfolio_stats(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение статистики портфолио студента (для кураторов и сотрудников подразделений)"""
    
    # Проверяем доступ
    has_access = await check_portfolio_view_access(current_user, student_id, db)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="У вас нет доступа к портфолио этого студента"
        )
    
    # Проверяем, что пользователь действительно студент
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")
    
    if 'student' not in (student.roles or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Указанный пользователь не является студентом"
        )
    
    # Общее количество достижений
    total_achievements = db.query(PortfolioAchievement).filter(
        PortfolioAchievement.user_id == student_id
    ).count()
    
    # Статистика по категориям
    achievements_by_category = {}
    for category in AchievementCategory:
        count = db.query(PortfolioAchievement).filter(
            PortfolioAchievement.user_id == student_id,
            PortfolioAchievement.category == category
        ).count()
        achievements_by_category[category.value] = count
    
    # Последние достижения
    recent_achievements = db.query(PortfolioAchievement).options(
        joinedload(PortfolioAchievement.files)
    ).filter(
        PortfolioAchievement.user_id == student_id
    ).order_by(PortfolioAchievement.created_at.desc()).limit(5).all()
    
    return PortfolioStats(
        total_achievements=total_achievements,
        achievements_by_category=achievements_by_category,
        recent_achievements=recent_achievements
    )

@router.get("/student/{student_id}/info")
async def get_student_portfolio_info(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение основной информации о студенте для портфолио"""
    
    # Проверяем доступ
    has_access = await check_portfolio_view_access(current_user, student_id, db)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="У вас нет доступа к информации об этом студенте"
        )
    
    # Получаем информацию о студенте с полными связями
    from ..models.department import Department
    
    student = db.query(User).options(
        joinedload(User.profile),
        joinedload(User.profile.group),
        joinedload(User.profile.faculty_info),
        joinedload(User.profile.department_info)
    ).filter(User.id == student_id).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")
    
    if 'student' not in (student.roles or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Указанный пользователь не является студентом"
        )
    
    profile = student.profile
    
    # Получаем информацию о факультете и кафедре
    faculty_info = None
    department_info = None
    
    if profile:
        # Через новые ID поля
        if profile.faculty_id:
            faculty_info = db.query(Department).filter(Department.id == profile.faculty_id).first()
        if profile.department_id:
            department_info = db.query(Department).filter(Department.id == profile.department_id).first()
        
        # Через старые текстовые поля (для совместимости)
        if not faculty_info and profile.faculty:
            faculty_info = db.query(Department).filter(
                Department.name == profile.faculty,
                Department.department_type == 'faculty'
            ).first()
        if not department_info and profile.department:
            department_info = db.query(Department).filter(
                Department.name == profile.department,
                Department.department_type == 'department'
            ).first()
    
    # Формируем полную информацию о группе
    group_info = None
    if profile and profile.group:
        group_info = {
            "id": profile.group.id,
            "name": profile.group.name,
            "specialization": profile.group.specialization,
            "course": profile.group.course,
            "admission_year": profile.group.parsed_year,
            "education_level": profile.group.parsed_education_level or profile.group.education_level,
            "education_form": profile.group.parsed_education_form or profile.group.education_form
        }
    
    return {
        "id": student.id,
        "email": student.email,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "middle_name": student.middle_name,
        "profile": {
            "student_id": profile.student_id if profile else None,
            "phone": profile.phone if profile else None,
            "birth_date": profile.birth_date.isoformat() if profile and profile.birth_date else None,
            "course": profile.course if profile else None,
            "semester": profile.semester if profile else None,
            "education_level": profile.education_level if profile else None,
            "education_form": profile.education_form if profile else None,
            "academic_status": profile.academic_status if profile else None,
            "specialization": profile.specialization if profile else None,
            
            # Факультет
            "faculty_id": profile.faculty_id if profile else None,
            "faculty": profile.faculty if profile else None,
            "faculty_info": {
                "id": faculty_info.id,
                "name": faculty_info.name,
                "short_name": faculty_info.short_name
            } if faculty_info else None,
            
            # Кафедра  
            "department_id": profile.department_id if profile else None,
            "department": profile.department if profile else None,
            "department_info": {
                "id": department_info.id,
                "name": department_info.name,
                "short_name": department_info.short_name,
                "faculty_name": department_info.parent.name if department_info and department_info.parent else None
            } if department_info else None,
            
            # Группа
            "group_id": profile.group_id if profile else None,
            "group": group_info
        }
    } 