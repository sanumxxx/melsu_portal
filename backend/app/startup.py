"""
Модуль инициализации приложения при запуске.

Этот модуль содержит функции для автоматической настройки
базы данных и других компонентов при запуске приложения.
"""

import logging
import os
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text
from datetime import datetime

from .database import get_db
from .models.role import Role
from .models.field import FieldType, Field
from .models.department import Department
from .models.request_template import RequestTemplate

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =====================================================
# СИСТЕМНЫЕ РОЛИ
# =====================================================

SYSTEM_ROLES = [
    {
        'name': 'admin',
        'display_name': 'Администратор',
        'description': 'Полный доступ к системе управления университетским порталом. Может управлять пользователями, ролями, структурой организации и всеми типами заявок.',
        'is_system': True,
        'is_active': True
    },
    {
        'name': 'manager',
        'display_name': 'Менеджер',
        'description': 'Управление заявками и пользователями. Может просматривать и обрабатывать заявки, назначать ответственных, управлять рабочими процессами.',
        'is_system': True,
        'is_active': True
    },
    {
        'name': 'employee',
        'display_name': 'Сотрудник',
        'description': 'Сотрудник университета. Может обрабатывать заявки в рамках своих полномочий, создавать служебные заявки.',
        'is_system': True,
        'is_active': True
    },
    {
        'name': 'student',
        'display_name': 'Студент',
        'description': 'Студент университета. Может создавать и отслеживать свои заявки, просматривать информацию об учебном процессе.',
        'is_system': True,
        'is_active': True
    },
    {
        'name': 'teacher',
        'display_name': 'Преподаватель',
        'description': 'Преподаватель университета. Может создавать и обрабатывать заявки, связанные с учебным процессом, управлять академическими вопросами.',
        'is_system': True,
        'is_active': True
    },
    {
        'name': 'guest',
        'display_name': 'Гость',
        'description': 'Гостевой доступ. Минимальные права для просмотра общедоступной информации.',
        'is_system': True,
        'is_active': True
    },
    {
        'name': 'schoolchild',
        'display_name': 'Школьник',
        'description': 'Учащийся школы. Может просматривать информацию о поступлении и подавать заявки на поступление.',
        'is_system': True,
        'is_active': True
    },
    {
        'name': 'curator',
        'display_name': 'Куратор',
        'description': 'Куратор группы или курса',
        'is_system': True,
        'is_active': True
    }
]

# =====================================================
# ТИПЫ ПОЛЕЙ
# =====================================================

FIELD_TYPES = [
    {
        "name": "text",
        "label": "Текстовое поле",
        "description": "Обычное текстовое поле для ввода",
        "input_type": "text",
        "has_options": False
    },
    {
        "name": "textarea",
        "label": "Многострочный текст",
        "description": "Поле для ввода многострочного текста",
        "input_type": "textarea",
        "has_options": False
    },
    {
        "name": "number",
        "label": "Числовое поле",
        "description": "Поле для ввода чисел",
        "input_type": "number",
        "has_options": False
    },
    {
        "name": "email",
        "label": "Email",
        "description": "Поле для ввода email адреса",
        "input_type": "email",
        "has_options": False
    },
    {
        "name": "phone",
        "label": "Телефон",
        "description": "Поле для ввода номера телефона",
        "input_type": "tel",
        "has_options": False
    },
    {
        "name": "date",
        "label": "Дата",
        "description": "Поле для выбора даты",
        "input_type": "date",
        "has_options": False
    },
    {
        "name": "select",
        "label": "Выпадающий список",
        "description": "Выбор одного варианта из списка",
        "input_type": "select",
        "has_options": True
    },
    {
        "name": "radio",
        "label": "Переключатели",
        "description": "Выбор одного варианта с помощью переключателей",
        "input_type": "radio",
        "has_options": True
    },
    {
        "name": "checkbox",
        "label": "Флажки",
        "description": "Выбор нескольких вариантов",
        "input_type": "checkbox",
        "has_options": True
    },
    {
        "name": "file",
        "label": "Файл",
        "description": "Загрузка файла",
        "input_type": "file",
        "has_options": False
    },
    {
        "name": "faculty_select",
        "label": "Выбор факультета",
        "description": "Динамический список факультетов",
        "input_type": "select",
        "has_options": True
    },
    {
        "name": "department_select",
        "label": "Выбор кафедры",
        "description": "Динамический список кафедр",
        "input_type": "select",
        "has_options": True
    }
]

