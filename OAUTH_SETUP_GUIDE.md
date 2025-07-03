# Руководство по настройке OAuth интеграции

## Настройка ВКонтакте OAuth

### 1. Создание приложения VK

1. Перейдите на [vk.com/dev](https://vk.com/dev)
2. Нажмите "Создать приложение"
3. Выберите тип "Веб-сайт"
4. Укажите данные:
   - **Название**: MelSU Portal
   - **Адрес сайта**: https://my.melsu.ru
   - **Базовый домен**: my.melsu.ru

### 2. Настройка OAuth

1. В настройках приложения найдите раздел "OAuth настройки"
2. Добавьте Redirect URI:
   - **Продакшн**: `https://my.melsu.ru/auth/vk/callback`
   - **Разработка**: `http://localhost:3000/auth/vk/callback`

### 3. Получение данных

После создания приложения получите:
- **ID приложения** (VK_CLIENT_ID)
- **Защищенный ключ** (VK_CLIENT_SECRET)

## Настройка Telegram OAuth

### 1. Создание бота

1. Найдите [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newbot`
3. Укажите название бота (например, "MelSU Portal Auth")
4. Укажите username бота (например, "melsu_portal_auth_bot")
5. Получите **токен бота** (TELEGRAM_BOT_TOKEN)

### 2. Настройка домена

1. Отправьте команду `/setdomain` боту @BotFather
2. Выберите вашего бота
3. Укажите домен:
   - **Продакшн**: `my.melsu.ru`
   - **Разработка**: `localhost` (работает только на порту 80)

### 3. Настройка виджета

1. Отправьте команду `/setdomain` боту @BotFather
2. Выберите вашего бота
3. Настройте параметры виджета:
   - Размер кнопки: Large
   - Показывать фото: Да
   - Радиус углов: 10
   - Запрашивать доступ: Да

## Настройка переменных окружения

### Backend

Создайте файл `.env` в папке `backend/`:

```bash
# OAuth настройки
VK_CLIENT_ID=53853965
VK_CLIENT_SECRET=tWHc2hBJ0x4pRqyzzk6N
VK_SERVICE_KEY=64ce093264ce093264ce09323667fbb63f664ce64ce09320ca8ef7e96140ae9209c2e5c
VK_REDIRECT_URI=https://my.melsu.ru/auth/vk/callback
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Основные настройки системы
DATABASE_URL=postgresql://melsu_user:MelsuPortal2024!@localhost/melsu_db
JWT_SECRET_KEY=your_jwt_secret_key
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
UPLOADS_DIR=uploads
```

### Frontend

Создайте файл `.env` в папке `frontend/`:

```bash
# API URL
REACT_APP_API_URL=http://localhost:8000

# Telegram OAuth
REACT_APP_TELEGRAM_BOT_NAME=melsu_portal_auth_bot

# VK OAuth
REACT_APP_VK_CLIENT_ID=53853965

# Environment
REACT_APP_ENVIRONMENT=development
```

## Установка зависимостей

```bash
cd backend
pip install -r requirements.txt
```

## Тестирование OAuth

### 1. Запуск сервера

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Запуск фронтенда

```bash
cd frontend
npm start
```

**Важно**: Telegram Login Widget работает только на порту 80. Для разработки используйте:

```bash
sudo npm start -- --port 80
```

или на Windows (CMD от администратора):

```cmd
set PORT=80 && npm start
```

### 3. Тестирование

1. Откройте `http://localhost:3000/profile`
2. Найдите раздел "Социальные сети"
3. Нажмите "Подключить ВКонтакте" или "Подключить Telegram"
4. Выполните авторизацию
5. Проверьте, что аккаунт подключен

## Развертывание на продакшн

### 1. Обновите переменные окружения

- Замените `localhost` на реальный домен
- Используйте HTTPS для всех URL

### 2. Обновите настройки VK

- Добавьте продакшн домен в настройки приложения
- Обновите Redirect URI

### 3. Обновите настройки Telegram

- Обновите домен у @BotFather
- Проверьте, что бот доступен

## Безопасность

- Никогда не коммитьте `.env` файл
- Используйте сильные секретные ключи
- Регулярно обновляйте токены
- Проверяйте подписи Telegram данных
- Используйте HTTPS в продакшн

## Отладка

### Частые ошибки:

1. **VK OAuth ошибки**:
   - Проверьте правильность Redirect URI
   - Убедитесь, что домен добавлен в настройки
   - Проверьте CLIENT_ID и CLIENT_SECRET

2. **Telegram OAuth ошибки**:
   - Используйте порт 80 для разработки
   - Проверьте, что домен настроен у @BotFather
   - Убедитесь, что токен бота правильный

3. **Общие ошибки**:
   - Проверьте переменные окружения
   - Убедитесь, что сервер запущен
   - Проверьте логи сервера

## Поддержка

Если возникли проблемы, проверьте:
- Логи сервера: `tail -f backend/logs/app.log`
- Консоль браузера: F12 → Console
- Сетевые запросы: F12 → Network

## API Endpoints

После настройки доступны следующие endpoints:

- `GET /api/oauth/vk/auth-url` - Получить URL для авторизации VK
- `POST /api/oauth/vk/connect` - Подключить VK аккаунт
- `DELETE /api/oauth/vk/disconnect` - Отключить VK аккаунт
- `POST /api/oauth/telegram/connect` - Подключить Telegram аккаунт
- `DELETE /api/oauth/telegram/disconnect` - Отключить Telegram аккаунт
- `GET /api/oauth/status` - Получить статус подключения социальных сетей 