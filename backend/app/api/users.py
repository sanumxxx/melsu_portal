from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, text, String, Text, inspect
from pydantic import BaseModel
from ..database import get_db
from ..models.user import User, UserRole
from ..models.user_profile import UserProfile
from ..models.department import Department
from ..models.role import Role
from ..models.group import Group
from ..dependencies import get_current_user
from typing import Optional, List


router = APIRouter()

# Старая схема назначения удалена - используйте новую систему assignments



def get_searchable_fields(model_class) -> List[str]:
    """Получить только текстовые поля модели для поиска"""
    inspector = inspect(model_class)
    searchable_fields = []
    
    # Исключаемые поля (числовые, даты, служебные)
    excluded_fields = {
        'id', 'user_id', 'password_hash', 'created_at', 'updated_at', 
        'birth_date', 'passport_issued_date', 'enrollment_date', 'graduation_date', 'hire_date',
        'course', 'semester', 'children_count', 'work_experience', 'pedagogical_experience'
    }
    
    for column in inspector.columns:
        # Исключаем определенные поля
        if column.name in excluded_fields:
            continue
            
        # Включаем только текстовые поля (String, Text)
        if isinstance(column.type, (String, Text)):
            searchable_fields.append(column.name)
    
    return searchable_fields

def build_dynamic_search_query(search_term: str, db: Session) -> List[int]:
    """Динамически строим поисковый запрос по всем полям моделей"""
    
    # Получаем все текстовые поля из обеих моделей
    user_fields = get_searchable_fields(User)
    profile_fields = get_searchable_fields(UserProfile)
    
    # Строим условия поиска для таблицы users
    user_conditions = []
    for field in user_fields:
        if field == 'gender':
            # Специальная обработка для поля gender
            user_conditions.extend([
                f"(u.gender = 'male' AND :search_term ILIKE '%муж%')",
                f"(u.gender = 'male' AND :search_term ILIKE '%мужск%')", 
                f"(u.gender = 'male' AND :search_term ILIKE '%male%')",
                f"(u.gender = 'female' AND :search_term ILIKE '%жен%')",
                f"(u.gender = 'female' AND :search_term ILIKE '%женск%')",
                f"(u.gender = 'female' AND :search_term ILIKE '%female%')"
            ])
        elif field == '_roles':
            # Специальная обработка для поля ролей (хранится как JSON строка)
            user_conditions.append(f"u._roles ILIKE :search_term")
        else:
            user_conditions.append(f"u.{field} ILIKE :search_term")
    
    # Строим условия поиска для таблицы user_profiles
    profile_conditions = []
    for field in profile_fields:
        # Все поля уже отфильтрованы в get_searchable_fields
        profile_conditions.append(f"p.{field} ILIKE :search_term")
    
    # Объединяем все условия
    all_conditions = user_conditions + profile_conditions
    
    if not all_conditions:
        return []
    
    conditions_sql = " OR ".join(all_conditions)
    
    # Строим финальный SQL-запрос
    sql_query = text(f"""
        SELECT DISTINCT u.id 
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        WHERE u.is_active = true 
        AND ({conditions_sql})
    """)
    
    result = db.execute(sql_query, {"search_term": f"%{search_term}%"})
    user_rows = result.fetchall()
    user_ids = [row.id for row in user_rows]
    
    return user_ids

def build_field_specific_search_query(search_term: str, field: str, db: Session) -> List[int]:
    """Поиск по конкретному полю"""
    
    if field == 'all':
        # Поиск по всем полям
        return build_dynamic_search_query(search_term, db)
    
    # Разбираем поле на таблицу и имя поля
    if '.' not in field:
        return []
    
    table_name, field_name = field.split('.', 1)
    
    if table_name == 'user':
        # Поиск в таблице users
        if field_name == 'gender':
            # Специальная обработка для поля gender
            sql_query = text("""
                SELECT DISTINCT u.id 
                FROM users u
                WHERE u.is_active = true 
                AND (
                    (u.gender = 'male' AND (:search_term ILIKE '%муж%' OR :search_term ILIKE '%мужск%' OR :search_term ILIKE '%male%')) OR
                    (u.gender = 'female' AND (:search_term ILIKE '%жен%' OR :search_term ILIKE '%женск%' OR :search_term ILIKE '%female%')) OR
                    u.gender ILIKE :search_term
                )
            """)
        elif field_name == '_roles':
            sql_query = text("""
                SELECT DISTINCT u.id 
                FROM users u
                WHERE u.is_active = true 
                AND u._roles ILIKE :search_term
            """)
        else:
            # Обычный поиск по полю users
            sql_query = text(f"""
                SELECT DISTINCT u.id 
                FROM users u
                WHERE u.is_active = true 
                AND u.{field_name} ILIKE :search_term
            """)
    
    elif table_name == 'profile':
        # Поиск в таблице user_profiles
        sql_query = text(f"""
            SELECT DISTINCT u.id 
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE u.is_active = true 
            AND p.{field_name} ILIKE :search_term
        """)
    
    else:
        return []
    
    result = db.execute(sql_query, {"search_term": f"%{search_term}%"})
    user_rows = result.fetchall()
    user_ids = [row.id for row in user_rows]
    
    return user_ids

