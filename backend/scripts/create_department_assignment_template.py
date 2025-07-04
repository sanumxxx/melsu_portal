#!/usr/bin/env python3
"""
Скрипт для создания шаблона заявки на привязку к факультету/группе/кафедре
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
from app.models.group import Group

def create_department_assignment_template():
    """Создает шаблон заявки на привязку к факультету/группе/кафедре"""
    
    db = SessionLocal()
    
    try:
        # Проверяем, нет ли уже такого шаблона
        existing_template = db.query(RequestTemplate).filter(
            RequestTemplate.name == "Привязка к факультету/группе/кафедре"
        ).first()
        
        if existing_template:
            print("❌ Шаблон 'Привязка к факультету/группе/кафедре' уже существует")
            return
        
        # Создаем шаблон заявки
        template = RequestTemplate(
            name="Привязка к факультету/группе/кафедре",
            description="Заявка на привязку студента к конкретному факультету, группе и кафедре",
            deadline_days=7,
            is_active=True,
            routing_type="department",
            auto_assign_enabled=True,
            auto_role_assignment_enabled=True,
            role_assignment_rules=[
                {
                    "condition": "always",
                    "action": "update_profile",
                    "fields": ["faculty", "department", "group_id"]
                }
            ]
        )
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        print(f"✅ Создан шаблон заявки: {template.name} (ID: {template.id})")
        
        # Получаем типы полей
        select_type = db.query(FieldType).filter(FieldType.name == "select").first()
        if not select_type:
            select_type = FieldType(
                name="select",
                label="Выпадающий список",
                description="Поле для выбора одного варианта из списка",
                input_type="select",
                has_options=True
            )
            db.add(select_type)
            db.commit()
            db.refresh(select_type)
        
        # Получаем список факультетов
        faculties = db.query(Department).filter(
            Department.department_type == "faculty",
            Department.is_active == True
        ).all()
        
        faculty_options = [{"value": str(f.id), "label": f.name} for f in faculties]
        
        # Создаем поле "Факультет"
        faculty_field = Field(
            template_id=template.id,
            field_type_id=select_type.id,
            name="faculty_id",
            label="Факультет",
            description="Выберите факультет, к которому вы хотите быть привязаны",
            is_required=True,
            is_visible=True,
            sort_order=1,
            options=faculty_options,
            profile_field_mapping="faculty_id",
            update_profile_on_approve=True
        )
        
        db.add(faculty_field)
        
        # Получаем список кафедр
        departments = db.query(Department).filter(
            Department.department_type.in_(["department", "chair"]),
            Department.is_active == True
        ).all()
        
        department_options = [{"value": str(d.id), "label": d.name} for d in departments]
        
        # Создаем поле "Кафедра"
        department_field = Field(
            template_id=template.id,
            field_type_id=select_type.id,
            name="department_id",
            label="Кафедра",
            description="Выберите кафедру, к которой вы хотите быть привязаны",
            is_required=True,
            is_visible=True,
            sort_order=2,
            options=department_options,
            profile_field_mapping="department_id",
            update_profile_on_approve=True
        )
        
        db.add(department_field)
        
        # Получаем список групп
        groups = db.query(Group).all()
        
        group_options = [{"value": str(g.id), "label": g.name} for g in groups]
        
        # Создаем поле "Группа"
        group_field = Field(
            template_id=template.id,
            field_type_id=select_type.id,
            name="group_id",
            label="Группа",
            description="Выберите группу, к которой вы хотите быть привязаны",
            is_required=True,
            is_visible=True,
            sort_order=3,
            options=group_options,
            profile_field_mapping="group_id",
            update_profile_on_approve=True
        )
        
        db.add(group_field)
        
        # Создаем поле "Обоснование"
        text_type = db.query(FieldType).filter(FieldType.name == "textarea").first()
        if not text_type:
            text_type = FieldType(
                name="textarea",
                label="Многострочный текст",
                description="Поле для ввода многострочного текста",
                input_type="textarea",
                has_options=False
            )
            db.add(text_type)
            db.commit()
            db.refresh(text_type)
        
        reason_field = Field(
            template_id=template.id,
            field_type_id=text_type.id,
            name="reason",
            label="Обоснование",
            description="Укажите причину привязки к данному факультету/группе/кафедре",
            placeholder="Например: Перевод с другого факультета, изменение специальности и т.д.",
            is_required=True,
            is_visible=True,
            sort_order=4,
            profile_field_mapping=None,
            update_profile_on_approve=False
        )
        
        db.add(reason_field)
        
        db.commit()
        
        print(f"✅ Созданы поля для шаблона:")
        print(f"  - Факультет (привязка к profile.faculty_id)")
        print(f"  - Кафедра (привязка к profile.department_id)")
        print(f"  - Группа (привязка к profile.group_id)")
        print(f"  - Обоснование")
        print(f"📋 Найдено:")
        print(f"  - Факультетов: {len(faculties)}")
        print(f"  - Кафедр: {len(departments)}")
        print(f"  - Групп: {len(groups)}")
        
        return template
        
    except Exception as e:
        print(f"❌ Ошибка при создании шаблона: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_department_assignment_template() 