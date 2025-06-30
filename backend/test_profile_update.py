#!/usr/bin/env python3
"""Тест обновления профиля пользователя"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db
from app.services.profile_update_service import ProfileUpdateService
from app.models.request import Request
from app.models.field import Field
from app.models.user_profile import UserProfile
from sqlalchemy.orm import Session

def test_profile_update():
    """Тестирует обновление профиля для заявки"""
    
    db: Session = next(get_db())
    
    try:
        # Проверяем заявку 18
        request = db.query(Request).filter(Request.id == 18).first()
        if not request:
            print("❌ Заявка 18 не найдена")
            return
        
        print(f"✅ Заявка найдена:")
        print(f"   ID: {request.id}")
        print(f"   Статус: {request.status}")
        print(f"   Автор: {request.author_id}")
        print(f"   Шаблон: {request.template_id}")
        print(f"   Данные формы: {request.form_data}")
        
        # Проверяем поля шаблона
        fields = db.query(Field).filter(
            Field.template_id == request.template_id,
            Field.profile_field_mapping.isnot(None)
        ).all()
        
        print(f"\n✅ Найдено полей с маппингом профиля: {len(fields)}")
        for field in fields:
            print(f"   Поле: {field.name} -> {field.profile_field_mapping}")
            print(f"   При подаче: {field.update_profile_on_submit}")
            print(f"   При одобрении: {field.update_profile_on_approve}")
        
        # Проверяем текущий профиль
        profile = db.query(UserProfile).filter(UserProfile.user_id == request.author_id).first()
        if profile:
            print(f"\n✅ Профиль пользователя найден:")
            print(f"   INN: {profile.inn}")
        else:
            print(f"\n⚠️ Профиль пользователя {request.author_id} не найден")
        
        # Тестируем сервис обновления
        print(f"\n🔄 Тестируем обновление профиля при одобрении...")
        service = ProfileUpdateService(db)
        result = service.update_profile_on_approve(request.id)
        
        print(f"✅ Результат обновления:")
        print(f"   Успешно: {result.get('success')}")
        print(f"   Обновлено полей: {result.get('total_updated', 0)}")
        print(f"   Поля: {result.get('updated_fields', [])}")
        
        if result.get('errors'):
            print(f"   Ошибки: {result.get('errors')}")
        
        # Проверяем профиль после обновления
        if profile:
            db.refresh(profile)
            print(f"\n✅ Профиль после обновления:")
            print(f"   INN: {profile.inn}")
        
    except Exception as e:
        print(f"❌ Ошибка: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    test_profile_update() 