@router.get("/search-fields")
async def get_search_fields():
    """Получить список доступных полей для поиска с их описаниями"""
    
    user_fields = get_searchable_fields(User)
    profile_fields = get_searchable_fields(UserProfile)
    
    # Создаем словарь с описаниями полей на русском
    field_descriptions = {
        # Поля пользователя
        'email': 'Email',
        'first_name': 'Имя',
        'last_name': 'Фамилия', 
        'middle_name': 'Отчество',
        'gender': 'Пол',
        '_roles': 'Роли',
        'roles': 'Роли',
        
        # Поля профиля - контакты
        'phone': 'Телефон',
        'alternative_email': 'Дополнительный email',
        
        # Документы
        'passport_series': 'Серия паспорта',
        'passport_number': 'Номер паспорта',
        'passport_issued_by': 'Кем выдан паспорт',
        'snils': 'СНИЛС',
        'inn': 'ИНН',
        
        # Адреса
        'registration_region': 'Регион регистрации',
        'registration_city': 'Город регистрации',
        'registration_address': 'Адрес регистрации',
        'registration_postal_code': 'Почтовый индекс регистрации',
        'residence_region': 'Регион проживания',
        'residence_city': 'Город проживания',
        'residence_address': 'Адрес проживания',
        'residence_postal_code': 'Почтовый индекс проживания',
        
        # Академическая информация
        'student_id': 'Студенческий билет',
        'faculty': 'Факультет',
        'department': 'Кафедра/Отделение',
        'specialization': 'Специализация',
        'education_level': 'Уровень образования',
        'education_form': 'Форма обучения',
        'funding_type': 'Тип финансирования',
        'academic_status': 'Академический статус',
        
        # Профессиональная информация
        'employee_id': 'Табельный номер',
        'position': 'Должность',
        'employment_type': 'Тип трудоустройства',
        'work_schedule': 'График работы',
        
        # Образование
        'education_degree': 'Ученая степень',
        'education_title': 'Ученое звание',
        'education_institutions': 'Учебные заведения',
        
        # Дополнительная информация
        'marital_status': 'Семейное положение',
        'emergency_contact': 'Контакт для экстренной связи',
        'social_category': 'Социальная категория',
        'military_service': 'Военная служба',
        
        # Достижения
        'gpa': 'Средний балл',
        
        # Социальные сети
        'vk_id': 'ВКонтакте ID',
        'telegram_id': 'Telegram ID',
        'telegram_username': 'Telegram Username',
        
        # Дополнительно (только поля, которые реально существуют в модели)
    }
    
    # Формируем результат
    all_fields = []
    
    # Добавляем опцию "все поля"
    all_fields.append({
        'value': 'all',
        'label': 'Все поля',
        'category': 'system'
    })
    
    # Поля пользователя
    for field in user_fields:
        all_fields.append({
            'value': f'user.{field}',
            'label': field_descriptions.get(field, field),
            'category': 'user'
        })
    
    # Поля профиля
    for field in profile_fields:
        all_fields.append({
            'value': f'profile.{field}',
            'label': field_descriptions.get(field, field),
            'category': 'profile'
        })
    
    return {
        'fields': all_fields,
        'categories': {
            'system': 'Системные',
            'user': 'Основные данные',
            'profile': 'Дополнная информация'
        }
    }



