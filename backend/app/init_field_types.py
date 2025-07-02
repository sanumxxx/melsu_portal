#!/usr/bin/env python3
"""
Скрипт для инициализации базовых типов полей в системе заявок.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db
from app.models.field import FieldType
from sqlalchemy.orm import Session

def init_field_types():
    """Инициализирует базовые типы полей"""
    
    db: Session = next(get_db())
    
    # Базовые типы полей
    field_types = [
        {
            "name": "text",
            "label": "Текстовое поле",
            "description": "Обычное текстовое поле для ввода",
            "input_type": "text",
            "has_options": False
        },
        {
            "name": "textarea",
            "label": "Многострочный текст",
            "description": "Поле для ввода многострочного текста",
            "input_type": "textarea",
            "has_options": False
        },
        {
            "name": "number",
            "label": "Числовое поле",
            "description": "Поле для ввода чисел",
            "input_type": "number",
            "has_options": False
        },
        {
            "name": "email",
            "label": "Email",
            "description": "Поле для ввода email адреса",
            "input_type": "email",
            "has_options": False
        },
        {
            "name": "phone",
            "label": "Телефон",
            "description": "Поле для ввода номера телефона",
            "input_type": "tel",
            "has_options": False
        },
        {
            "name": "date",
            "label": "Дата",
            "description": "Поле для выбора даты",
            "input_type": "date",
            "has_options": False
        },
        {
            "name": "select",
            "label": "Выпадающий список",
            "description": "Выбор одного варианта из списка",
            "input_type": "select",
            "has_options": True
        },
        {
            "name": "radio",
            "label": "Переключатели",
            "description": "Выбор одного варианта с помощью переключателей",
            "input_type": "radio",
            "has_options": True
        },
        {
            "name": "checkbox",
            "label": "Флажки",
            "description": "Выбор нескольких вариантов",
            "input_type": "checkbox",
            "has_options": True
        },
        {
            "name": "file",
            "label": "Файл",
            "description": "Загрузка файла",
            "input_type": "file",
            "has_options": False
        },
        {
            "name": "faculty_select",
            "label": "Выбор факультета",
            "description": "Динамический список факультетов",
            "input_type": "select",
            "has_options": True
        },
        {
            "name": "department_select",
            "label": "Выбор кафедры",
            "description": "Динамический список кафедр",
            "input_type": "select",
            "has_options": True
        }
    ]
    
    try:
        created_count = 0
        updated_count = 0
        
        for field_type_data in field_types:
            # Проверяем, существует ли уже такой тип
            existing = db.query(FieldType).filter(
                FieldType.name == field_type_data["name"]
            ).first()
            
            if existing:
                # Обновляем существующий
                for key, value in field_type_data.items():
                    if key != "name":  # Не обновляем имя
                        setattr(existing, key, value)
                updated_count += 1
                print(f"🔄 Обновлен тип поля: {field_type_data['name']}")
            else:
                # Создаем новый
                field_type = FieldType(**field_type_data)
                db.add(field_type)
                created_count += 1
                print(f"✅ Создан тип поля: {field_type_data['name']}")
        
        db.commit()
        
        print(f"\n🎉 Инициализация типов полей завершена!")
        print(f"   - Создано новых типов: {created_count}")
        print(f"   - Обновлено существующих: {updated_count}")
        print(f"   - Всего типов в системе: {created_count + updated_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при инициализации типов полей: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    init_field_types() 