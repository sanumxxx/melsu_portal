import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import sessionmaker
from app.database import engine
from app.models.department import Department

# Создаем сессию
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # Проверяем подразделение с ID 1
    department = db.query(Department).filter(Department.id == 1).first()
    
    if department:
        print(f"Подразделение найдено:")
        print(f"  ID: {department.id}")
        print(f"  Название: {department.name}")
        print(f"  Тип: {department.department_type}")
        print(f"  Активно: {department.is_active}")
        
        if not department.is_active:
            print("❌ ПРОБЛЕМА: Подразделение НЕАКТИВНО!")
        else:
            print("✅ Подразделение активно")
    else:
        print("❌ Подразделение с ID 1 не найдено в базе!")
    
    # Проверим также без фильтра по активности
    print("\n--- Проверка БЕЗ фильтра активности ---")
    department_all = db.query(Department).filter(Department.id == 1).first()
    if department_all:
        print(f"Подразделение существует: {department_all.name} (is_active: {department_all.is_active})")
    else:
        print("Подразделение с ID 1 вообще не существует")

finally:
    db.close() 