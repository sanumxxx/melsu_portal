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

# Для SQLite добавляем connect_args (используем настройки из config.py)
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

# Создаем движок SQLAlchemy (используем настройки из config.py)
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

def initialize_database():
    """
    Инициализация базы данных.
    
    Создает таблицы и выполняет начальную настройку.
    """
    try:
        logger.info("🗄️ Инициализация базы данных...")
        
        # Создаем все таблицы
        from . import models  # Импортируем все модели
        Base.metadata.create_all(bind=engine)
        
        logger.info("✅ База данных инициализирована успешно")
        return True
        
    except Exception as e:
        logger.error(f"❌ Ошибка инициализации базы данных: {e}")
        return False

def run_migrations():
    """Выполняет миграции Alembic"""
    try:
        logger.info("🔄 Выполнение миграций...")
        
        # Настраиваем Alembic
        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
        
        # Выполняем миграции до последней версии
        command.upgrade(alembic_cfg, "head")
        
        logger.info("✅ Миграции выполнены успешно")
        return True
        
    except Exception as e:
        logger.error(f"❌ Ошибка выполнения миграций: {e}")
        return False

def check_database_connection():
    """Проверяет подключение к базе данных"""
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            if result.scalar() == 1:
                logger.info("✅ Подключение к базе данных успешно")
                return True
        return False
    except Exception as e:
        logger.error(f"❌ Ошибка подключения к базе данных: {e}")
        return False 