@router.get("/users")
async def get_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    field: Optional[str] = Query("all", description="Поле для поиска (all - все поля)"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Получить список пользователей с фильтрацией по ролям и поиском
    """
    try:
        # Начинаем с базового запроса активных пользователей
        query = db.query(User).filter(User.is_active == True)
        
        # Применяем фильтр по роли через SQL
        if role:
            query = query.filter(User._roles.like(f'%{role}%'))
        
        # Применяем поиск по выбранному полю или всем полям
        if search and search.strip():
            search_term = search.strip()
            
            # Используем поиск по полю
            user_ids = build_field_specific_search_query(search_term, field, db)
            
            if user_ids:
                query = query.filter(User.id.in_(user_ids))
            else:
                # Если ничего не найдено, возвращаем пустой результат
                query = query.filter(User.id == -1)  # Условие, которое никогда не выполнится
        
        # Подсчитываем общее количество
        total = query.count()
        
        # Применяем пагинацию
        offset = (page - 1) * limit
        paginated_users = query.offset(offset).limit(limit).all()
        
        # Формируем ответ
        users_data = []
        for user in paginated_users:
            # Получаем основную информацию о социальных сетях
            profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
            
            user_data = {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "middle_name": user.middle_name,
                "birth_date": user.birth_date.isoformat() if user.birth_date else None,
                "gender": user.gender,
                "roles": user.roles or [],
                "is_verified": user.is_verified,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                # Добавляем информацию о подключенных социальных сетях
                "social_networks": {
                    "vk_connected": bool(profile and profile.vk_id),
                    "telegram_connected": bool(profile and profile.telegram_id),
                    "vk_id": profile.vk_id if profile else None,
                    "telegram_username": profile.telegram_username if profile else None
                }
            }
            users_data.append(user_data)
        
        return {
            "users": users_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            },
            "filter": {
                "role": role,
                "search": search,
                "field": field
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при получении пользователей: {str(e)}"
        )

@router.get("/users/{user_id}")
async def get_user_details(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    DEV ENDPOINT: Получить детальную информацию о пользователе
    ⚠️ ТОЛЬКО ДЛЯ РАЗРАБОТКИ! В продакшене удалить!
    """
    # Получаем пользователя
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Получаем профиль пользователя с подразделением
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    
    # Старая логика поиска подразделения удалена - используйте assignments API
    
    # Старая логика для получения роли в подразделении удалена - используйте assignments
    
    # Базовые данные пользователя
    user_data = {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "middle_name": user.middle_name,
        "birth_date": user.birth_date.isoformat() if user.birth_date else None,
        "gender": user.gender,
        "roles": user.roles or [],
        "is_verified": user.is_verified,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None
    }
    
    # Данные профиля (всегда включаем, даже если профиль не создан)
    profile_data = {
        # Старые поля подразделения удалены - используйте assignments API
        
        # Контактная информация
        "phone": profile.phone if profile else None,
        "alternative_email": profile.alternative_email if profile else None,
        
        # Паспортные данные
        "passport_series": profile.passport_series if profile else None,
        "passport_number": profile.passport_number if profile else None,
        "passport_issued_by": profile.passport_issued_by if profile else None,
        "passport_issued_date": profile.passport_issued_date.isoformat() if profile and profile.passport_issued_date else None,
        "snils": profile.snils if profile else None,
        "inn": profile.inn if profile else None,
        
        # Адрес регистрации
        "registration_region": profile.registration_region if profile else None,
        "registration_city": profile.registration_city if profile else None,
        "registration_address": profile.registration_address if profile else None,
        "registration_postal_code": profile.registration_postal_code if profile else None,
        
        # Адрес проживания
        "residence_region": profile.residence_region if profile else None,
        "residence_city": profile.residence_city if profile else None,
        "residence_address": profile.residence_address if profile else None,
        "residence_postal_code": profile.residence_postal_code if profile else None,
        
        # Академическая информация
        "student_id": profile.student_id if profile else None,
        "course": profile.course if profile else None,
        "semester": profile.semester if profile else None,
        "group": {
            "id": profile.group.id,
            "name": profile.group.name,
            "specialization": profile.group.specialization
        } if profile and profile.group else None,
        "faculty": None,  # Удалено - используйте faculty_id
        "department": None,  # Удалено - используйте department_id
        # Дополнительные поля для совместимости с новой системой
        "faculty_id": profile.faculty_id if profile else None,
        "department_id": profile.department_id if profile else None,
        "specialization": profile.specialization if profile else None,
        "education_level": profile.education_level if profile else None,
        "education_form": profile.education_form if profile else None,
        "funding_type": profile.funding_type if profile else None,
        "enrollment_date": profile.enrollment_date.isoformat() if profile and profile.enrollment_date else None,
        "graduation_date": profile.graduation_date.isoformat() if profile and profile.graduation_date else None,
        "academic_status": profile.academic_status if profile else None,
        
        # Профессиональная информация
        "employee_id": profile.employee_id if profile else None,
        
        "hire_date": profile.hire_date.isoformat() if profile and profile.hire_date else None,
        "employment_type": profile.employment_type if profile else None,
        "work_schedule": profile.work_schedule if profile else None,
        
        # Образование и квалификация
        "education_degree": profile.education_degree if profile else None,
        "education_title": profile.education_title if profile else None,
        
        "work_experience": profile.work_experience if profile else None,
        "pedagogical_experience": profile.pedagogical_experience if profile else None,
        
        # Дополнительная информация
        "marital_status": profile.marital_status if profile else None,
        "children_count": profile.children_count if profile else None,
        "emergency_contact": profile.emergency_contact if profile else None,
        "social_category": profile.social_category if profile else None,
        "military_service": profile.military_service if profile else None,
        
        # Достижения
        "gpa": profile.gpa if profile else None,
        
        # Социальные сети
        "vk_id": profile.vk_id if profile else None,
        "telegram_id": profile.telegram_id if profile else None,
        "telegram_username": profile.telegram_username if profile else None,
        "telegram_user_info": profile.telegram_user_info if profile else None,
        
        # Метаданные
        "created_at": profile.created_at.isoformat() if profile and profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile and profile.updated_at else None
    }
    
    return {
        "user": user_data,
        "profile": profile_data
    }

# Старый эндпоинт assign-department удален - используйте новую систему assignments API





 