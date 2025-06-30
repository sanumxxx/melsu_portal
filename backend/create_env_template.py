#!/usr/bin/env python3
"""
Скрипт для создания шаблона .env файла для University Portal.

Этот скрипт создает базовый .env файл с настройками по умолчанию,
который можно адаптировать под конкретное окружение.
"""

import os
from pathlib import Path

def create_env_template():
    """Создает шаблон .env файла в корне проекта."""
    
    # Определяем путь к корню проекта (на уровень выше backend)
    backend_dir = Path(__file__).parent
    project_root = backend_dir.parent
    env_file_path = project_root / '.env'
    
    # Шаблон .env файла
    env_template = """# University Portal - Настройки окружения
# Скопируйте этот файл и настройте значения для вашего окружения

# === БАЗА ДАННЫХ ===
# PostgreSQL (рекомендуется для продакшена)
DATABASE_URL=postgresql://postgres:password@localhost:5432/university_portal

# SQLite (для разработки)
# DATABASE_URL=sqlite:///./university_portal.db

# === БЕЗОПАСНОСТЬ ===
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# === ПРИЛОЖЕНИЕ ===
APP_NAME=University Portal
APP_VERSION=1.0.0
DEBUG=true

# === EMAIL (опционально) ===
# SMTP_SERVER=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USERNAME=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
# MAIL_FROM=your-email@gmail.com

# === CORS ===
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# === ФАЙЛЫ ===
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# === ЛОГИРОВАНИЕ ===
LOG_LEVEL=INFO
"""
    
    # Проверяем, существует ли уже .env файл
    if env_file_path.exists():
        print(f"⚠️  Файл {env_file_path} уже существует.")
        response = input("Перезаписать? (y/N): ").lower().strip()
        if response != 'y':
            print("❌ Операция отменена.")
            return False
    
    try:
        # Создаем .env файл
        with open(env_file_path, 'w', encoding='utf-8') as f:
            f.write(env_template)
        
        print(f"✅ Создан файл {env_file_path}")
        print("ℹ️  Не забудьте настроить значения переменных для вашего окружения!")
        print("⚠️  Особенно важно изменить SECRET_KEY и настроить DATABASE_URL")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при создании файла: {e}")
        return False

if __name__ == "__main__":
    print("🎓 Создание шаблона .env файла для University Portal")
    print("=" * 60)
    
    success = create_env_template()
    
    if success:
        print("\n🎉 Шаблон .env файла создан успешно!")
        print("\nСледующие шаги:")
        print("1. Настройте переменные окружения в .env файле")
        print("2. Установите и настройте базу данных")
        print("3. Запустите приложение: python -m uvicorn app.main:app --reload")
    else:
        print("\n❌ Не удалось создать шаблон .env файла")
        exit(1) 