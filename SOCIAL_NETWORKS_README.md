# Функционал подключения социальных сетей

## Описание

Реализован функционал для подключения учетных записей VK и Telegram к профилю пользователя в портале МЕЛГУ.

## Что добавлено

### Backend (API)

1. **Модель данных** (`backend/app/models/user_profile.py`):
   - `vk_id` - ID или ссылка на профиль ВКонтакте
   - `telegram_id` - ID или username в Telegram

2. **API endpoints** (`backend/app/api/profile.py`):
   - `POST /api/profile/social/vk/connect` - подключение ВКонтакте
   - `POST /api/profile/social/telegram/connect` - подключение Telegram
   - `DELETE /api/profile/social/vk/disconnect` - отключение ВКонтакте
   - `DELETE /api/profile/social/telegram/disconnect` - отключение Telegram
   - `GET /api/profile/social/status` - получение статуса подключения

3. **Валидация данных**:
   - Поддержка различных форматов ввода (ID, ссылки)
   - Проверка уникальности (один аккаунт соцсети = один профиль)
   - Валидация форматов VK и Telegram ID

4. **Миграция базы данных**:
   - Создана автоматически: `backend/alembic/versions/a7843b1b03ca_add_social_media_fields.py`

### Frontend (UI)

1. **Компонент Profile** (`frontend/src/components/Profile.jsx`):
   - Секция "Социальные сети" с иконками VK и Telegram
   - Формы для ввода ID/ссылок
   - Кнопки подключения/отключения
   - Ссылки на профили в соцсетях

2. **Функционал**:
   - Автоматическое обновление статуса подключения
   - Валидация на стороне клиента
   - Адаптивный дизайн для мобильных устройств

## Поддерживаемые форматы

### ВКонтакте
- Числовой ID: `123456789`
- Текстовый ID: `ivan_petrov`
- Ссылки: `https://vk.com/id123456789`, `https://vk.com/ivan_petrov`

### Telegram
- Username: `@username` или `username`
- Ссылки: `https://t.me/username`, `t.me/username`

## Безопасность

- Проверка уникальности аккаунтов
- Валидация форматов данных
- Защита от XSS и SQL-инъекций
- Только авторизованные пользователи могут управлять своими соцсетями

## Тестирование

Создан тестовый скрипт `backend/test_social_networks.py` для проверки:
- Подключения/отключения социальных сетей
- Валидации данных
- Интеграции с профилем пользователя

Запуск тестов:
```bash
cd backend
python test_social_networks.py
```

## Развертывание

1. Примените миграции:
```bash
cd backend
alembic upgrade head
```

2. Перезапустите сервер:
```bash
python run.py
```

3. Пересоберите фронтенд (если нужно):
```bash
cd frontend
npm run build
```

## Документация для пользователей

Подробная инструкция для пользователей находится в файле `SOCIAL_NETWORKS_GUIDE.md`.

## Архитектура

### База данных
```sql
-- Добавлены поля в таблицу user_profiles
ALTER TABLE user_profiles 
ADD COLUMN vk_id VARCHAR(100),
ADD COLUMN telegram_id VARCHAR(100);
```

### API Schema
```json
{
  "vk_connected": boolean,
  "telegram_connected": boolean,
  "vk_id": string | null,
  "telegram_id": string | null
}
```

## Технические детали

- **Валидация VK**: Regex для извлечения ID из ссылок, проверка формата
- **Валидация Telegram**: Обработка @ символа, проверка username
- **Уникальность**: Один аккаунт соцсети может быть привязан только к одному профилю
- **Интеграция**: Данные соцсетей включены в API профиля пользователя

## Возможные улучшения

1. **OAuth авторизация** - подключение через официальные API
2. **Синхронизация данных** - обновление информации из соцсетей
3. **Уведомления** - оповещения через подключенные соцсети
4. **Групповые чаты** - интеграция с чатами Telegram
5. **Верификация** - проверка владения аккаунтом через API

## Версия

Версия: 1.0.0
Дата: $(date)
Автор: AI Assistant 