#!/usr/bin/env python3
"""
Скрипт для тестирования настройки uploads и диагностики проблем с медиафайлами
"""

import os
import sys
import requests
from pathlib import Path

def test_uploads_configuration():
    """Тестирование конфигурации uploads"""
    print("🔍 Тестирование конфигурации uploads...")
    
    # Определяем пути
    script_dir = Path(__file__).parent
    backend_dir = script_dir
    uploads_dir = backend_dir / "uploads"
    announcements_dir = uploads_dir / "announcements"
    
    print(f"📁 Backend directory: {backend_dir}")
    print(f"📁 Uploads directory: {uploads_dir}")
    print(f"📁 Announcements directory: {announcements_dir}")
    
    # Проверяем существование папок
    print(f"✅ Uploads exists: {uploads_dir.exists()}")
    print(f"✅ Announcements exists: {announcements_dir.exists()}")
    
    if uploads_dir.exists():
        files = list(uploads_dir.iterdir())
        print(f"📄 Files in uploads: {len(files)}")
        for file in files[:5]:  # Показываем первые 5 файлов
            print(f"   - {file.name}")
    
    if announcements_dir.exists():
        files = list(announcements_dir.iterdir())
        print(f"📄 Files in announcements: {len(files)}")
        for file in files[:5]:  # Показываем первые 5 файлов
            print(f"   - {file.name}")
    
    return uploads_dir, announcements_dir

def test_api_endpoints():
    """Тестирование API endpoints"""
    print("\n🌐 Тестирование API endpoints...")
    
    base_url = "http://localhost:8000"
    
    # Тестируем health check
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"✅ Health check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False
    
    # Тестируем debug uploads
    try:
        response = requests.get(f"{base_url}/debug/uploads", timeout=5)
        print(f"✅ Debug uploads: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   📁 Uploads directory: {data.get('uploads_directory')}")
            print(f"   📁 Uploads exists: {data.get('uploads_exists')}")
            print(f"   📁 Announcements exists: {data.get('announcements_exists')}")
            print(f"   📄 Announcements files: {data.get('announcements_files_count')}")
    except Exception as e:
        print(f"❌ Debug uploads failed: {e}")
    
    return True

def create_test_file():
    """Создание тестового файла"""
    print("\n📝 Создание тестового файла...")
    
    _, announcements_dir = test_uploads_configuration()
    
    # Создаем тестовый файл
    test_file = announcements_dir / "test.txt"
    test_file.write_text("Test file for uploads diagnosis")
    
    print(f"✅ Created test file: {test_file}")
    return test_file

def test_static_access():
    """Тестирование доступа к статическим файлам"""
    print("\n🔗 Тестирование доступа к статическим файлам...")
    
    test_file = create_test_file()
    
    # Тестируем доступ через HTTP
    base_url = "http://localhost:8000"
    file_url = f"{base_url}/uploads/announcements/test.txt"
    
    try:
        response = requests.get(file_url, timeout=5)
        print(f"✅ Static file access: {response.status_code}")
        if response.status_code == 200:
            print(f"   📄 Content: {response.text[:50]}...")
        else:
            print(f"   ❌ Expected 200, got {response.status_code}")
    except Exception as e:
        print(f"❌ Static file access failed: {e}")
    
    # Удаляем тестовый файл
    test_file.unlink()
    print(f"🗑️ Removed test file")

def main():
    """Основная функция"""
    print("🚀 Диагностика uploads для MelSU Portal")
    print("=" * 50)
    
    # Тестируем конфигурацию
    test_uploads_configuration()
    
    # Тестируем API
    if test_api_endpoints():
        # Тестируем статические файлы
        test_static_access()
    
    print("\n✅ Диагностика завершена!")
    print("\nЕсли проблемы остались:")
    print("1. Проверьте, запущен ли сервер на localhost:8000")
    print("2. Проверьте логи сервера")
    print("3. Проверьте nginx конфигурацию (если используется)")
    print("4. Проверьте права доступа к папке uploads")

if __name__ == "__main__":
    main() 