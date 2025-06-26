#!/usr/bin/env python3
"""
Скрипт для создания таблиц портфолио в PostgreSQL
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Загружаем переменные окружения
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(dotenv_path=env_path)

# Получаем URL базы данных
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ Не найден DATABASE_URL в переменных окружения")
    sys.exit(1)

print(f"🔗 Подключение к базе данных: {DATABASE_URL}")

# SQL для создания таблиц портфолио
CREATE_PORTFOLIO_SQL = """
-- Создаем enum для категорий достижений (если не существует)
DO $$ BEGIN
    CREATE TYPE achievementcategory AS ENUM (
        'academic', 
        'sports', 
        'creative', 
        'volunteer', 
        'professional'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Создаем таблицу достижений портфолио (если не существует)
CREATE TABLE IF NOT EXISTS portfolio_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    description TEXT,
    category achievementcategory NOT NULL,
    achievement_date TIMESTAMP WITH TIME ZONE NOT NULL,
    organization VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Создаем индексы для таблицы достижений (если не существуют)
CREATE INDEX IF NOT EXISTS ix_portfolio_achievements_id ON portfolio_achievements(id);
CREATE INDEX IF NOT EXISTS ix_portfolio_achievements_user_id ON portfolio_achievements(user_id);

-- Создаем таблицу файлов портфолио (если не существует)
CREATE TABLE IF NOT EXISTS portfolio_files (
    id SERIAL PRIMARY KEY,
    achievement_id INTEGER NOT NULL REFERENCES portfolio_achievements(id) ON DELETE CASCADE,
    filename VARCHAR NOT NULL,
    original_filename VARCHAR NOT NULL,
    file_path VARCHAR NOT NULL,
    file_size INTEGER NOT NULL,
    content_type VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для таблицы файлов (если не существуют)
CREATE INDEX IF NOT EXISTS ix_portfolio_files_id ON portfolio_files(id);
CREATE INDEX IF NOT EXISTS ix_portfolio_files_achievement_id ON portfolio_files(achievement_id);
"""

def main():
    try:
        # Создаем подключение к базе данных
        engine = create_engine(DATABASE_URL)
        
        print("📊 Создание таблиц портфолио...")
        
        # Выполняем SQL
        with engine.connect() as connection:
            # Используем autocommit для DDL операций
            connection = connection.execution_options(autocommit=True)
            connection.execute(text(CREATE_PORTFOLIO_SQL))
        
        print("✅ Таблицы портфолио успешно созданы!")
        print("\n📋 Созданные объекты:")
        print("   • enum achievementcategory")
        print("   • таблица portfolio_achievements")
        print("   • таблица portfolio_files")
        print("   • индексы для обеих таблиц")
        
    except Exception as e:
        print(f"❌ Ошибка при создании таблиц: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 