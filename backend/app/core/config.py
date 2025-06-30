import os
from typing import Optional
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла в корне проекта
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
env_path = os.path.join(project_root, '.env')
load_dotenv(dotenv_path=env_path)

class DatabaseConfig:
    """Конфигурация базы данных"""
    # По умолчанию используем PostgreSQL для производства  
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://melsu_dev:Yandex200515_@localhost:5432/university_portal")
    
    # Для PostgreSQL используйте:
    # DATABASE_URL=postgresql://postgres:password@localhost:5432/university_portal

class JWTConfig:
    """Конфигурация JWT"""
    SECRET_KEY: str = os.getenv("SECRET_KEY", "melgu-super-secret-key-2025-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

class EmailConfig:
    """Конфигурация email"""
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "")
    MAIL_FROM: str = os.getenv("MAIL_FROM", "noreply@melgu.ru")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", "587"))
    MAIL_SERVER: str = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_FROM_NAME: str = os.getenv("MAIL_FROM_NAME", "МелГУ - Система управления")

class ServerConfig:
    """Конфигурация сервера"""
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

class Settings:
    """Основная конфигурация приложения МелГУ"""
    
    # База данных
    DATABASE_URL = DatabaseConfig.DATABASE_URL
    
    # JWT
    SECRET_KEY = JWTConfig.SECRET_KEY
    ALGORITHM = JWTConfig.ALGORITHM
    ACCESS_TOKEN_EXPIRE_MINUTES = JWTConfig.ACCESS_TOKEN_EXPIRE_MINUTES
    
    # Email
    MAIL_USERNAME = EmailConfig.MAIL_USERNAME
    MAIL_PASSWORD = EmailConfig.MAIL_PASSWORD
    MAIL_FROM = EmailConfig.MAIL_FROM
    MAIL_PORT = EmailConfig.MAIL_PORT
    MAIL_SERVER = EmailConfig.MAIL_SERVER
    MAIL_FROM_NAME = EmailConfig.MAIL_FROM_NAME
    
    # Сервер
    HOST = ServerConfig.HOST
    PORT = ServerConfig.PORT
    DEBUG = ServerConfig.DEBUG
    ENVIRONMENT = ServerConfig.ENVIRONMENT

settings = Settings()

# Вывод конфигурации при запуске (только в режиме разработки)
if settings.DEBUG:
    print("🔧 Конфигурация МелГУ:")
    print(f"   📊 База данных: {settings.DATABASE_URL}")
    print(f"   🖥️  Сервер: {settings.HOST}:{settings.PORT}")
    print(f"   📧 Email: {settings.MAIL_FROM}")
    print(f"   🔐 JWT: {'Настроен' if settings.SECRET_KEY != 'melgu-super-secret-key-2025-change-in-production' else 'По умолчанию (измените в продакшн!)'}")
    print(f"   🌍 Режим: {settings.ENVIRONMENT}") 