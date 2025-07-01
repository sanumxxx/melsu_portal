#!/usr/bin/env python3
"""
Тестовый скрипт для проверки email-сервиса МелГУ
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.email_service import email_service

def test_email_service():
    """Тестирует отправку email через сервис МелГУ"""
    
    print("🔧 Тестирование email-сервиса МелГУ")
    print("=" * 50)
    
    # Показываем настройки (без пароля)
    print(f"📧 SMTP Сервер: {email_service.smtp_server}")
    print(f"🔌 SMTP Порт: {email_service.smtp_port}")
    print(f"👤 Отправитель: {email_service.from_email}")
    print(f"📝 Имя отправителя: {email_service.from_name}")
    print()
    
    # Запрашиваем email для тестирования
    test_email = input("Введите email для тестирования: ").strip()
    
    if not test_email:
        print("❌ Email не введен!")
        return
    
    print(f"\n📤 Отправляем тестовый код на {test_email}...")
    
    # Генерируем тестовый код
    test_code = "123456"
    
    try:
        # Отправляем код подтверждения
        success = email_service.send_verification_code(
            to_email=test_email,
            code=test_code,
            user_name="Тестовый Пользователь"
        )
        
        if success:
            print("✅ Email успешно отправлен!")
            print(f"📧 Проверьте почту {test_email}")
        else:
            print("❌ Ошибка при отправке email!")
            
    except Exception as e:
        print(f"💥 Исключение при отправке: {str(e)}")

if __name__ == "__main__":
    test_email_service() 