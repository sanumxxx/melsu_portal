"""
Модуль инициализации приложения при запуске.

Этот модуль содержит функции для автоматической настройки
базы данных и других компонентов при запуске приложения.
"""

import logging
from .database import initialize_database

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def startup_application():
    """
    Выполняет полную инициализацию приложения при запуске.
    
    Включает:
    - Проверку подключения к базе данных
    - Создание таблиц (если их нет)
    - Выполнение миграций
    - Инициализацию системных ролей
    """
    logger.info("🚀 Запуск приложения University Portal...")
    
    try:
        # Инициализируем базу данных
        initialize_database()
        logger.info("✅ Приложение успешно инициализировано")
        
    except Exception as e:
        logger.error(f"❌ Критическая ошибка при инициализации приложения: {e}")
        raise e

def check_required_environment():
    """Проверяет наличие необходимых переменных окружения."""
    import os
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