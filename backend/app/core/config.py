import os
from typing import Optional
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла в корне проекта (с обработкой ошибок)
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
env_path = os.path.join(project_root, '.env')

# Безопасная загрузка .env файла
try:
    if os.path.exists(env_path):
        load_dotenv(dotenv_path=env_path, encoding='utf-8')
        print(f"✅ Загружен .env файл: {env_path}")
    else:
        print(f"ℹ️ .env файл не найден: {env_path}")
        print("ℹ️ Используем переменные окружения и значения по умолчанию")
except Exception as e:
    print(f"⚠️ Ошибка загрузки .env файла: {e}")
    print("ℹ️ Используем переменные окружения и значения по умолчанию")

class DatabaseConfig:
    """Конфигурация базы данных """
    # По умолчанию используем PostgreSQL для производства  
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://melsu_user:MelsuPortal2024!@localhost/melsu_db")
    
    # Для PostgreSQL используйте:
    # DATABASE_URL=postgresql://postgres:password@localhost:5432/university_portal

class JWTConfig:
    """Конфигурация JWT"""
    SECRET_KEY: str = os.getenv("SECRET_KEY", "melgu-super-secret-key-2025-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

class EmailConfig:
    """Конфигурация email"""
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "help@melsu.ru")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "fl_92||LII_O0") 
    MAIL_FROM: str = os.getenv("MAIL_FROM", "help@melsu.ru")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", "587"))
    MAIL_SERVER: str = os.getenv("MAIL_SERVER", "email.melsu.ru")
    MAIL_FROM_NAME: str = os.getenv("MAIL_FROM_NAME", "МелГУ - Техническая поддержка")
    MAIL_STARTTLS: bool = os.getenv("MAIL_STARTTLS", "True").lower() == "true"
    MAIL_USE_TLS: bool = os.getenv("MAIL_USE_TLS", "False").lower() == "true"
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

class OAuthConfig:
    """Конфигурация OAuth"""
    # VK OAuth
    VK_CLIENT_ID: str = os.getenv("VK_CLIENT_ID", "53853965")
    VK_CLIENT_SECRET: str = os.getenv("VK_CLIENT_SECRET", "tWHc2hBJ0x4pRqyzzk6N")
    VK_SERVICE_KEY: str = os.getenv("VK_SERVICE_KEY", "64ce093264ce093264ce09323667fbb63f664ce64ce09320ca8ef7e96140ae9209c2e5c")
    
    # Telegram OAuth
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "your_telegram_bot_token")

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
    FRONTEND_URL = EmailConfig.FRONTEND_URL
    
    # OAuth
    VK_CLIENT_ID = OAuthConfig.VK_CLIENT_ID
    VK_CLIENT_SECRET = OAuthConfig.VK_CLIENT_SECRET
    VK_SERVICE_KEY = OAuthConfig.VK_SERVICE_KEY
    TELEGRAM_BOT_TOKEN = OAuthConfig.TELEGRAM_BOT_TOKEN
    
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