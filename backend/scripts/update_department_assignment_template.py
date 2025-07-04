#!/usr/bin/env python3
"""
Скрипт для обновления шаблона заявки на привязку к факультету/группе/кафедре
Обновляет поля faculty и department на faculty_id и department_id
"""

import sys
import os
# Добавляем путь к backend директории
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/../')

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.request_template import RequestTemplate
from app.models.field import Field, FieldType
from app.models.department import Department

def update_department_assignment_template():
    """Обновляет шаблон заявки на привязку к факультету/группе/кафедре"""
    
    db = SessionLocal()
    
    try:
        # Находим существующий шаблон
        template = db.query(RequestTemplate).filter(
            RequestTemplate.name == "Привязка к факультету/группе/кафедре"
        ).first()
        
        if not template:
            print("❌ Шаблон 'Привязка к факультету/группе/кафедре' не найден")
            return
        
        print(f"✅ Найден шаблон: {template.name} (ID: {template.id})")
        
        # Получаем тип поля select
        select_type = db.query(FieldType).filter(FieldType.name == "select").first()
        if not select_type:
            print("❌ Тип поля 'select' не найден")
            return
        
        # Обновляем поле факультета
        faculty_field = db.query(Field).filter(
            Field.template_id == template.id,
            Field.name == "faculty"
        ).first()
        
        if faculty_field:
            print("🔄 Обновляем поле факультета...")
            
            # Получаем список факультетов
            faculties = db.query(Department).filter(
                Department.department_type == "faculty",
                Department.is_active == True
            ).all()
            
            faculty_options = [{"value": str(f.id), "label": f.name} for f in faculties]
            
            # Обновляем поле
            faculty_field.name = "faculty_id"
            faculty_field.options = faculty_options
            faculty_field.profile_field_mapping = "faculty_id"
            
            print(f"✅ Поле факультета обновлено. Найдено факультетов: {len(faculties)}")
        else:
            print("⚠️ Поле факультета не найдено")
        
        # Обновляем поле кафедры
        department_field = db.query(Field).filter(
            Field.template_id == template.id,
            Field.name == "department"
        ).first()
        
        if department_field:
            print("🔄 Обновляем поле кафедры...")
            
            # Получаем список кафедр
            departments = db.query(Department).filter(
                Department.department_type.in_(["department", "chair"]),
                Department.is_active == True
            ).all()
            
            department_options = [{"value": str(d.id), "label": d.name} for d in departments]
            
            # Обновляем поле
            department_field.name = "department_id"
            department_field.options = department_options
            department_field.profile_field_mapping = "department_id"
            
            print(f"✅ Поле кафедры обновлено. Найдено кафедр: {len(departments)}")
        else:
            print("⚠️ Поле кафедры не найдено")
        
        # Сохраняем изменения
        db.commit()
        
        print("✅ Шаблон заявки успешно обновлен!")
        print("📋 Теперь поля используют ID вместо названий:")
        print("  - faculty -> faculty_id (привязка к profile.faculty_id)")
        print("  - department -> department_id (привязка к profile.department_id)")
        
        return template
        
    except Exception as e:
        print(f"❌ Ошибка при обновлении шаблона: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    update_department_assignment_template() 