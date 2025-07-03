#!/bin/bash

# 🚀 MELSU Portal - Скрипт управления сервисами
# Автор: Sasha Honcharov (sanumxxx@yandex.ru)

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Пути
PROJECT_PATH="/var/www/melsu"
BACKEND_PATH="$PROJECT_PATH/backend"
FRONTEND_PATH="$PROJECT_PATH/frontend"

# Функции для логирования
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Функция проверки статуса сервиса
check_service_status() {
    local service=$1
    if systemctl is-active --quiet $service; then
        echo -e "${GREEN}✅ $service - активен${NC}"
    else
        echo -e "${RED}❌ $service - неактивен${NC}"
    fi
}

# Функция проверки здоровья API
check_api_health() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null)
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ API health check - OK${NC}"
    else
        echo -e "${RED}❌ API health check - FAILED (код: $response)${NC}"
    fi
}

# Функция проверки подключения к БД
check_database() {
    log_step "Проверка подключения к базе данных..."
    sudo -u postgres psql melsu_db -c "SELECT 1;" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ База данных - доступна${NC}"
    else
        echo -e "${RED}❌ База данных - недоступна${NC}"
    fi
}

# Функция применения миграций
apply_migrations() {
    log_step "Применение миграций базы данных..."
    cd $BACKEND_PATH
    
    # Проверяем наличие новых миграций
    sudo -u melsu $BACKEND_PATH/venv/bin/alembic current
    local current_rev=$(sudo -u melsu $BACKEND_PATH/venv/bin/alembic current 2>/dev/null | grep -o '[a-f0-9]\{12\}' | head -1)
    local head_rev=$(sudo -u melsu $BACKEND_PATH/venv/bin/alembic heads 2>/dev/null | grep -o '[a-f0-9]\{12\}' | head -1)
    
    if [ "$current_rev" != "$head_rev" ]; then
        log_info "Обнаружены новые миграции. Применяю..."
        sudo -u melsu $BACKEND_PATH/venv/bin/alembic upgrade head
        if [ $? -eq 0 ]; then
            log_success "Миграции успешно применены"
        else
            log_error "Ошибка при применении миграций"
            return 1
        fi
    else
        log_info "Все миграции уже применены"
    fi
}

# Функция резервного копирования БД
backup_database() {
    log_step "Создание резервной копии базы данных..."
    local backup_dir="/var/backups/melsu"
    local backup_file="$backup_dir/melsu_db_$(date +%Y%m%d_%H%M%S).sql"
    
    mkdir -p $backup_dir
    sudo -u postgres pg_dump melsu_db > $backup_file
    
    if [ $? -eq 0 ]; then
        log_success "Резервная копия создана: $backup_file"
        
        # Удаляем старые бэкапы (старше 7 дней)
        find $backup_dir -name "melsu_db_*.sql" -mtime +7 -delete
    else
        log_error "Ошибка создания резервной копии"
        return 1
    fi
}

# Функция обновления проекта
update_project() {
    log_step "Обновление проекта из Git репозитория..."
    
    # Создаем бэкап перед обновлением
    backup_database
    
    cd $PROJECT_PATH
    
    # Проверяем наличие изменений
    git fetch origin main
    local local_commit=$(git rev-parse HEAD)
    local remote_commit=$(git rev-parse origin/main)
    
    if [ "$local_commit" = "$remote_commit" ]; then
        log_info "Проект уже актуален"
        return 0
    fi
    
    log_info "Обнаружены обновления. Загружаю изменения..."
    git pull origin main
    
    if [ $? -ne 0 ]; then
        log_error "Ошибка при загрузке обновлений"
        return 1
    fi
    
    # Обновляем backend
    log_step "Обновление backend зависимостей..."
    cd $BACKEND_PATH
    sudo -u melsu $BACKEND_PATH/venv/bin/pip install -r requirements.txt
    
    # Применяем миграции
    apply_migrations
    
    # Обновляем frontend
    log_step "Обновление и сборка frontend..."
    cd $FRONTEND_PATH
    sudo -u melsu npm install
    sudo -u melsu npm run build
    
    log_success "Проект успешно обновлен"
}

# Функция безопасного перезапуска
safe_restart() {
    log_step "Безопасный перезапуск сервисов..."
    
    # Проверяем, что все готово к перезапуску
    if ! systemctl is-active --quiet postgresql; then
        log_error "PostgreSQL не запущен. Запускаю..."
        systemctl start postgresql
    fi
    
    if ! systemctl is-active --quiet redis-server; then
        log_error "Redis не запущен. Запускаю..."
        systemctl start redis-server
    fi
    
    # Перезапускаем сервисы по порядку
    log_info "Перезапуск Celery Worker..."
    systemctl restart melsu-worker
    
    log_info "Перезапуск API..."
    systemctl restart melsu-api
    
    # Ждем, пока API запустится
    log_info "Ожидание запуска API..."
    sleep 5
    
    # Проверяем здоровье API
    local retries=0
    while [ $retries -lt 10 ]; do
        if curl -s http://localhost:8000/health > /dev/null; then
            break
        fi
        sleep 2
        retries=$((retries + 1))
    done
    
    log_info "Перезапуск Nginx..."
    systemctl restart nginx
    
    log_success "Сервисы перезапущены"
}

# Функция полного обновления
full_update() {
    log_info "🔄 Начинаю полное обновление системы..."
    
    # Останавливаем сервисы приложения
    systemctl stop melsu-api melsu-worker
    
    # Обновляем проект
    update_project
    
    # Запускаем сервисы
    safe_restart
    
    log_success "✅ Полное обновление завершено!"
}

