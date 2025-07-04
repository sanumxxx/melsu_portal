# Руководство по настройке Telegram интеграции для MELSU Portal

## Обзор

Данное руководство поможет вам настроить интеграцию с Telegram для отправки уведомлений пользователям и подключения их аккаунтов Telegram к профилям в системе.

## 1. Создание Telegram-бота

### Шаг 1: Создание бота через BotFather

1. Откройте Telegram и найдите бота [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Выберите имя для вашего бота (например, "MELSU Portal")
4. Выберите username для бота (например, `melsu_portal_bot`)
5. Скопируйте токен бота (формат: `123456789:AAF-S4uaBC2kLVJ0pMCnH6l6lxbE8UP5xZY`)

### Шаг 2: Настройка бота

1. Отправьте `/setdescription` и укажите описание:
   ```
   Официальный бот портала МелГУ для получения уведомлений о заданиях, заявках и объявлениях.
   ```

2. Отправьте `/setabouttext` и укажите информацию:
   ```
   Портал МелГУ - my.melsu.ru
   ```

3. Отправьте `/setcommands` и добавьте команды:
   ```
   start - Начать работу с ботом
   help - Помощь
   status - Статус подключения
   ```

## 2. Настройка backend

### Шаг 1: Переменные окружения

Добавьте в ваш `.env` файл:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=7768964028:AAF-S4uaBC2kLVJ0pMCnH6l6lxbE8UP5xZY
TELEGRAM_WEBHOOK_URL=https://my.melsu.ru/api/telegram/webhook
```

### Шаг 2: Установка зависимостей

Убедитесь, что установлены необходимые библиотеки:

```bash
cd backend
pip install python-telegram-bot==20.7 aiohttp==3.9.1
```

### Шаг 3: Настройка webhook

Запустите скрипт для установки webhook:

```bash
cd backend
python scripts/setup_telegram_webhook.py setup
```

Для проверки статуса:
```bash
python scripts/setup_telegram_webhook.py info
```

## 3. Структура интеграции

### API Endpoints

- `POST /api/telegram/generate-link` - Генерация ссылки для подключения
- `POST /api/telegram/webhook` - Webhook для получения сообщений от Telegram
- `GET /api/telegram/status` - Статус подключения пользователя
- `DELETE /api/telegram/disconnect` - Отключение Telegram

### База данных

В таблице `user_profiles` используются поля:
- `telegram_id` - ID пользователя в Telegram
- `telegram_username` - Username в Telegram
- `telegram_user_info` - JSON с дополнительной информацией

## 4. Процесс подключения пользователя

### Для пользователя:

1. Пользователь заходит в профиль на сайте
2. Нажимает "Подключить Telegram"
3. Система генерирует уникальную ссылку с кодом
4. Открывается Telegram с вашим ботом
5. Пользователь нажимает "Start"
6. Бот получает код и привязывает Telegram к аккаунту
7. Пользователь получает подтверждение

### Технический процесс:

1. `POST /api/telegram/generate-link` создает временный код
2. Пользователь переходит по ссылке `https://t.me/your_bot?start=CODE`
3. Telegram отправляет webhook на `/api/telegram/webhook`
4. Backend обрабатывает команду `/start CODE`
5. Код проверяется и пользователь привязывается
6. Отправляется подтверждение в Telegram

## 5. Отправка уведомлений

### Использование TelegramService

```python
from backend.app.services.telegram_service import telegram_service

# Уведомление одному пользователю
await telegram_service.send_notification_to_user(
    db=db,
    user_id=user_id,
    title="Новое задание",
    message="Вам назначено новое задание по математике",
    url="https://my.melsu.ru/assignments/123"
)

# Массовые уведомления
await telegram_service.send_bulk_notifications(
    db=db,
    user_ids=[1, 2, 3, 4, 5],
    title="Объявление",
    message="Завтра изменения в расписании"
)

# Специальные уведомления
await telegram_service.send_assignment_notification(
    db=db,
    user_id=user_id,
    assignment_title="Контрольная работа",
    assignment_description="Решить задачи 1-10",
    due_date="2024-01-15"
)
```

## 6. Frontend компоненты

### TelegramConnect.jsx

Компонент для подключения Telegram в профиле пользователя:

```jsx
import TelegramConnect from './TelegramConnect';

// В профиле пользователя:
<TelegramConnect />
```

## 7. Nginx конфигурация

Убедитесь, что ваш nginx правильно проксирует webhook:

```nginx
location /api/telegram/ {
    proxy_pass http://localhost:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 8. Безопасность

### Важные моменты:

1. **Токен бота** - храните в переменных окружения, не в коде
2. **Webhook URL** - должен использовать HTTPS
3. **Валидация запросов** - проверяйте, что запросы приходят от Telegram
4. **Временные коды** - имеют срок действия 10 минут
5. **Уникальность** - один Telegram аккаунт = один пользователь

## 9. Мониторинг и логи

### Проверка работы:

```bash
# Логи webhook
tail -f backend/logs/telegram.log

# Статус бота
python scripts/setup_telegram_webhook.py info

# Тест отправки сообщения
python scripts/test_telegram.py
```

### Диагностика проблем:

1. **Бот не отвечает**:
   - Проверьте токен
   - Проверьте доступность webhook URL
   - Проверьте логи nginx

2. **Пользователь не может подключиться**:
   - Проверьте срок действия кода
   - Проверьте логи backend
   - Убедитесь, что webhook работает

3. **Уведомления не приходят**:
   - Проверьте telegram_id в базе данных
   - Проверьте логи отправки
   - Убедитесь, что пользователь не заблокировал бота

## 10. Пример использования

### Интеграция в существующий код:

```python
# В API создания задания
from backend.app.services.telegram_service import telegram_service

@router.post("/assignments")
async def create_assignment(assignment_data: AssignmentCreate, db: Session = Depends(get_db)):
    # Создаем задание
    assignment = create_assignment_in_db(db, assignment_data)
    
    # Отправляем уведомление в Telegram
    await telegram_service.send_assignment_notification(
        db=db,
        user_id=assignment.assignee_id,
        assignment_title=assignment.title,
        assignment_description=assignment.description,
        due_date=assignment.due_date.strftime("%d.%m.%Y") if assignment.due_date else None
    )
    
    return assignment
```

## 11. Обслуживание

### Регулярные задачи:

1. **Очистка истекших кодов** - автоматически через 10 минут
2. **Мониторинг доставки** - проверка логов отправки
3. **Обновление webhook** - при изменении домена или SSL сертификата

### Backup и восстановление:

- Telegram ID сохраняются в основной базе данных
- При восстановлении не требуется повторная настройка webhook
- Пользователям не нужно переподключаться

---

## Поддержка

При возникновении проблем:

1. Проверьте логи: `journalctl -u melsu-api -f`
2. Проверьте статус бота: `python scripts/setup_telegram_webhook.py info`
3. Обратитесь к разработчикам с подробным описанием проблемы

**Контакты поддержки:** help@melsu.ru 