#!/bin/bash
# Скрипт полного сброса базы данных и миграций МелГУ
# Автор: МелГУ Development Team
# Дата: 2025-07-02

echo "🔄 Начинаем полный сброс базы данных и миграций МелГУ..."

# Проверяем наличие .env файла
if [ ! -f "../.env" ]; then
    echo "❌ Файл .env не найден! Убедитесь, что он существует в корне проекта."
    exit 1
fi

echo "✅ Файл .env найден"

# Загружаем переменные окружения
source ../.env 2>/dev/null || echo "⚠️ Не удалось загрузить .env, используем системные переменные"

# Извлекаем параметры подключения к БД
DB_USER=${DB_USER:-"melsu_user"}
DB_NAME=${DB_NAME:-"melsu_db"}
DB_HOST=${DB_HOST:-"localhost"}

echo "🗄️ Подключение к базе данных: $DB_USER@$DB_HOST/$DB_NAME"

# 1. Очистка базы данных
echo "🧹 Шаг 1: Полная очистка базы данных..."
psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL ON SCHEMA public TO public;
" 2>/dev/null || {
    echo "❌ Ошибка при очистке базы данных!"
    echo "💡 Попробуйте выполнить команды вручную:"
    echo "   psql -U $DB_USER -d $DB_NAME"
    echo "   DROP SCHEMA public CASCADE;"
    echo "   CREATE SCHEMA public;"
    echo "   GRANT ALL ON SCHEMA public TO $DB_USER;"
    echo "   GRANT ALL ON SCHEMA public TO public;"
    exit 1
}

echo "✅ База данных очищена"

# 2. Очистка файлов миграций
echo "🧹 Шаг 2: Очистка файлов миграций..."
rm -f alembic/versions/*.py
rm -rf alembic/versions/__pycache__
echo "✅ Файлы миграций удалены"

# 3. Активация виртуального окружения (если есть)
if [ -d "venv" ]; then
    echo "🐍 Активация виртуального окружения..."
    source venv/bin/activate
fi

# 4. Создание новой инициальной миграции
echo "📝 Шаг 3: Создание новой инициальной миграции..."
python -m alembic revision --autogenerate -m "Initial migration" || {
    echo "❌ Ошибка при создании миграции!"
    exit 1
}

echo "✅ Инициальная миграция создана"

# 5. Применение миграции
echo "⚡ Шаг 4: Применение миграции..."
python -m alembic upgrade head || {
    echo "❌ Ошибка при применении миграции!"
    exit 1
}

echo "✅ Миграция применена"

# 6. Инициализация начальных данных
echo "🎯 Шаг 5: Инициализация начальных данных..."
if [ -f "scripts/init_system_roles.py" ]; then
    python scripts/init_system_roles.py || {
        echo "⚠️ Ошибка при инициализации системных ролей"
    }
else
    echo "⚠️ Скрипт init_system_roles.py не найден"
fi

# 7. Проверка состояния миграций
echo "🔍 Шаг 6: Проверка состояния миграций..."
python -m alembic current

echo ""
echo "🎉 Сброс завершен успешно!"
echo ""
echo "📋 Следующие шаги:"
echo "   1. Запустите сервер: python run.py"
echo "   2. Проверьте API: http://localhost:8000/docs"
echo "   3. Создайте администратора через API"
echo ""
echo "💡 Для будущих изменений моделей используйте:"
echo "   python -m alembic revision --autogenerate -m \"Описание изменения\""
echo "   python -m alembic upgrade head" 