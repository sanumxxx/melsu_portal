#!/bin/bash

# 🚀 MELSU Portal - Полное исправление миграций
# Автор: Sasha Honcharov (sanumxxx@yandex.ru)

echo "🔧 Полное исправление миграций MELSU Portal"
echo "=========================================="

# Переходим в директорию backend
cd /var/www/melsu/backend

# Шаг 1: Останавливаем сервисы
echo "⏹️ Остановка сервисов..."
sudo systemctl stop melsu-api melsu-worker

# Шаг 2: Удаляем все проблемные файлы миграций
echo "🗑️ Удаление проблемных миграций..."
sudo -u melsu rm -f alembic/versions/ad3c0d6caa7f_*.py
sudo -u melsu rm -f alembic/versions/__pycache__/ad3c0d6caa7f_*.pyc

# Шаг 3: Очищаем таблицу версий alembic
echo "🔄 Очистка истории миграций..."
sudo -u postgres psql melsu_db -c "DELETE FROM alembic_version;"

# Шаг 4: Проверяем существующие таблицы и поля
echo "🔍 Проверка структуры БД..."

# Проверяем наличие полей faculty_id и department_id
faculty_exists=$(sudo -u postgres psql melsu_db -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='faculty_id';" | tr -d ' ' | grep -v '^$')
department_exists=$(sudo -u postgres psql melsu_db -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='department_id';" | tr -d ' ' | grep -v '^$')

echo "Faculty field exists: $faculty_exists"
echo "Department field exists: $department_exists"

# Шаг 5: Добавляем отсутствующие поля
if [ -z "$faculty_exists" ]; then
    echo "➕ Добавление поля faculty_id..."
    sudo -u postgres psql melsu_db -c "ALTER TABLE user_profiles ADD COLUMN faculty_id INTEGER;"
    sudo -u postgres psql melsu_db -c "ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_faculty FOREIGN KEY (faculty_id) REFERENCES departments (id);"
fi

if [ -z "$department_exists" ]; then
    echo "➕ Добавление поля department_id..."
    sudo -u postgres psql melsu_db -c "ALTER TABLE user_profiles ADD COLUMN department_id INTEGER;"
    sudo -u postgres psql melsu_db -c "ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_department FOREIGN KEY (department_id) REFERENCES departments (id);"
fi

# Шаг 6: Определяем последнюю корректную ревизию
echo "📋 Определение последней ревизии..."

# Ищем самую новую ревизию (исключая merge ревизии)
latest_revision=""
if [ -f "alembic/versions/d34404f8ec53_add_faculty_and_department_id_fields.py" ]; then
    latest_revision="d34404f8ec53"
elif [ -f "alembic/versions/a7843b1b03ca_add_social_media_fields.py" ]; then
    latest_revision="a7843b1b03ca"
elif [ -f "alembic/versions/59acfe778956_add_oauth_fields_to_user_profile.py" ]; then
    latest_revision="59acfe778956"
elif [ -f "alembic/versions/07e3806a12df_initial_migration_with_masks_and_media.py" ]; then
    latest_revision="07e3806a12df"
fi

if [ -z "$latest_revision" ]; then
    echo "❌ Не найдена подходящая ревизия!"
    exit 1
fi

echo "🎯 Использую ревизию: $latest_revision"

# Шаг 7: Отмечаем ревизию как текущую
echo "✅ Установка текущей ревизии..."
sudo -u melsu venv/bin/alembic stamp $latest_revision

# Шаг 8: Проверяем состояние
echo "🔍 Проверка состояния миграций..."
sudo -u melsu venv/bin/alembic current
sudo -u melsu venv/bin/alembic heads

# Проверяем количество head ревизий
heads_count=$(sudo -u melsu venv/bin/alembic heads 2>&1 | grep -c '^[a-f0-9]\{12\}')
echo "Количество head ревизий: $heads_count"

if [ $heads_count -gt 1 ]; then
    echo "⚠️ Все еще есть конфликт. Принудительно устанавливаю одну ревизию..."
    # Получаем все head ревизии и выбираем первую
    first_head=$(sudo -u melsu venv/bin/alembic heads 2>&1 | grep '^[a-f0-9]\{12\}' | head -1 | cut -d' ' -f1)
    sudo -u melsu venv/bin/alembic stamp $first_head --purge
fi

# Шаг 9: Инициализация данных
echo "🔧 Инициализация данных..."
sudo -u melsu venv/bin/python -c "
import sys
sys.path.append('/var/www/melsu/backend')
from app.startup import startup_application
startup_application()
"

# Шаг 10: Запускаем сервисы
echo "🚀 Запуск сервисов..."
sudo systemctl start melsu-api melsu-worker

# Ждем запуска API
sleep 5

# Проверяем здоровье API
echo "🏥 Проверка API..."
api_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
if [ "$api_status" = "200" ]; then
    echo "✅ API работает корректно"
else
    echo "⚠️ API не отвечает (код: $api_status)"
fi

echo ""
echo "🎉 Исправление миграций завершено!"
echo "📊 Финальное состояние:"
sudo -u melsu venv/bin/alembic current
echo ""
echo "💡 Что было сделано:"
echo "   • Удалены проблемные merge ревизии"
echo "   • Очищена история миграций"
echo "   • Добавлены поля faculty_id и department_id"
echo "   • Установлена корректная ревизия: $latest_revision"
echo "   • Инициализированы данные"
echo "   • Перезапущены сервисы"
echo ""
echo "✅ Система готова к работе!" 