#!/usr/bin/env python3
"""Тест завершения заявки через API"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db
from app.models.request import Request, RequestStatus
from app.models.user_profile import UserProfile
from app.schemas.request import RequestUpdate
from app.api.requests import update_request
from app.dependencies import UserInfo
from sqlalchemy.orm import Session

async def test_complete_request():
    """Тестирует завершение заявки через API update_request"""
    
    db: Session = next(get_db())
    
    try:
        # Создаем или находим заявку для тестирования
        request = db.query(Request).filter(
            Request.status == RequestStatus.APPROVED.value
        ).first()
        
        if not request:
            print("❌ Нет заявок в статусе APPROVED для тестирования")
            # Попробуем найти любую заявку и изменить её статус
            request = db.query(Request).filter(Request.id == 18).first()
            if request:
                request.status = RequestStatus.APPROVED.value
                db.commit()
                print(f"✅ Заявка {request.id} переведена в статус APPROVED для тестирования")
            else:
                print("❌ Заявка с ID=18 не найдена")
                return
        
        print(f"✅ Тестируем завершение заявки:")
        print(f"   ID: {request.id}")
        print(f"   Текущий статус: {request.status}")
        print(f"   Автор: {request.author_id}")
        print(f"   Данные формы: {request.form_data}")
        
        # Проверяем профиль пользователя ДО обновления
        profile = db.query(UserProfile).filter(UserProfile.user_id == request.author_id).first()
        old_inn = profile.inn if profile else None
        print(f"   Текущий INN в профиле: {old_inn}")
        
        # Создаем объект обновления заявки
        request_update = RequestUpdate(status=RequestStatus.COMPLETED.value)
        
        # Создаем мок пользователя (исполнителя)
        current_user = UserInfo(
            id=request.assignee_id or request.author_id,  # Если нет исполнителя, берем автора
            email="test@test.ru",
            first_name="Test",
            last_name="User",
            middle_name=None,
            roles=["admin"],  # Админ может завершать любые заявки
            is_active=True,
            is_verified=True
        )
        
        print(f"\n🔄 Завершаем заявку через update_request API...")
        
        # Вызываем API функцию напрямую
        updated_request = await update_request(
            request_id=request.id,
            request_update=request_update,
            db=db,
            current_user=current_user
        )
        
        print(f"✅ Заявка обновлена:")
        print(f"   Новый статус: {updated_request.status}")
        
        # Проверяем профиль пользователя ПОСЛЕ обновления
        db.refresh(profile)
        new_inn = profile.inn if profile else None
        print(f"   Новый INN в профиле: {new_inn}")
        
        if old_inn != new_inn:
            print(f"🎉 Профиль успешно обновлен: {old_inn} -> {new_inn}")
        else:
            print(f"⚠️ Профиль не изменился")
        
    except Exception as e:
        print(f"❌ Ошибка: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_complete_request()) 