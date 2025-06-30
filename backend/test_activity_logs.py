#!/usr/bin/env python3
"""
Тестовый скрипт для проверки API журнала активности
"""

import requests
import json
from datetime import datetime

# Конфигурация
BASE_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@melsu.ru"
ADMIN_PASSWORD = "admin123"

def login():
    """Логин администратора"""
    print("🔐 Логинимся как администратор...")
    
    login_data = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"✅ Успешный логин! Токен: {token[:20]}...")
        return token
    else:
        print(f"❌ Ошибка логина: {response.status_code} - {response.text}")
        return None

def test_activity_logs_api(token):
    """Тестируем API журнала активности"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n📊 Тестируем API журнала активности...")
    
    # Тест 1: Получить журнал активности
    print("\n1. Получаем журнал активности...")
    response = requests.get(f"{BASE_URL}/api/activity-logs/", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Успешно получен журнал! Найдено {data['total']} записей")
        
        if data['items']:
            print("📝 Последние записи:")
            for item in data['items'][:3]:
                print(f"   - {item['created_at']}: {item['action']} - {item['description']}")
    else:
        print(f"❌ Ошибка получения журнала: {response.status_code} - {response.text}")
    
    # Тест 2: Получить статистику
    print("\n2. Получаем статистику активности...")
    response = requests.get(f"{BASE_URL}/api/activity-logs/stats", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Статистика получена!")
        print(f"   📈 Всего действий за {data['period_days']} дней: {data['total_actions']}")
        print(f"   👥 Уникальных пользователей: {data['unique_users']}")
        
        if data['top_actions']:
            print(f"   🔥 Самое частое действие: {data['top_actions'][0]['action']} ({data['top_actions'][0]['count']} раз)")
    else:
        print(f"❌ Ошибка получения статистики: {response.status_code} - {response.text}")
    
    # Тест 3: Получить свою активность
    print("\n3. Получаем свою активность...")
    response = requests.get(f"{BASE_URL}/api/activity-logs/my", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Получена личная активность! Найдено {len(data)} записей")
        
        if data:
            print("📝 Ваши последние действия:")
            for item in data[:3]:
                print(f"   - {item['created_at']}: {item['action']} - {item['description']}")
    else:
        print(f"❌ Ошибка получения личной активности: {response.status_code} - {response.text}")
    
    # Тест 4: Получить доступные действия
    print("\n4. Получаем список доступных действий...")
    response = requests.get(f"{BASE_URL}/api/activity-logs/actions", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        actions = data['actions']
        print(f"✅ Получен список действий! Доступно {len(actions)} типов действий")
        print(f"   📋 Примеры: {', '.join([a['value'] for a in actions[:5]])}...")
    else:
        print(f"❌ Ошибка получения списка действий: {response.status_code} - {response.text}")

def create_test_activity(token):
    """Создаем тестовую активность для демонстрации"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n🧪 Создаем тестовую активность...")
    
    # Генерируем несколько запросов для создания активности
    test_requests = [
        f"{BASE_URL}/api/announcements/",  # Просмотр объявлений
        f"{BASE_URL}/api/users/all",       # Просмотр пользователей  
        f"{BASE_URL}/profile",             # Просмотр профиля
    ]
    
    for url in test_requests:
        try:
            response = requests.get(url, headers=headers)
            print(f"   📍 Запрос к {url.split('/')[-1]}: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Ошибка запроса к {url}: {e}")

def main():
    """Главная функция"""
    print("🚀 Тестирование системы журнала активности")
    print("=" * 50)
    
    # Логинимся
    token = login()
    if not token:
        return
    
    # Создаем тестовую активность
    create_test_activity(token)
    
    # Тестируем API
    test_activity_logs_api(token)
    
    print("\n" + "=" * 50)
    print("✅ Тестирование завершено!")

if __name__ == "__main__":
    main() 