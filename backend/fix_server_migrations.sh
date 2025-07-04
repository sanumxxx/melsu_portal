#!/bin/bash

# 🚀 MELSU Portal - Скрипт исправления миграций на сервере
# Автор: Sasha Honcharov (sanumxxx@yandex.ru)

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Исправление миграций MELSU Portal на сервере${NC}"
echo "=============================================="

# Проверяем, что мы в правильной директории
if [ ! -f "alembic.ini" ]; then
    echo -e "${RED}❌ Файл alembic.ini не найден. Убедитесь, что вы в директории backend${NC}"
    exit 1
fi

echo -e "${YELLOW}📊 Текущее состояние миграций:${NC}"
sudo -u melsu venv/bin/alembic current

echo -e "\n${YELLOW}📋 Список head ревизий:${NC}"
sudo -u melsu venv/bin/alembic heads

echo -e "\n${YELLOW}🔍 Проверка существующих таблиц в БД:${NC}"
sudo -u postgres psql melsu_db -c "\dt" | grep -E "(departments|user_profiles|alembic_version)"

echo -e "\n${BLUE}🔄 Начинаю исправление...${NC}"

# Шаг 1: Удаляем проблемную merge ревизию
echo -e "${YELLOW}1. Удаление проблемной merge ревизии...${NC}"
if [ -f "alembic/versions/ad3c0d6caa7f_merge_multiple_heads_auto_generated_by_.py" ]; then
    rm -f "alembic/versions/ad3c0d6caa7f_merge_multiple_heads_auto_generated_by_.py"
    echo -e "${GREEN}✅ Merge ревизия удалена${NC}"
else
    echo -e "${YELLOW}⚠️ Merge ревизия не найдена${NC}"
fi

# Шаг 2: Получаем список всех head ревизий
echo -e "${YELLOW}2. Получение списка head ревизий...${NC}"
heads_output=$(sudo -u melsu venv/bin/alembic heads 2>&1)
echo "$heads_output"

# Извлекаем ID ревизий
head_revisions=$(echo "$heads_output" | grep -o '^[a-f0-9]\{12\}' | tr '\n' ' ')
echo -e "${BLUE}Head ревизии: $head_revisions${NC}"

# Шаг 3: Отмечаем все существующие ревизии как выполненные
echo -e "${YELLOW}3. Отметка существующих ревизий как выполненных...${NC}"

# Проверяем, какие таблицы уже существуют
existing_tables=$(sudo -u postgres psql melsu_db -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public';" | tr -d ' ' | grep -v '^$')

if echo "$existing_tables" | grep -q "departments"; then
    echo -e "${GREEN}✅ Таблица departments существует${NC}"
    
    # Отмечаем базовые миграции как выполненные
    for revision in $head_revisions; do
        echo -e "${BLUE}Отмечаю ревизию $revision как выполненную...${NC}"
        sudo -u melsu venv/bin/alembic stamp $revision --purge 2>/dev/null || true
    done
    
    # Находим самую последнюю ревизию и устанавливаем её как текущую
    latest_revision=$(echo $head_revisions | awk '{print $NF}')
    if [ ! -z "$latest_revision" ]; then
        echo -e "${BLUE}Устанавливаю $latest_revision как текущую ревизию...${NC}"
        sudo -u melsu venv/bin/alembic stamp $latest_revision
    fi
else
    echo -e "${RED}❌ Таблица departments не существует. Нужно создать схему заново.${NC}"
    exit 1
fi

# Шаг 4: Проверяем наличие полей faculty_id и department_id
echo -e "${YELLOW}4. Проверка полей faculty_id и department_id...${NC}"
faculty_exists=$(sudo -u postgres psql melsu_db -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='faculty_id';" | tr -d ' ')
department_exists=$(sudo -u postgres psql melsu_db -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='department_id';" | tr -d ' ')

if [ -z "$faculty_exists" ] || [ -z "$department_exists" ]; then
    echo -e "${YELLOW}⚠️ Поля faculty_id или department_id отсутствуют. Добавляю их...${NC}"
    
    if [ -z "$faculty_exists" ]; then
        sudo -u postgres psql melsu_db -c "ALTER TABLE user_profiles ADD COLUMN faculty_id INTEGER;"
        sudo -u postgres psql melsu_db -c "ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_faculty FOREIGN KEY (faculty_id) REFERENCES departments (id);"
        echo -e "${GREEN}✅ Поле faculty_id добавлено${NC}"
    fi
    
    if [ -z "$department_exists" ]; then
        sudo -u postgres psql melsu_db -c "ALTER TABLE user_profiles ADD COLUMN department_id INTEGER;"
        sudo -u postgres psql melsu_db -c "ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_department FOREIGN KEY (department_id) REFERENCES departments (id);"
        echo -e "${GREEN}✅ Поле department_id добавлено${NC}"
    fi
    
    # Отмечаем нашу миграцию как выполненную
    if [ -f "alembic/versions/d34404f8ec53_add_faculty_and_department_id_fields.py" ]; then
        sudo -u melsu venv/bin/alembic stamp d34404f8ec53
        echo -e "${GREEN}✅ Миграция d34404f8ec53 отмечена как выполненная${NC}"
    fi
else
    echo -e "${GREEN}✅ Поля faculty_id и department_id уже существуют${NC}"
fi

# Шаг 5: Проверяем финальное состояние
echo -e "${YELLOW}5. Проверка финального состояния...${NC}"
sudo -u melsu venv/bin/alembic current
sudo -u melsu venv/bin/alembic heads

# Проверяем количество head ревизий
heads_count=$(sudo -u melsu venv/bin/alembic heads 2>&1 | grep -c '^[a-f0-9]\{12\}')
if [ $heads_count -eq 1 ]; then
    echo -e "${GREEN}✅ Конфликт миграций исправлен!${NC}"
else
    echo -e "${RED}❌ Все еще есть конфликт миграций (найдено $heads_count head ревизий)${NC}"
fi

# Шаг 6: Инициализация обновленных данных
echo -e "${YELLOW}6. Инициализация обновленных данных...${NC}"
sudo -u melsu venv/bin/python -c "from app.startup import startup_application; startup_application()"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Данные успешно инициализированы${NC}"
else
    echo -e "${RED}❌ Ошибка при инициализации данных${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Исправление миграций завершено!${NC}"
echo -e "${BLUE}📋 Что было сделано:${NC}"
echo "   • Удалена проблемная merge ревизия"
echo "   • Отмечены существующие ревизии как выполненные"
echo "   • Добавлены поля faculty_id и department_id (если отсутствовали)"
echo "   • Инициализированы обновленные данные"
echo ""
echo -e "${YELLOW}💡 Следующие шаги:${NC}"
echo "   1. Проверьте работу API: curl http://localhost:8000/health"
echo "   2. Перезапустите сервисы: sudo systemctl restart melsu-api melsu-worker"
echo "   3. Проверьте создание шаблонов заявок в админ-панели"
echo "" 