# =====================================================
# БАЗОВЫЕ ДЕПАРТАМЕНТЫ
# =====================================================

BASE_DEPARTMENTS = [
    {
        "name": "Администрация",
        "description": "Административное управление университета",
        "department_type": "management",
        "is_active": True
    },
    {
        "name": "Деканат",
        "description": "Управление факультетами",
        "department_type": "management",
        "is_active": True
    },
    {
        "name": "Учебная часть",
        "description": "Управление учебным процессом",
        "department_type": "management",
        "is_active": True
    },
    {
        "name": "Приёмная комиссия",
        "description": "Приём абитуриентов",
        "department_type": "service",
        "is_active": True
    },
    {
        "name": "Студенческий отдел",
        "description": "Работа со студентами",
        "department_type": "service",
        "is_active": True
    },
    {
        "name": "Библиотека",
        "description": "Библиотечные услуги",
        "department_type": "service",
        "is_active": True
    },
    {
        "name": "IT-отдел",
        "description": "Информационные технологии",
        "department_type": "service",
        "is_active": True
    }
]

# =====================================================
# ФУНКЦИИ ИНИЦИАЛИЗАЦИИ
# =====================================================

def init_system_roles(db: Session) -> dict:
    """Инициализация системных ролей."""
    stats = {'created': 0, 'updated': 0, 'skipped': 0, 'errors': 0}
    
    logger.info("🔧 Инициализация системных ролей...")
    
    for role_data in SYSTEM_ROLES:
        try:
            existing_role = db.query(Role).filter(Role.name == role_data['name']).first()
            
            if existing_role:
                # Обновляем только если это системная роль
                if existing_role.is_system:
                    for key, value in role_data.items():
                        if key != 'name':
                            setattr(existing_role, key, value)
                    existing_role.updated_at = datetime.utcnow()
                    stats['updated'] += 1
                    logger.info(f"🔄 Обновлена роль: {role_data['display_name']}")
                else:
                    stats['skipped'] += 1
                    logger.info(f"⏩ Пропущена роль: {role_data['display_name']} (пользовательская)")
            else:
                new_role = Role(**role_data)
                db.add(new_role)
                stats['created'] += 1
                logger.info(f"✅ Создана роль: {role_data['display_name']}")
                
        except Exception as e:
            logger.error(f"❌ Ошибка при обработке роли {role_data['name']}: {e}")
            stats['errors'] += 1
    
    return stats

def init_field_types(db: Session) -> dict:
    """Инициализация типов полей."""
    stats = {'created': 0, 'updated': 0, 'skipped': 0, 'errors': 0}
    
    logger.info("🔧 Инициализация типов полей...")
    
    for field_type_data in FIELD_TYPES:
        try:
            existing = db.query(FieldType).filter(
                FieldType.name == field_type_data["name"]
            ).first()
            
            if existing:
                # Обновляем существующий
                for key, value in field_type_data.items():
                    if key != "name":
                        setattr(existing, key, value)
                stats['updated'] += 1
                logger.info(f"🔄 Обновлен тип поля: {field_type_data['name']}")
            else:
                # Создаем новый
                field_type = FieldType(**field_type_data)
                db.add(field_type)
                stats['created'] += 1
                logger.info(f"✅ Создан тип поля: {field_type_data['name']}")
                
        except Exception as e:
            logger.error(f"❌ Ошибка при обработке типа поля {field_type_data['name']}: {e}")
            stats['errors'] += 1
    
    return stats

