#!/usr/bin/env python3
"""
Тестирование конфигурации backend и подключения к базе данных
"""

import os
import sys
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from app.core.config import settings
from app.database import engine
from sqlalchemy import text

def test_configuration():
    """Тестирует конфигурацию приложения"""
    print("=" * 60)
    print("         ТЕСТИРОВАНИЕ КОНФИГУРАЦИИ BACKEND")
    print("=" * 60)
    
    print(f"🔧 DATABASE_URL: {settings.DATABASE_URL}")
    print(f"🔐 SECRET_KEY: {'Настроен' if settings.SECRET_KEY != 'melgu-super-secret-key-2025-change-in-production' else 'По умолчанию'}")
    print(f"⏰ TOKEN_EXPIRE: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} минут")
    print(f"📧 MAIL_FROM: {settings.MAIL_FROM}")
    print(f"🖥️  HOST:PORT: {settings.HOST}:{settings.PORT}")
    print(f"🌍 ENVIRONMENT: {settings.ENVIRONMENT}")
    
    # Проверяем тип базы данных
    if "postgresql" in settings.DATABASE_URL.lower():
        print("✅ ИСПОЛЬЗУЕТСЯ POSTGRESQL")
        return test_postgresql_connection()
    elif "sqlite" in settings.DATABASE_URL.lower():
        print("⚠️  ИСПОЛЬЗУЕТСЯ SQLITE")
        return test_sqlite_connection()
    else:
        print("❌ НЕИЗВЕСТНЫЙ ТИП БАЗЫ ДАННЫХ")
        return False

def test_postgresql_connection():
    """Тестирует подключение к PostgreSQL"""
    try:
        print("\n📊 Тестирование подключения к PostgreSQL...")
        
        with engine.connect() as connection:
            # Получаем версию PostgreSQL
            result = connection.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print(f"✅ PostgreSQL версия: {version[:50]}...")
            
            # Проверяем существующие таблицы
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """))
            tables = [row[0] for row in result.fetchall()]
            
            if tables:
                print(f"📋 Таблицы в базе: {', '.join(tables)}")
                
                # Проверяем количество пользователей если таблица существует
                if 'users' in tables:
                    result = connection.execute(text("SELECT COUNT(*) FROM users;"))
                    user_count = result.fetchone()[0]
                    print(f"👥 Количество пользователей: {user_count}")
                    
                if 'email_verifications' in tables:
                    result = connection.execute(text("SELECT COUNT(*) FROM email_verifications;"))
                    verification_count = result.fetchone()[0]
                    print(f"📧 Активных кодов верификации: {verification_count}")
            else:
                print("⚠️  Таблицы не найдены. Выполните миграции: python -m alembic upgrade head")
        
        print("✅ ПОДКЛЮЧЕНИЕ К POSTGRESQL УСПЕШНО!")
        return True
        
    except Exception as e:
        print(f"❌ ОШИБКА ПОДКЛЮЧЕНИЯ К POSTGRESQL: {e}")
        return False

def test_sqlite_connection():
    """Тестирует подключение к SQLite"""
    try:
        print("\n📊 Тестирование подключения к SQLite...")
        
        with engine.connect() as connection:
            result = connection.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
            tables = [row[0] for row in result.fetchall()]
            
            if tables:
                print(f"📋 Таблицы в базе: {', '.join(tables)}")
            else:
                print("⚠️  Таблицы не найдены")
        
        print("✅ ПОДКЛЮЧЕНИЕ К SQLITE УСПЕШНО!")
        return True
        
    except Exception as e:
        print(f"❌ ОШИБКА ПОДКЛЮЧЕНИЯ К SQLITE: {e}")
        return False

if __name__ == "__main__":
    success = test_configuration()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
        print("\nBackend готов к запуску:")
        print("python -m uvicorn app.main:app --reload --port 8000")
    else:
        print("❌ ТЕСТЫ НЕ ПРОЙДЕНЫ!")
        print("\nПроверьте:")
        print("1. Существует ли .env файл в корневой директории")
        print("2. Правильно ли настроен DATABASE_URL")
        print("3. Запущен ли PostgreSQL сервер")
        print("4. Выполнены ли миграции")
    
    print("=" * 60)
    input("\nНажмите Enter для выхода...")
    sys.exit(0 if success else 1) 