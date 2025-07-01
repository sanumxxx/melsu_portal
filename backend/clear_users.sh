#!/bin/bash

# Скрипт для очистки таблицы пользователей МелГУ одной командой
# Использование: bash clear_users.sh

echo "🗑️  Очистка таблицы пользователей МелГУ"

# Настройки базы данных  
DB_HOST="localhost"
DB_NAME="melsu_db"
DB_USER="melsu_user"
DB_PASS="MelsuPortal2024!"

echo "🚀 Очищаем пользователей..."

# Выполняем SQL команды напрямую без отдельного файла
PGPASSWORD="$DB_PASS" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
-- Отключаем проверки внешних ключей
SET session_replication_role = replica;

-- Очищаем связанные таблицы
DELETE FROM activity_logs WHERE user_id IS NOT NULL;
DELETE FROM email_verifications;
DELETE FROM user_profiles;
DELETE FROM user_assignments;
DELETE FROM requests;
DELETE FROM reports;
DELETE FROM student_access;
DELETE FROM notifications;

-- Очищаем основную таблицу пользователей
DELETE FROM users;

-- Сбрасываем счетчики
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS user_profiles_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS email_verifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS activity_logs_id_seq RESTART WITH 1;

-- Включаем обратно проверки
SET session_replication_role = DEFAULT;

-- Показываем результат
SELECT 'Пользователи очищены!' as result, COUNT(*) as remaining_users FROM users;
"

if [ $? -eq 0 ]; then
    echo "✅ Готово! Таблица пользователей очищена"
else
    echo "❌ Ошибка подключения к БД"
fi 