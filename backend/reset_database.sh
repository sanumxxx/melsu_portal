#!/bin/bash
# 🚀 MELSU Portal - Скрипт сброса базы данных
# Автор: Sasha Honcharov (sanumxxx@yandex.ru)

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️  Сброс базы данных MELSU Portal${NC}"
echo "===================================="

# Проверяем, что мы в правильной директории
if [ ! -f "alembic.ini" ]; then
    echo -e "${RED}❌ Файл alembic.ini не найден. Убедитесь, что вы в директории backend${NC}"
    exit 1
fi

# Загружаем переменные окружения
if [ -f "../.env" ]; then
    export $(cat ../.env | grep -v ^# | xargs)
    echo -e "${GREEN}✅ Загружены переменные окружения${NC}"
else
    echo -e "${YELLOW}⚠️ Файл .env не найден, используем значения по умолчанию${NC}"
fi

# Получаем параметры подключения к БД
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-melsu_db}
DB_USER=${DB_USER:-melsu_user}

echo -e "${BLUE}📊 Параметры подключения:${NC}"
echo "   База данных: $DB_NAME"
echo "   Пользователь: $DB_USER"
echo "   Хост: $DB_HOST:$DB_PORT"
echo ""

# Подтверждение
echo -e "${YELLOW}⚠️ ВНИМАНИЕ: Все данные в базе будут удалены!${NC}"
read -p "Продолжить? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}ℹ️ Операция отменена${NC}"
    exit 0
fi

echo -e "${BLUE}🔄 Начинаю сброс базы данных...${NC}"

# Остановка приложения (если запущено)
echo -e "${YELLOW}⏹️ Остановка приложения...${NC}"
if command -v systemctl &> /dev/null; then
    sudo systemctl stop melsu-api melsu-worker 2>/dev/null || true
fi

# Удаляем все таблицы
echo -e "${YELLOW}🗑️ Удаление всех таблиц...${NC}"
sudo -u postgres psql -d $DB_NAME -c "
DO \$\$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;
" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Все таблицы удалены${NC}"
else
    echo -e "${RED}❌ Ошибка при удалении таблиц${NC}"
    exit 1
fi

# Удаляем версии миграций
echo -e "${YELLOW}🔄 Очистка истории миграций...${NC}"
sudo -u postgres psql -d $DB_NAME -c "DROP TABLE IF EXISTS alembic_version CASCADE;" 2>/dev/null

# Создаем все таблицы заново
echo -e "${YELLOW}🏗️ Создание таблиц...${NC}"
if [ -f "venv/bin/alembic" ]; then
    venv/bin/alembic upgrade head
else
    alembic upgrade head
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Таблицы созданы${NC}"
else
    echo -e "${RED}❌ Ошибка при создании таблиц${NC}"
    exit 1
fi

# Инициализация базовых данных
echo -e "${YELLOW}🔧 Инициализация базовых данных...${NC}"
if [ -f "venv/bin/python" ]; then
    venv/bin/python -c "from app.startup import startup_application; startup_application()"
else
    python -c "from app.startup import startup_application; startup_application()"
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Базовые данные инициализированы${NC}"
else
    echo -e "${RED}❌ Ошибка при инициализации данных${NC}"
    exit 1
fi

# Запуск приложения (если systemctl доступен)
echo -e "${YELLOW}🚀 Запуск приложения...${NC}"
if command -v systemctl &> /dev/null; then
    sudo systemctl start melsu-api melsu-worker 2>/dev/null || true
    echo -e "${GREEN}✅ Приложение запущено${NC}"
fi

echo ""
echo -e "${GREEN}🎉 База данных успешно сброшена и инициализирована!${NC}"
echo -e "${BLUE}📋 Что было сделано:${NC}"
echo "   • Удалены все таблицы"
echo "   • Очищена история миграций"
echo "   • Созданы новые таблицы"
echo "   • Инициализированы системные роли"
echo "   • Инициализированы типы полей"
echo "   • Инициализированы базовые департаменты"
echo "   • Создан шаблон заявки 'Привязка к факультету/кафедре'"
echo ""
echo -e "${YELLOW}💡 Следующие шаги:${NC}"
echo "   1. Создайте администратора: python scripts/create_admin.py"
echo "   2. Добавьте факультеты и кафедры через админ-панель"
echo "   3. Настройте пользователей и роли"
echo "" 