def init_base_departments(db: Session) -> dict:
    """Инициализация базовых департаментов."""
    stats = {'created': 0, 'updated': 0, 'skipped': 0, 'errors': 0}
    
    logger.info("🔧 Инициализация базовых департаментов...")
    
    for dept_data in BASE_DEPARTMENTS:
        try:
            existing = db.query(Department).filter(
                Department.name == dept_data["name"]
            ).first()
            
            if existing:
                stats['skipped'] += 1
                logger.info(f"⏩ Пропущен департамент: {dept_data['name']} (уже существует)")
            else:
                department = Department(**dept_data)
                db.add(department)
                stats['created'] += 1
                logger.info(f"✅ Создан департамент: {dept_data['name']}")
                
        except Exception as e:
            logger.error(f"❌ Ошибка при обработке департамента {dept_data['name']}: {e}")
            stats['errors'] += 1
    
    return stats

def init_request_templates(db: Session) -> dict:
    """Инициализация шаблонов заявок."""
    stats = {'created': 0, 'updated': 0, 'skipped': 0, 'errors': 0}
    
    logger.info("🔧 Инициализация шаблонов заявок...")
    
    # Получаем ID типов полей
    select_type = db.query(FieldType).filter(FieldType.name == "select").first()
    text_type = db.query(FieldType).filter(FieldType.name == "text").first()
    
    if not select_type or not text_type:
        logger.error("❌ Не найдены необходимые типы полей")
        stats['errors'] += 1
        return stats
    
    # Проверяем существование шаблона привязки к факультету
    existing_template = db.query(RequestTemplate).filter(
        RequestTemplate.name == "Привязка к факультету/кафедре"
    ).first()
    
    if existing_template:
        # Обновляем существующий шаблон
        try:
            # Получаем все факультеты для options
            faculties = db.query(Department).filter(Department.parent_id.is_(None)).all()
            faculty_options = [{"value": str(f.id), "label": f.name} for f in faculties]
            
            # Получаем все кафедры для options
            departments = db.query(Department).filter(Department.parent_id.isnot(None)).all()
            department_options = [{"value": str(d.id), "label": d.name} for d in departments]
            
            # Обновляем базовые поля шаблона
            existing_template.description = "Заявка на привязку студента к факультету и кафедре"
            existing_template.is_active = True
            
            # Удаляем старые поля
            for field in existing_template.fields:
                db.delete(field)
            
            # Создаем новые поля
            # Поле факультета
            faculty_field = Field(
                name="faculty_id",
                label="Факультет",
                field_type_id=select_type.id,
                is_required=True,
                options=faculty_options,
                profile_field_mapping="faculty_id",
                update_profile_on_approve=True,
                template_id=existing_template.id
            )
            db.add(faculty_field)
            
            # Поле кафедры
            department_field = Field(
                name="department_id",
                label="Кафедра",
                field_type_id=select_type.id,
                is_required=True,
                options=department_options,
                profile_field_mapping="department_id",
                update_profile_on_approve=True,
                template_id=existing_template.id
            )
            db.add(department_field)
            
            # Поле группы (опционально)
            group_field = Field(
                name="group_id",
                label="Группа",
                field_type_id=text_type.id,
                is_required=False,
                profile_field_mapping="group_id",
                update_profile_on_approve=True,
                template_id=existing_template.id
            )
            db.add(group_field)
            
            stats['updated'] += 1
            logger.info("🔄 Обновлен шаблон: Привязка к факультету/кафедре")
            
        except Exception as e:
            logger.error(f"❌ Ошибка при обновлении шаблона: {e}")
            stats['errors'] += 1
    else:
        # Создаем новый шаблон
        try:
            # Получаем все факультеты для options
            faculties = db.query(Department).filter(Department.parent_id.is_(None)).all()
            faculty_options = [{"value": str(f.id), "label": f.name} for f in faculties]
            
            # Получаем все кафедры для options
            departments = db.query(Department).filter(Department.parent_id.isnot(None)).all()
            department_options = [{"value": str(d.id), "label": d.name} for d in departments]
            
            # Создаем новый шаблон
            template = RequestTemplate(
                name="Привязка к факультету/кафедре",
                description="Заявка на привязку студента к факультету и кафедре",
                is_active=True
            )
            
            db.add(template)
            db.flush()  # Получаем ID шаблона
            
            # Создаем поля для шаблона
            # Поле факультета
            faculty_field = Field(
                name="faculty_id",
                label="Факультет",
                field_type_id=select_type.id,
                is_required=True,
                options=faculty_options,
                profile_field_mapping="faculty_id",
                update_profile_on_approve=True,
                template_id=template.id
            )
            db.add(faculty_field)
            
            # Поле кафедры
            department_field = Field(
                name="department_id",
                label="Кафедра",
                field_type_id=select_type.id,
                is_required=True,
                options=department_options,
                profile_field_mapping="department_id",
                update_profile_on_approve=True,
                template_id=template.id
            )
            db.add(department_field)
            
            # Поле группы (опционально)
            group_field = Field(
                name="group_id",
                label="Группа",
                field_type_id=text_type.id,
                is_required=False,
                profile_field_mapping="group_id",
                update_profile_on_approve=True,
                template_id=template.id
            )
            db.add(group_field)
            
            stats['created'] += 1
            logger.info("✅ Создан шаблон: Привязка к факультету/кафедре")
            
        except Exception as e:
            logger.error(f"❌ Ошибка при создании шаблона: {e}")
            stats['errors'] += 1
    
    return stats

