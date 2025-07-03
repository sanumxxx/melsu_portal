# Настройка переменных окружения для фронтенда

Создайте файл `.env` в папке `frontend/` со следующим содержимым:

```bash
# API URL
REACT_APP_API_URL=http://localhost:8000

# Telegram OAuth
REACT_APP_TELEGRAM_BOT_NAME=melsu_portal_auth_bot

# VK OAuth (frontend configuration)
REACT_APP_VK_CLIENT_ID=53853965

# Environment
REACT_APP_ENVIRONMENT=development
```

## Объяснение переменных:

- `REACT_APP_API_URL` - URL вашего backend API
- `REACT_APP_TELEGRAM_BOT_NAME` - имя вашего Telegram бота (без @)
- `REACT_APP_VK_CLIENT_ID` - ID вашего VK приложения
- `REACT_APP_ENVIRONMENT` - среда (development/production)

## Для продакшн:

```bash
# API URL
REACT_APP_API_URL=https://api.my.melsu.ru

# Telegram OAuth
REACT_APP_TELEGRAM_BOT_NAME=melsu_portal_auth_bot

# VK OAuth
REACT_APP_VK_CLIENT_ID=53853965

# Environment
REACT_APP_ENVIRONMENT=production
``` 