#!/usr/bin/env python3
"""
Исправление enum achievementcategory для соответствия нижнему регистру
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Загружаем переменные окружения
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

def main():
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as connection:
            print("🔧 Исправление enum achievementcategory...")
            
            # Удаляем существующие таблицы если есть
            connection.execute(text("DROP TABLE IF EXISTS portfolio_files CASCADE;"))
            connection.execute(text("DROP TABLE IF EXISTS portfolio_achievements CASCADE;"))
            
            # Удаляем старый enum
            connection.execute(text("DROP TYPE IF EXISTS achievementcategory CASCADE;"))
            
            # Создаем новый enum с правильным регистром
            connection.execute(text("""
                CREATE TYPE achievementcategory AS ENUM (
                    'academic', 
                    'sports', 
                    'creative', 
                    'volunteer', 
                    'professional'
                );
            """))
            
            # Пересоздаем таблицы
            connection.execute(text("""
                CREATE TABLE portfolio_achievements (
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
            """))
            
            connection.execute(text("""
                CREATE TABLE portfolio_files (
                    id SERIAL PRIMARY KEY,
                    achievement_id INTEGER NOT NULL REFERENCES portfolio_achievements(id) ON DELETE CASCADE,
                    filename VARCHAR NOT NULL,
                    original_filename VARCHAR NOT NULL,
                    file_path VARCHAR NOT NULL,
                    file_size INTEGER NOT NULL,
                    content_type VARCHAR NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """))
            
            # Создаем индексы
            connection.execute(text("CREATE INDEX ix_portfolio_achievements_id ON portfolio_achievements(id);"))
            connection.execute(text("CREATE INDEX ix_portfolio_achievements_user_id ON portfolio_achievements(user_id);"))
            connection.execute(text("CREATE INDEX ix_portfolio_files_id ON portfolio_files(id);"))
            connection.execute(text("CREATE INDEX ix_portfolio_files_achievement_id ON portfolio_files(achievement_id);"))
            
            connection.commit()
            
            # Проверяем
            result = connection.execute(text("SELECT unnest(enum_range(NULL::achievementcategory))::text;"))
            values = result.fetchall()
            print(f"✅ Enum исправлен! Новые значения: {[v[0] for v in values]}")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    main() 