def check_required_environment():
    """Проверяет наличие необходимых переменных окружения."""
    required_vars = [
        'DATABASE_URL',
        'SECRET_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        logger.warning(f"⚠️ Отсутствуют переменные окружения: {', '.join(missing_vars)}")
        logger.info("ℹ️ Будут использованы значения по умолчанию")
    else:
        logger.info("✅ Все необходимые переменные окружения настроены")

def startup_application():
    """
    Выполняет полную инициализацию приложения при запуске.
    
    Включает:
    - Проверку подключения к базе данных
    - Инициализацию системных ролей
    - Инициализацию типов полей
    - Инициализацию базовых департаментов
    - Инициализацию шаблонов заявок
    """
    logger.info("🚀 Запуск приложения University Portal...")
    
    try:
        # Получаем сессию базы данных
        db: Session = next(get_db())
        
        try:
            # Проверяем подключение к БД
            db.execute(text("SELECT 1"))
            logger.info("✅ Подключение к базе данных установлено")
            
            # Инициализируем системные роли
            roles_stats = init_system_roles(db)
            
            # Инициализируем типы полей
            fields_stats = init_field_types(db)
            
            # Инициализируем базовые департаменты
            depts_stats = init_base_departments(db)
            
            # Инициализируем шаблоны заявок
            templates_stats = init_request_templates(db)
            
            # Сохраняем все изменения
            db.commit()
            
            # Выводим общую статистику
            total_created = roles_stats['created'] + fields_stats['created'] + depts_stats['created'] + templates_stats['created']
            total_updated = roles_stats['updated'] + fields_stats['updated'] + depts_stats['updated'] + templates_stats['updated']
            total_errors = roles_stats['errors'] + fields_stats['errors'] + depts_stats['errors'] + templates_stats['errors']
            
            logger.info("📊 Общая статистика инициализации:")
            logger.info(f"   ✅ Создано объектов: {total_created}")
            logger.info(f"   🔄 Обновлено объектов: {total_updated}")
            logger.info(f"   ❌ Ошибок: {total_errors}")
            
            if total_errors == 0:
                logger.info("🎉 Приложение успешно инициализировано!")
            else:
                logger.warning(f"⚠️ Инициализация завершена с ошибками: {total_errors}")
            
        except Exception as e:
            logger.error(f"❌ Ошибка при работе с базой данных: {e}")
            db.rollback()
            raise e
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Критическая ошибка при инициализации приложения: {e}")
        # Не поднимаем исключение, чтобы приложение могло запуститься
        # даже если инициализация не удалась
        logger.info("⚠️ Приложение запускается без полной инициализации") 