# Функция мониторинга
monitor_system() {
    echo -e "${BLUE}📊 Мониторинг системы MELSU Portal${NC}"
    echo "=================================="
    
    # Статус сервисов
    echo -e "\n${YELLOW}Статус сервисов:${NC}"
    check_service_status "postgresql"
    check_service_status "redis-server"
    check_service_status "nginx"
    check_service_status "melsu-api"
    check_service_status "melsu-worker"
    
    # Проверка API
    echo -e "\n${YELLOW}Проверка API:${NC}"
    check_api_health
    
    # Проверка БД
    echo -e "\n${YELLOW}База данных:${NC}"
    check_database
    
    # Использование ресурсов
    echo -e "\n${YELLOW}Использование ресурсов:${NC}"
    echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')"
    echo "RAM: $(free -h | awk 'NR==2{printf "%.1f%% (используется %s из %s)", $3*100/$2, $3, $2}')"
    echo "Диск: $(df -h / | awk 'NR==2{printf "%s используется из %s (%s)", $3, $2, $5}')"
    
    # Статус Git
    echo -e "\n${YELLOW}Git статус:${NC}"
    cd $PROJECT_PATH
    local current_branch=$(git branch --show-current)
    local last_commit=$(git log -1 --pretty=format:"%h - %s (%cr)")
    echo "Ветка: $current_branch"
    echo "Последний коммит: $last_commit"
    
    # Проверка обновлений
    git fetch origin main > /dev/null 2>&1
    local commits_behind=$(git rev-list --count HEAD..origin/main)
    if [ $commits_behind -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Доступно обновлений: $commits_behind коммитов${NC}"
    else
        echo -e "${GREEN}✅ Проект актуален${NC}"
    fi
}

# Основная функция
main() {
    case "$1" in
        start)
            log_info "🚀 Запуск всех сервисов..."
            systemctl start postgresql redis-server melsu-api melsu-worker nginx
            log_success "✅ Все сервисы запущены"
            ;;
        stop)
            log_info "⏹️ Остановка сервисов приложения..."
            systemctl stop melsu-api melsu-worker
            log_success "⏹️ Сервисы остановлены"
            ;;
        restart)
            log_info "🔄 Перезапуск сервисов..."
            safe_restart
            ;;
        update)
            full_update
            ;;
        migrate)
            apply_migrations
            ;;
        backup)
            backup_database
            ;;
        status)
            monitor_system
            ;;
        logs)
            echo -e "${BLUE}📋 Логи сервисов (последние 20 строк):${NC}"
            echo "======================================"
            echo -e "\n${YELLOW}API логи:${NC}"
            journalctl -u melsu-api -n 20 --no-pager
            echo -e "\n${YELLOW}Worker логи:${NC}"
            journalctl -u melsu-worker -n 20 --no-pager
            echo -e "\n${YELLOW}Nginx логи:${NC}"
            tail -20 /var/log/nginx/error.log
            ;;
        live-logs)
            echo -e "${BLUE}📋 Мониторинг логов в реальном времени...${NC}"
            journalctl -u melsu-api -u melsu-worker -f
            ;;
        test)
            echo -e "${BLUE}🧪 Тестирование сервисов:${NC}"
            echo "========================"
            echo "Backend API:"
            curl -s -w "Время ответа: %{time_total}s\n" http://localhost:8000/health || echo "API не отвечает"
            echo -e "\nFrontend через Nginx:"
            curl -s -I http://localhost/ | head -1 || echo "Nginx не отвечает"
            echo -e "\nПроверка WebSocket:"
            curl -s -I -H "Upgrade: websocket" http://localhost:8000/ws || echo "WebSocket недоступен"
            ;;
        ssl)
            log_info "🔒 Настройка SSL сертификата..."
            certbot --nginx -d melsu.local -d www.melsu.local
            log_success "🔒 SSL настроен"
            ;;
        deploy)
            log_info "🚀 Запуск полного развертывания..."
            bash /var/www/melsu/deploy.sh
            ;;
        *)
            echo -e "${BLUE}🚀 MELSU Portal - Система управления${NC}"
            echo "====================================="
            echo ""
            echo -e "${YELLOW}Основные команды:${NC}"
            echo "  start       - Запустить все сервисы"
            echo "  stop        - Остановить сервисы приложения"
            echo "  restart     - Перезапустить сервисы"
            echo "  update      - Обновить проект с Git и применить миграции"
            echo "  status      - Показать статус системы"
            echo ""
            echo -e "${YELLOW}Управление БД:${NC}"
            echo "  migrate     - Применить миграции БД"
            echo "  backup      - Создать резервную копию БД"
            echo ""
            echo -e "${YELLOW}Мониторинг:${NC}"
            echo "  logs        - Показать последние логи"
            echo "  live-logs   - Мониторинг логов в реальном времени"
            echo "  test        - Тестировать все сервисы"
            echo ""
            echo -e "${YELLOW}Дополнительно:${NC}"
            echo "  ssl         - Настроить SSL сертификат"
            echo "  deploy      - Полное развертывание системы"
            echo ""
            echo -e "${GREEN}Примеры использования:${NC}"
            echo "  melsu update    # Обновить проект"
            echo "  melsu status    # Проверить статус"
            echo "  melsu live-logs # Мониторинг в реальном времени"
            ;;
    esac
}

# Запуск основной функции
main "$@" 