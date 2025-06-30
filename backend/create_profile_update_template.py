#!/usr/bin/env python3
"""
Скрипт для создания шаблона заявки "Обновление профиля"
с полями факультета и кафедры, которые обновляют профиль при одобрении.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db
from app.models.request_template import RequestTemplate
from app.models.field import Field, FieldType
from sqlalchemy.orm import Session

def create_profile_update_template():
    """Создает шаблон заявки для обновления профиля"""
    
    db: Session = next(get_db())
    
    try:
        # Проверяем, есть ли уже такой шаблон
        existing_template = db.query(RequestTemplate).filter(
            RequestTemplate.name == "Обновление профиля"
        ).first()
        
        if existing_template:
            print(f"✅ Шаблон 'Обновление профиля' уже существует (ID: {existing_template.id})")
            return existing_template.id
        
        # Создаем шаблон заявки
        template = RequestTemplate(
            name="Обновление профиля",
            description="Заявка на обновление информации в профиле студента",
            is_active=True,
            auto_assign_enabled=True,
            default_assignees=[1],  # ID админа
            deadline_days=3,
            routing_type="auto_assign"
        )
        
        db.add(template)
        db.flush()  # Получаем ID шаблона
        
        print(f"✅ Создан шаблон заявки: {template.name} (ID: {template.id})")
        
        # Получаем типы полей
        faculty_select_type = db.query(FieldType).filter(FieldType.name == "faculty_select").first()
        department_select_type = db.query(FieldType).filter(FieldType.name == "department_select").first()
        text_type = db.query(FieldType).filter(FieldType.name == "text").first()
        
        if not faculty_select_type:
            print("❌ Тип поля 'faculty_select' не найден")
            return None
            
        if not department_select_type:
            print("❌ Тип поля 'department_select' не найден")
            return None
            
        if not text_type:
            print("❌ Тип поля 'text' не найден")
            return None
        
        # Создаем поля формы
        fields = [
            {
                "name": "faculty",
                "label": "Факультет",
                "description": "Выберите ваш факультет",
                "field_type_id": faculty_select_type.id,
                "is_required": True,
                "sort_order": 1,
                "profile_field_mapping": "faculty",
                "update_profile_on_approve": True
            },
            {
                "name": "department", 
                "label": "Кафедра",
                "description": "Выберите вашу кафедру",
                "field_type_id": department_select_type.id,
                "is_required": True,
                "sort_order": 2,
                "profile_field_mapping": "department",
                "update_profile_on_approve": True
            },
            {
                "name": "reason",
                "label": "Причина обновления",
                "description": "Укажите причину необходимости обновления профиля",
                "field_type_id": text_type.id,
                "is_required": True,
                "sort_order": 3,
                "profile_field_mapping": None,
                "update_profile_on_approve": False
            }
        ]
        
        for field_data in fields:
            field = Field(
                template_id=template.id,
                **field_data
            )
            db.add(field)
            print(f"✅ Создано поле: {field_data['label']}")
        
        db.commit()
        print(f"\n🎉 Шаблон заявки 'Обновление профиля' успешно создан!")
        print(f"   - ID шаблона: {template.id}")
        print(f"   - Количество полей: {len(fields)}")
        print(f"   - Поля с обновлением профиля: faculty, department")
        print(f"   - Обновление происходит: при одобрении заявки")
        
        return template.id
        
    except Exception as e:
        print(f"❌ Ошибка при создании шаблона: {str(e)}")
        db.rollback()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    create_profile_update_template() 