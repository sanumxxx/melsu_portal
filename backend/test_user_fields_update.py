#!/usr/bin/env python3
"""Тест обновления основных полей пользователя (ФИО, почта)"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db
from app.models.request_template import RequestTemplate
from app.models.field import Field, FieldType
from app.models.user import User
from app.services.profile_update_service import ProfileUpdateService
from sqlalchemy.orm import Session

def test_user_fields_update():
    """Тестирует обновление полей из таблицы users"""
    
    db: Session = next(get_db())
    
    try:
        # Создаем тестовый шаблон заявки
        template = RequestTemplate(
            name="Тест обновления ФИО",
            description="Тестовый шаблон для проверки обновления основных полей пользователя",
            routing_type="manual",
            auto_assign_enabled=False,
            deadline_days=7,
            is_active=True
        )
        db.add(template)
        db.flush()
        
        print(f"✅ Создан тестовый шаблон: {template.name} (ID: {template.id})")
        
        # Создаем поля шаблона, связанные с основными полями пользователя
        test_fields = [
            {
                "name": "new_first_name",
                "label": "Новое имя", 
                "profile_mapping": "first_name",
                "update_on_approve": True
            },
            {
                "name": "new_last_name",
                "label": "Новая фамилия",
                "profile_mapping": "last_name", 
                "update_on_approve": True
            },
            {
                "name": "new_email",
                "label": "Новый email",
                "profile_mapping": "email",
                "update_on_submit": True
            }
        ]
        
        # Получаем тип поля text
        field_type = db.query(FieldType).filter(FieldType.name == "text").first()
        if not field_type:
            field_type = FieldType(
                name="text",
                input_type="text",
                validation_rules={}
            )
            db.add(field_type)
            db.flush()
        
        fields = []
        for field_data in test_fields:
            field = Field(
                template_id=template.id,
                name=field_data["name"],
                label=field_data["label"],
                field_type_id=field_type.id,
                is_required=False,
                is_visible=True,
                sort_order=len(fields),
                profile_field_mapping=field_data["profile_mapping"],
                update_profile_on_submit=field_data.get("update_on_submit", False),
                update_profile_on_approve=field_data.get("update_on_approve", False)
            )
            db.add(field)
            fields.append(field)
        
        db.flush()
        
        print(f"✅ Создано полей: {len(fields)}")
        for field in fields:
            print(f"   • {field.name} -> {field.profile_field_mapping} (на {'подаче' if field.update_profile_on_submit else 'завершении'})")
        
        # Получаем тестового пользователя
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            print("❌ Пользователь с ID=1 не найден")
            return
            
        print(f"\n✅ Тестируем пользователя:")
        print(f"   Текущее ФИО: {user.first_name} {user.last_name}")
        print(f"   Текущий email: {user.email}")
        
        # Тестовые данные заявки
        form_data = {
            "new_first_name": "Александр",
            "new_last_name": "Тестов", 
            "new_email": "aleksandr.testov@melgu.ru"
        }
        
        print(f"\n📝 Данные для обновления: {form_data}")
        
        # Создаем сервис и тестируем обновление при подаче
        profile_service = ProfileUpdateService(db)
        
        print(f"\n🔄 Тестируем обновление при подаче заявки...")
        submit_fields = [f for f in fields if f.update_profile_on_submit]
        result = profile_service._update_profile_fields(user.id, submit_fields, form_data, "submit")
        
        print(f"✅ Результат обновления при подаче:")
        print(f"   Успешно: {result.get('success')}")
        print(f"   Обновлено полей: {result.get('total_updated', 0)}")
        for field_update in result.get('updated_fields', []):
            print(f"      • {field_update['field_label']} ({field_update['table']}): {field_update['old_value']} -> {field_update['new_value']}")
        
        # Проверяем изменения
        db.refresh(user)
        print(f"\n📊 После обновления при подаче:")
        print(f"   ФИО: {user.first_name} {user.last_name}")
        print(f"   Email: {user.email}")
        
        print(f"\n🔄 Тестируем обновление при завершении заявки...")
        approve_fields = [f for f in fields if f.update_profile_on_approve]
        result = profile_service._update_profile_fields(user.id, approve_fields, form_data, "approve")
        
        print(f"✅ Результат обновления при завершении:")
        print(f"   Успешно: {result.get('success')}")
        print(f"   Обновлено полей: {result.get('total_updated', 0)}")
        for field_update in result.get('updated_fields', []):
            print(f"      • {field_update['field_label']} ({field_update['table']}): {field_update['old_value']} -> {field_update['new_value']}")
        
        # Проверяем финальные изменения
        db.refresh(user)
        print(f"\n🎉 Финальный результат:")
        print(f"   ФИО: {user.first_name} {user.last_name}")
        print(f"   Email: {user.email}")
        
        # Откатываем изменения для чистоты тестов
        db.rollback()
        print(f"\n🔄 Изменения отменены для сохранения исходного состояния БД")
        
    except Exception as e:
        print(f"❌ Ошибка: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
    
    finally:
        db.close()

if __name__ == "__main__":
    test_user_fields_update() 