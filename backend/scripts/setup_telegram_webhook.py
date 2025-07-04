#!/usr/bin/env python3
"""
Скрипт для настройки Telegram webhook
"""
import sys
import os
import asyncio

# Добавляем корневую папку проекта в PYTHONPATH
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, project_root)

# Добавляем папку backend в PYTHONPATH
backend_root = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, backend_root)

from app.services.telegram_service import telegram_service
from app.core.config import settings

async def setup_webhook():
    """Установка webhook для Telegram бота"""
    print("🔧 Настройка Telegram webhook...")
    
    # Получаем информацию о боте
    bot_info = await telegram_service.get_bot_info()
    if bot_info:
        print(f"✅ Бот найден: @{bot_info.get('username')} ({bot_info.get('first_name')})")
    else:
        print("❌ Не удалось получить информацию о боте. Проверьте токен.")
        return False
    
    # Устанавливаем webhook
    webhook_url = settings.TELEGRAM_WEBHOOK_URL
    print(f"🔗 Установка webhook: {webhook_url}")
    
    success = await telegram_service.set_webhook(webhook_url)
    
    if success:
        print("✅ Webhook успешно установлен!")
        print(f"📡 URL: {webhook_url}")
        print(f"🤖 Бот: @{bot_info.get('username') if bot_info else 'unknown'}")
        return True
    else:
        print("❌ Ошибка установки webhook")
        return False

async def remove_webhook():
    """Удаление webhook"""
    print("🗑️ Удаление Telegram webhook...")
    
    success = await telegram_service.set_webhook("")
    
    if success:
        print("✅ Webhook успешно удален!")
        return True
    else:
        print("❌ Ошибка удаления webhook")
        return False

async def main():
    """Главная функция"""
    if len(sys.argv) < 2:
        print("Использование:")
        print("  python setup_telegram_webhook.py setup    - установить webhook")
        print("  python setup_telegram_webhook.py remove   - удалить webhook")
        print("  python setup_telegram_webhook.py info     - информация о боте")
        return
    
    command = sys.argv[1].lower()
    
    if command == "setup":
        await setup_webhook()
    elif command == "remove":
        await remove_webhook()
    elif command == "info":
        print("🤖 Информация о Telegram боте:")
        print(f"Token: {settings.TELEGRAM_BOT_TOKEN[:10]}...")
        print(f"Webhook URL: {settings.TELEGRAM_WEBHOOK_URL}")
        
        bot_info = await telegram_service.get_bot_info()
        if bot_info:
            print(f"Username: @{bot_info.get('username')}")
            print(f"Name: {bot_info.get('first_name')}")
            print(f"ID: {bot_info.get('id')}")
        else:
            print("❌ Не удалось получить информацию о боте")
    else:
        print(f"❌ Неизвестная команда: {command}")

if __name__ == "__main__":
    asyncio.run(main()) 