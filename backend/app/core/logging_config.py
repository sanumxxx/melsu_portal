import logging
import logging.handlers
import os
from datetime import datetime

def setup_logging():
    """Настройка логирования для приложения"""
    
    # Создаем директорию для логов
    log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # Настройка формата логов
    log_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
    )
    
    # Основной логгер
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)
    
    # Удаляем существующие обработчики
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Обработчик для консоли
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(log_format)
    logger.addHandler(console_handler)
    
    # Обработчик для файла с ротацией
    file_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, 'melsu_portal.log'),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(log_format)
    logger.addHandler(file_handler)
    
    # Отдельный файл для API логов
    api_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, 'api_debug.log'),
        maxBytes=5*1024*1024,  # 5MB
        backupCount=3
    )
    api_handler.setLevel(logging.DEBUG)
    api_handler.setFormatter(log_format)
    
    # Логгер для API
    api_logger = logging.getLogger('app.api')
    api_logger.addHandler(api_handler)
    api_logger.setLevel(logging.DEBUG)
    
    # Отдельный файл для SQL логов
    sql_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, 'sql_debug.log'),
        maxBytes=5*1024*1024,  # 5MB
        backupCount=3
    )
    sql_handler.setLevel(logging.INFO)
    sql_handler.setFormatter(log_format)
    
    # Логгер для SQLAlchemy
    sql_logger = logging.getLogger('sqlalchemy.engine')
    sql_logger.addHandler(sql_handler)
    sql_logger.setLevel(logging.INFO)
    
    logger.info(f"Логирование настроено. Логи сохраняются в: {log_dir}")
    logger.info(f"Уровень логирования: {logger.level}")
    
    return logger 