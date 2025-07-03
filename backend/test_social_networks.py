#!/usr/bin/env python3
"""
Тест для проверки функционала подключения социальных сетей
"""

import requests
import json
from typing import Dict, Any

# Конфигурация для тестов
BASE_URL = "http://localhost:8000"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "testpassword123"

class SocialNetworksTest:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        
    def authenticate(self) -> bool:
        """Аутентификация пользователя"""
        try:
            response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.session.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
                print("✅ Аутентификация прошла успешно")
                return True
            else:
                print(f"❌ Ошибка аутентификации: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Ошибка при аутентификации: {e}")
            return False
    
    def test_social_status(self) -> bool:
        """Тест получения статуса социальных сетей"""
        try:
            response = self.session.get(f"{BASE_URL}/api/profile/social/status")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Получение статуса социальных сетей работает")
                print(f"   Статус: {data}")
                return True
            else:
                print(f"❌ Ошибка получения статуса: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Ошибка при получении статуса: {e}")
            return False
    
    def test_vk_connection(self) -> bool:
        """Тест подключения ВКонтакте"""
        test_cases = [
            {"network_id": "123456789", "should_work": True},
            {"network_id": "test_user", "should_work": True},
            {"network_id": "https://vk.com/id123456789", "should_work": True},
            {"network_id": "https://vk.com/test_user", "should_work": True},
            {"network_id": "vk.com/id123456789", "should_work": True},
            {"network_id": "", "should_work": False},
            {"network_id": "https://vk.com/club123456789", "should_work": False},
        ]
        
        for test_case in test_cases:
            try:
                response = self.session.post(f"{BASE_URL}/api/profile/social/vk/connect", json={
                    "network_id": test_case["network_id"]
                })
                
                if test_case["should_work"]:
                    if response.status_code == 200:
                        print(f"✅ VK подключение работает: {test_case['network_id']}")
                        # Отключаем для следующего теста
                        self.session.delete(f"{BASE_URL}/api/profile/social/vk/disconnect")
                    else:
                        print(f"❌ VK подключение не работает: {test_case['network_id']} (код: {response.status_code})")
                        return False
                else:
                    if response.status_code != 200:
                        print(f"✅ VK валидация работает (отклонено): {test_case['network_id']}")
                    else:
                        print(f"❌ VK валидация не работает (принято): {test_case['network_id']}")
                        # Отключаем если случайно подключилось
                        self.session.delete(f"{BASE_URL}/api/profile/social/vk/disconnect")
                        return False
                        
            except Exception as e:
                print(f"❌ Ошибка при тестировании VK: {e}")
                return False
        
        return True
    
    def test_telegram_connection(self) -> bool:
        """Тест подключения Telegram"""
        test_cases = [
            {"network_id": "test_user", "should_work": True},
            {"network_id": "@test_user", "should_work": True},
            {"network_id": "https://t.me/test_user", "should_work": True},
            {"network_id": "t.me/test_user", "should_work": True},
            {"network_id": "", "should_work": False},
            {"network_id": "https://t.me/+AbCdEf123", "should_work": False},
            {"network_id": "тест_юзер", "should_work": False},
        ]
        
        for test_case in test_cases:
            try:
                response = self.session.post(f"{BASE_URL}/api/profile/social/telegram/connect", json={
                    "network_id": test_case["network_id"]
                })
                
                if test_case["should_work"]:
                    if response.status_code == 200:
                        print(f"✅ Telegram подключение работает: {test_case['network_id']}")
                        # Отключаем для следующего теста
                        self.session.delete(f"{BASE_URL}/api/profile/social/telegram/disconnect")
                    else:
                        print(f"❌ Telegram подключение не работает: {test_case['network_id']} (код: {response.status_code})")
                        return False
                else:
                    if response.status_code != 200:
                        print(f"✅ Telegram валидация работает (отклонено): {test_case['network_id']}")
                    else:
                        print(f"❌ Telegram валидация не работает (принято): {test_case['network_id']}")
                        # Отключаем если случайно подключилось
                        self.session.delete(f"{BASE_URL}/api/profile/social/telegram/disconnect")
                        return False
                        
            except Exception as e:
                print(f"❌ Ошибка при тестировании Telegram: {e}")
                return False
        
        return True
    
    def test_disconnect_functionality(self) -> bool:
        """Тест отключения социальных сетей"""
        try:
            # Подключаем VK
            response = self.session.post(f"{BASE_URL}/api/profile/social/vk/connect", json={
                "network_id": "test_disconnect"
            })
            
            if response.status_code != 200:
                print("❌ Не удалось подключить VK для теста отключения")
                return False
            
            # Отключаем VK
            response = self.session.delete(f"{BASE_URL}/api/profile/social/vk/disconnect")
            
            if response.status_code == 200:
                print("✅ Отключение VK работает")
            else:
                print(f"❌ Отключение VK не работает: {response.status_code}")
                return False
            
            # Подключаем Telegram
            response = self.session.post(f"{BASE_URL}/api/profile/social/telegram/connect", json={
                "network_id": "test_disconnect"
            })
            
            if response.status_code != 200:
                print("❌ Не удалось подключить Telegram для теста отключения")
                return False
            
            # Отключаем Telegram
            response = self.session.delete(f"{BASE_URL}/api/profile/social/telegram/disconnect")
            
            if response.status_code == 200:
                print("✅ Отключение Telegram работает")
            else:
                print(f"❌ Отключение Telegram не работает: {response.status_code}")
                return False
            
            return True
            
        except Exception as e:
            print(f"❌ Ошибка при тестировании отключения: {e}")
            return False
    
    def test_profile_data_integration(self) -> bool:
        """Тест интеграции данных социальных сетей в профиль"""
        try:
            # Подключаем социальные сети
            self.session.post(f"{BASE_URL}/api/profile/social/vk/connect", json={
                "network_id": "test_profile_integration"
            })
            
            self.session.post(f"{BASE_URL}/api/profile/social/telegram/connect", json={
                "network_id": "test_profile_integration"
            })
            
            # Проверяем, что данные есть в профиле
            response = self.session.get(f"{BASE_URL}/api/profile/basic")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("vk_id") == "test_profile_integration" and data.get("telegram_id") == "test_profile_integration":
                    print("✅ Интеграция данных социальных сетей в профиль работает")
                    
                    # Очищаем после теста
                    self.session.delete(f"{BASE_URL}/api/profile/social/vk/disconnect")
                    self.session.delete(f"{BASE_URL}/api/profile/social/telegram/disconnect")
                    
                    return True
                else:
                    print(f"❌ Данные социальных сетей отсутствуют в профиле: vk_id={data.get('vk_id')}, telegram_id={data.get('telegram_id')}")
                    return False
            else:
                print(f"❌ Ошибка получения профиля: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Ошибка при тестировании интеграции: {e}")
            return False
    
    def run_all_tests(self) -> bool:
        """Запуск всех тестов"""
        print("🧪 Запуск тестов функционала социальных сетей...")
        print("=" * 50)
        
        if not self.authenticate():
            print("❌ Тесты прерваны из-за ошибки аутентификации")
            return False
        
        tests = [
            ("Статус социальных сетей", self.test_social_status),
            ("Подключение VK", self.test_vk_connection),
            ("Подключение Telegram", self.test_telegram_connection),
            ("Отключение социальных сетей", self.test_disconnect_functionality),
            ("Интеграция в профиль", self.test_profile_data_integration),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            print(f"\n🔍 Тест: {test_name}")
            print("-" * 30)
            
            try:
                if test_func():
                    passed += 1
                    print(f"✅ {test_name} - ПРОЙДЕН")
                else:
                    failed += 1
                    print(f"❌ {test_name} - ПРОВАЛЕН")
            except Exception as e:
                failed += 1
                print(f"❌ {test_name} - ОШИБКА: {e}")
        
        print("\n" + "=" * 50)
        print(f"📊 Результаты тестирования:")
        print(f"   ✅ Пройдено: {passed}")
        print(f"   ❌ Провалено: {failed}")
        print(f"   📈 Успешность: {passed/(passed+failed)*100:.1f}%")
        
        return failed == 0


def main():
    """Главная функция для запуска тестов"""
    print("🚀 Тестирование функционала социальных сетей")
    print("=" * 50)
    
    # Проверяем доступность сервера
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code != 200:
            print(f"❌ Сервер недоступен: {BASE_URL}")
            return
    except:
        print(f"❌ Не удается подключиться к серверу: {BASE_URL}")
        print("   Убедитесь, что сервер запущен")
        return
    
    # Запускаем тесты
    tester = SocialNetworksTest()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Все тесты пройдены успешно!")
    else:
        print("\n⚠️  Некоторые тесты провалены. Проверьте логи выше.")
    
    print("\n📝 Примечание:")
    print("   Для полноценного тестирования убедитесь, что:")
    print("   1. Сервер запущен на порту 8000")
    print("   2. Существует тестовый пользователь с указанными учетными данными")
    print("   3. База данных содержит актуальные миграции")


if __name__ == "__main__":
    main() 