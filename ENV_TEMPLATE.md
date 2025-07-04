# Шаблон переменных окружения

## Создание .env файла

Создайте файл `.env` в корне проекта и скопируйте в него следующие переменные:

```bash
# ========================================
# ОСНОВНЫЕ НАСТРОЙКИ БЕЗОПАСНОСТИ
# ========================================

# Секретный ключ для JWT токенов (ОБЯЗАТЕЛЬНО СМЕНИТЕ В ПРОДАКШН!)
SECRET_KEY=melgu-super-secret-key-2025-change-in-production

# Время жизни токена доступа (в минутах)
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ========================================
# НАСТРОЙКИ БАЗЫ ДАННЫХ
# ========================================

# URL подключения к PostgreSQL (смените пароль!)
DATABASE_URL=postgresql://melsu_user:MelsuPortal2024!@localhost/melsu_db

# ========================================
# НАСТРОЙКИ EMAIL
# ========================================

# Конфигурация почтового сервера
MAIL_USERNAME=help@melsu.ru
MAIL_PASSWORD=fl_92||LII_O0
MAIL_FROM=help@melsu.ru
MAIL_FROM_NAME=МелГУ - Техническая поддержка
MAIL_PORT=587
MAIL_SERVER=email.melsu.ru
MAIL_STARTTLS=True
MAIL_SSL_TLS=False

# URL фронтенда для ссылок в письмах
FRONTEND_URL=http://localhost:3000

# ========================================
# VK OAUTH НАСТРОЙКИ
# ========================================

# ID приложения ВКонтакте
VK_CLIENT_ID=53853965

# Защищенный ключ ВКонтакте (НЕ ДЕЛИТЕСЬ!)
VK_CLIENT_SECRET=tWHc2hBJ0x4pRqyzzk6N

# Сервисный ключ ВКонтакте (НЕ ДЕЛИТЕСЬ!)
VK_SERVICE_KEY=64ce093264ce093264ce09323667fbb63f664ce64ce09320ca8ef7e96140ae9209c2e5c

# ========================================
# TELEGRAM OAUTH НАСТРОЙКИ
# ========================================

# Токен Telegram бота (получите у @BotFather)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# ========================================
# НАСТРОЙКИ СЕРВЕРА
# ========================================

# Хост и порт для backend
HOST=0.0.0.0
PORT=8000

# Режим отладки (False для продакшн!)
DEBUG=True

# Окружение (development/production)
ENVIRONMENT=development
```

## Создание frontend/.env файла

Создайте файл `frontend/.env` со следующими переменными:

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

## Команды для быстрого создания

### Windows (PowerShell):

```powershell
# Создание основного .env файла
@"
SECRET_KEY=melgu-super-secret-key-2025-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_URL=postgresql://melsu_user:MelsuPortal2024!@localhost/melsu_db
MAIL_USERNAME=help@melsu.ru
MAIL_PASSWORD=fl_92||LII_O0
MAIL_FROM=help@melsu.ru
MAIL_FROM_NAME=МелГУ - Техническая поддержка
MAIL_PORT=587
MAIL_SERVER=email.melsu.ru
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
FRONTEND_URL=http://localhost:3000
VK_CLIENT_ID=53853965
VK_CLIENT_SECRET=tWHc2hBJ0x4pRqyzzk6N
VK_SERVICE_KEY=64ce093264ce093264ce09323667fbb63f664ce64ce09320ca8ef7e96140ae9209c2e5c
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
HOST=0.0.0.0
PORT=8000
DEBUG=True
ENVIRONMENT=development
"@ | Out-File -FilePath ".env" -Encoding UTF8

# Создание frontend/.env файла
@"
REACT_APP_API_URL=http://localhost:8000
REACT_APP_TELEGRAM_BOT_NAME=melsu_portal_auth_bot
REACT_APP_VK_CLIENT_ID=53853965
REACT_APP_ENVIRONMENT=development
"@ | Out-File -FilePath "frontend/.env" -Encoding UTF8
```

### Linux/macOS (Bash):

```bash
# Создание основного .env файла
cat << 'EOF' > .env
SECRET_KEY=melgu-super-secret-key-2025-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_URL=postgresql://melsu_user:MelsuPortal2024!@localhost/melsu_db
MAIL_USERNAME=help@melsu.ru
MAIL_PASSWORD=fl_92||LII_O0
MAIL_FROM=help@melsu.ru
MAIL_FROM_NAME=МелГУ - Техническая поддержка
MAIL_PORT=587
MAIL_SERVER=email.melsu.ru
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
FRONTEND_URL=http://localhost:3000
VK_CLIENT_ID=53853965
VK_CLIENT_SECRET=tWHc2hBJ0x4pRqyzzk6N
VK_SERVICE_KEY=64ce093264ce093264ce09323667fbb63f664ce64ce09320ca8ef7e96140ae9209c2e5c
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
HOST=0.0.0.0
PORT=8000
DEBUG=True
ENVIRONMENT=development
EOF

# Создание frontend/.env файла
cat << 'EOF' > frontend/.env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_TELEGRAM_BOT_NAME=melsu_portal_auth_bot
REACT_APP_VK_CLIENT_ID=53853965
REACT_APP_ENVIRONMENT=development
EOF
```

## Важные замечания

⚠️ **БЕЗОПАСНОСТЬ:**
- Файлы `.env` НЕ ДОЛЖНЫ попадать в Git
- Смените все пароли и ключи в продакшн
- Используйте сильные секретные ключи

⚠️ **TELEGRAM:**
- Замените `your_telegram_bot_token` на реальный токен от @BotFather

⚠️ **ПРОДАКШН:**
- Установите `DEBUG=False`
- Установите `ENVIRONMENT=production`
- Смените все пароли и ключи 