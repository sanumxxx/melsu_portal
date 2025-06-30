import requests
import json

# Тестовые данные для создания шаблона
test_template = {
    "name": "Тестовый шаблон отчета",
    "description": "Тест сохранения полей",
    "fields": [
        {
            "name": "test_field",
            "label": "Тестовое поле",
            "description": "Описание тестового поля",
            "type": "text",
            "required": True,
            "placeholder": "Введите текст",
            "options": []
        },
        {
            "name": "select_field",
            "label": "Поле выбора",
            "description": "Тест селекта",
            "type": "select",
            "required": False,
            "placeholder": "Выберите вариант",
            "options": [
                {"label": "Вариант 1", "value": "option1"},
                {"label": "Вариант 2", "value": "option2"}
            ]
        }
    ],
    "allowed_roles": ["admin"],
    "viewers": [{"type": "role", "value": "admin"}],
    "is_active": True
}

def test_create_template():
    url = "http://localhost:8000/api/report-templates/"
    headers = {
        "Content-Type": "application/json",
        # Здесь нужно добавить токен авторизации
        # "Authorization": "Bearer YOUR_TOKEN"
    }
    
    print("Отправляем запрос на создание шаблона...")
    print("URL:", url)
    print("Данные:", json.dumps(test_template, indent=2, ensure_ascii=False))
    
    try:
        response = requests.post(url, json=test_template, headers=headers)
        print(f"Статус ответа: {response.status_code}")
        print(f"Ответ сервера: {response.text}")
        
        if response.status_code == 201:
            print("✅ Шаблон успешно создан!")
            return response.json()
        else:
            print("❌ Ошибка создания шаблона")
            return None
            
    except Exception as e:
        print(f"❌ Ошибка запроса: {e}")
        return None

if __name__ == "__main__":
    test_create_template() 