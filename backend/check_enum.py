#!/usr/bin/env python3
"""
Проверка существования enum achievementcategory в PostgreSQL
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
            # Проверяем существование enum
            result = connection.execute(text("""
                SELECT EXISTS (
                    SELECT 1 
                    FROM pg_type 
                    WHERE typname = 'achievementcategory'
                );
            """))
            
            exists = result.scalar()
            print(f"🔍 Enum 'achievementcategory' существует: {exists}")
            
            if exists:
                # Проверяем значения enum
                result = connection.execute(text("""
                    SELECT unnest(enum_range(NULL::achievementcategory))::text;
                """))
                values = result.fetchall()
                print(f"📋 Значения enum: {[v[0] for v in values]}")
            else:
                print("❌ Enum не найден, создаем...")
                # Создаем enum
                connection.execute(text("""
                    CREATE TYPE achievementcategory AS ENUM (
                        'academic', 
                        'sports', 
                        'creative', 
                        'volunteer', 
                        'professional'
                    );
                """))
                connection.commit()
                print("✅ Enum создан!")
                
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    main() 