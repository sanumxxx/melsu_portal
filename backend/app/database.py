import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from alembic.config import Config
from alembic import command
import logging
from .core.config import settings

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Получаем URL базы данных
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/university_portal")

# Для SQLite добавляем connect_args
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

# Создаем движок SQLAlchemy
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args
)

# Создаем локальную сессию
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Создаем базовый класс для моделей
Base = declarative_base()

def get_db():
    """Получение сессии базы данных"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_system_roles():
    """Инициализация системных ролей при запуске приложения"""
    try:
        logger.info("🔧 Инициализация системных ролей...")
        
        # Импортируем модели после создания engine
        from .models.role import Role
        from datetime import datetime
        
        # Определяем системные роли
        SYSTEM_ROLES = [
            {
                'name': 'admin',
                'display_name': 'Администратор',
                'description': 'Полный доступ к системе управления университетским порталом.',
                'is_system': True,
                'is_active': True
            },
            {
                'name': 'manager',
                'display_name': 'Менеджер',
                'description': 'Управление заявками и пользователями.',
                'is_system': True,
                'is_active': True
            },
            {
                'name': 'employee',
                'display_name': 'Сотрудник',
                'description': 'Сотрудник университета.',
                'is_system': True,
                'is_active': True
            },
            {
                'name': 'student',
                'display_name': 'Студент',
                'description': 'Студент университета.',
                'is_system': True,
                'is_active': True
            },
            {
                'name': 'teacher',
                'display_name': 'Преподаватель',
                'description': 'Преподаватель университета.',
                'is_system': True,
                'is_active': True
            },
            {
                'name': 'guest',
                'display_name': 'Гость',
                'description': 'Гостевой доступ.',
                'is_system': True,
                'is_active': True
            },
            {
                'name': 'schoolchild',
                'display_name': 'Школьник',
                'description': 'Учащийся школы.',
                'is_system': True,
                'is_active': True
            },
            {
                'name': 'curator',
                'display_name': 'Куратор',
                'description': 'Куратор группы или курса.',
                'is_system': True,
                'is_active': True
            }
        ]
        
        # Создаем сессию
        db = SessionLocal()
        try:
            created_count = 0
            for role_data in SYSTEM_ROLES:
                # Проверяем существование роли
                existing_role = db.query(Role).filter(Role.name == role_data['name']).first()
                
                if not existing_role:
                    # Создаем новую роль
                    new_role = Role(**role_data)
                    db.add(new_role)
                    created_count += 1
                    logger.info(f"✅ Создана роль: {role_data['display_name']} ({role_data['name']})")
            
            if created_count > 0:
                db.commit()
                logger.info(f"✅ Создано {created_count} системных ролей")
            else:
                logger.info("ℹ️ Все системные роли уже существуют")
                
        except Exception as e:
            logger.error(f"❌ Ошибка при создании ролей: {e}")
            db.rollback()
            raise
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Ошибка инициализации системных ролей: {e}")
        # Не прерываем запуск приложения из-за ошибок с ролями
        pass

def run_migrations():
    """Автоматическое выполнение миграций Alembic при старте приложения"""
    try:
        logger.info("🔄 Проверка необходимости выполнения миграций...")
        
        # Получаем путь к файлу alembic.ini
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(current_dir)
        alembic_cfg_path = os.path.join(backend_dir, "alembic.ini")
        
        if not os.path.exists(alembic_cfg_path):
            logger.warning("⚠️ Файл alembic.ini не найден. Пропускаем миграции.")
            return
        
        # Настраиваем конфигурацию Alembic
        alembic_cfg = Config(alembic_cfg_path)
        alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
        alembic_cfg.set_main_option("sqlalchemy.url", DATABASE_URL)
        
        # Проверяем, инициализирована ли Alembic
        try:
            # Проверяем, существует ли таблица alembic_version
            with engine.connect() as conn:
                result = conn.execute(text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_name = 'alembic_version'"
                ))
                if not result.fetchone():
                    logger.info("🚀 Инициализация Alembic (первый запуск)...")
                    command.stamp(alembic_cfg, "head")
                    logger.info("✅ Alembic инициализирован")
        except Exception as e:
            logger.warning(f"⚠️ Не удалось проверить таблицу alembic_version: {e}")
        
        # Выполняем миграции
        logger.info("🔄 Выполнение миграций...")
        command.upgrade(alembic_cfg, "head")
        logger.info("✅ Миграции выполнены успешно")
        
    except Exception as e:
        logger.error(f"❌ Ошибка при выполнении миграций: {e}")
        logger.info("🔄 Попытка создания таблиц через SQLAlchemy...")
        try:
            # Fallback: создаем таблицы напрямую через SQLAlchemy
            Base.metadata.create_all(bind=engine)
            logger.info("✅ Таблицы созданы через SQLAlchemy")
        except Exception as fallback_error:
            logger.error(f"❌ Не удалось создать таблицы: {fallback_error}")
            raise

def check_database_connection():
    """Проверка подключения к базе данных"""
    try:
        logger.info("🔌 Проверка подключения к базе данных...")
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ Подключение к базе данных установлено")
        return True
    except Exception as e:
        logger.error(f"❌ Не удалось подключиться к базе данных: {e}")
        return False

def initialize_database():
    """Полная инициализация базы данных при запуске приложения"""
    logger.info("🚀 Инициализация базы данных...")
    
    # Проверяем подключение
    if not check_database_connection():
        raise Exception("Не удалось подключиться к базе данных")
    
    # Выполняем миграции или создаем таблицы
    run_migrations()
    
    # Инициализируем системные роли
    init_system_roles()
    
    logger.info("✅ База данных инициализирована") 