# Настройка Email-сервиса МелГУ

## Конфигурация почты

В файле `app/core/config.py` настроены следующие параметры:

```
MAIL_USERNAME=help@melsu.ru
MAIL_PASSWORD=fl_92||LII_O
MAIL_SERVER=email.melsu.ru
MAIL_PORT=587 (STARTTLS)
MAIL_FROM=help@melsu.ru
MAIL_FROM_NAME=МелГУ - Техническая поддержка
```

## Использование

### 1. Отправка кода подтверждения при регистрации

Код автоматически отправляется при регистрации через `auth_service.py`:

```python
from app.services.email_service import email_service

success = email_service.send_verification_code(
    to_email="user@example.com", 
    code="123456",
    user_name="Иван Иванов"  # опционально
)
```

### 2. Отправка кода для сброса пароля

```python
success = email_service.send_password_reset_code(
    to_email="user@example.com",
    code="654321", 
    user_name="Иван Иванов"  # опционально
)
```

## Тестирование

Запустите тестовый скрипт для проверки:

```bash
cd backend
python test_email_service.py
```

## Особенности

- ✅ Красивые HTML-шаблоны писем в стиле МелГУ
- ✅ Поддержка STARTTLS (587 порт)
- ✅ Fallback в консоль при ошибках отправки
- ✅ Поддержка кириллицы (UTF-8)
- ✅ Автоматическая интеграция с системой регистрации

## Переменные окружения

Создайте файл `.env` в корне проекта:

```env
MAIL_USERNAME=help@melsu.ru
MAIL_PASSWORD=fl_92||LII_O
MAIL_FROM=help@melsu.ru
MAIL_SERVER=email.melsu.ru
MAIL_PORT=587
MAIL_FROM_NAME=МелГУ - Техническая поддержка
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

## Безопасность

🔒 **Важно**: В продакшене обязательно используйте переменные окружения для хранения паролей! 