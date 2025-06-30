#!/usr/bin/env python3

import sys
import os
sys.path.append('backend')

from backend.app.database import SessionLocal
from backend.app.models.report_template import ReportTemplate
import json

def check_report_templates():
    """Проверяем сохраненные шаблоны отчетов в базе данных"""
    
    db = SessionLocal()
    try:
        print("🔍 Проверяем шаблоны отчетов в базе данных...")
        
        templates = db.query(ReportTemplate).all()
        
        if not templates:
            print("❌ В базе данных нет шаблонов отчетов")
            return
        
        print(f"✅ Найдено {len(templates)} шаблонов:")
        
        for template in templates:
            print(f"\n📋 Шаблон ID: {template.id}")
            print(f"   Название: {template.name}")
            print(f"   Описание: {template.description}")
            print(f"   Активен: {template.is_active}")
            print(f"   Создан: {template.created_at}")
            print(f"   Роли для создания: {template.allowed_roles}")
            print(f"   Зрители: {template.viewers}")
            
            print(f"   Поля ({len(template.fields) if template.fields else 0}):")
            if template.fields:
                for i, field in enumerate(template.fields):
                    print(f"     {i+1}. {field.get('label', 'Без названия')} ({field.get('type', 'unknown')})")
                    print(f"        Имя: {field.get('name', 'Не указано')}")
                    print(f"        Описание: {field.get('description', 'Нет')}")
                    print(f"        Обязательное: {field.get('required', False)}")
                    if field.get('options'):
                        print(f"        Варианты: {len(field['options'])} шт.")
            else:
                print("     ❌ Поля отсутствуют!")
            
            print("   " + "="*50)
    
    except Exception as e:
        print(f"❌ Ошибка при проверке: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_report_templates() 