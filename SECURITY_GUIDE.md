# Руководство по безопасности МелГУ Портала

## Обзор чувствительных данных

В проекте найдены и вынесены в переменные окружения следующие чувствительные данные:

### 🔐 JWT и безопасность
- `SECRET_KEY` - секретный ключ для JWT токенов
- `ACCESS_TOKEN_EXPIRE_MINUTES` - время жизни токенов

### 🗄️ База данных
- `DATABASE_URL` - строка подключения к PostgreSQL с паролем

### 📧 Email конфигурация
- `MAIL_PASSWORD` - пароль приложения для SMTP

### 🔗 OAuth интеграции
- `VK_CLIENT_SECRET` - защищенный ключ ВКонтакте
- `VK_SERVICE_KEY` - сервисный ключ ВКонтакте  
- `TELEGRAM_BOT_TOKEN` - токен Telegram бота

## ⚠️ Критические изменения

### Обновленные файлы:
1. `backend/app/core/config.py` - добавлена OAuthConfig
2. `backend/app/api/oauth.py` - использует settings вместо хардкода
3. `frontend/src/components/auth/VKAuthButton.jsx` - использует REACT_APP_VK_CLIENT_ID

### Требуемые .env файлы:

#### Корневой .env:
```bash
# Основные настройки
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:password@localhost/db
MAIL_PASSWORD=your-mail-password

# VK OAuth
VK_CLIENT_ID=53853965
VK_CLIENT_SECRET=your-vk-secret
VK_SERVICE_KEY=your-vk-service-key

# Telegram OAuth
TELEGRAM_BOT_TOKEN=your-telegram-token
```

#### frontend/.env:
```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_VK_CLIENT_ID=53853965
REACT_APP_TELEGRAM_BOT_NAME=melsu_portal_auth_bot
```

## 🚨 Безопасность в продакшн

### Обязательные действия:
1. **Смените все пароли и ключи** на уникальные для продакшн
2. **Установите DEBUG=False** в продакшн окружении
3. **Используйте сильный SECRET_KEY** (>32 символа)
4. **Ограничьте доступ к .env файлам** (chmod 600)

### Рекомендации:
- Используйте менеджеры секретов (Azure Key Vault, AWS Secrets Manager)
- Регулярно ротируйте ключи доступа
- Мониторьте использование API ключей
- Логируйте подозрительную активность

## 📋 Чек-лист миграции

- [ ] Создан корневой .env файл
- [ ] Создан frontend/.env файл  
- [ ] Обновлены пароли для продакшн
- [ ] Настроен реальный Telegram бот
- [ ] Проверена работа VK OAuth
- [ ] Настроен мониторинг безопасности

## 🔍 Аудит безопасности

Регулярно проверяйте:
- Нет ли хардкода паролей в коде
- Актуальны ли токены доступа
- Корректны ли права доступа к файлам
- Работает ли логирование безопасности

## 🚀 Команды для развертывания

См. `ENV_TEMPLATE.md` для готовых команд создания .env файлов. 