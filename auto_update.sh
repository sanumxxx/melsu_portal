#!/bin/bash

# 🔄 MELSU Portal - Автоматический скрипт обновления
# Этот скрипт безопасно обновляет приложение с проверками и откатом
# Автор: Sasha Honcharov (sanumxxx@yandex.ru)

set -euo pipefail  # Строгий режим: остановка при ошибках

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Конфигурация
PROJECT_PATH="/var/www/melsu"
BACKEND_PATH="$PROJECT_PATH/backend"
FRONTEND_PATH="$PROJECT_PATH/frontend"
BACKUP_DIR="/var/backups/melsu"
LOG_FILE="/var/log/melsu/auto_update.log"
ROLLBACK_INFO="/tmp/melsu_rollback_info"

# Создаем директории если их нет
mkdir -p $BACKUP_DIR
mkdir -p /var/log/melsu

# Функции логирования
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a $LOG_FILE
}

log_info() {
    log "INFO" "$@"
    echo -e "${BLUE}[INFO]${NC} $@"
}

log_success() {
    log "SUCCESS" "$@"
    echo -e "${GREEN}[SUCCESS]${NC} $@"
}

log_warning() {
    log "WARNING" "$@"
    echo -e "${YELLOW}[WARNING]${NC} $@"
}

log_error() {
    log "ERROR" "$@"
    echo -e "${RED}[ERROR]${NC} $@"
}

log_step() {
    log "STEP" "$@"
    echo -e "${PURPLE}[STEP]${NC} $@"
}

# Функция для отправки уведомлений (можно расширить для Slack/Telegram)
send_notification() {
    local status=$1
    local message=$2
    
    # Логируем уведомление
    log "NOTIFICATION" "[$status] $message"
    
    # Здесь можно добавить отправку в Slack, Telegram, email и т.д.
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"$message\"}" \
    #     $SLACK_WEBHOOK_URL
}

# Проверка прав
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Этот скрипт должен запускаться с правами root"
        exit 1
    fi
}

# Проверка доступности сервисов
check_services() {
    log_step "Проверка состояния сервисов..."
    
    local services=("postgresql" "redis-server" "nginx")
    for service in "${services[@]}"; do
        if ! systemctl is-active --quiet $service; then
            log_error "Сервис $service не запущен!"
            return 1
        fi
    done
    
    log_success "Все базовые сервисы запущены"
}

# Проверка дискового пространства
check_disk_space() {
    log_step "Проверка дискового пространства..."
    
    local available=$(df / | awk 'NR==2 {print $4}')
    local threshold=1048576  # 1GB в KB
    
    if [ $available -lt $threshold ]; then
        log_error "Недостаточно свободного места на диске (доступно: $(($available/1024))MB)"
        return 1
    fi
    
    log_success "Достаточно свободного места: $(($available/1024))MB"
}

# Создание бэкапа БД
backup_database() {
    log_step "Создание резервной копии базы данных..."
    
    local backup_file="$BACKUP_DIR/melsu_db_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if sudo -u postgres pg_dump melsu_db > $backup_file; then
        log_success "Резервная копия создана: $backup_file"
        echo "BACKUP_FILE=$backup_file" > $ROLLBACK_INFO
        
        # Сжимаем бэкап для экономии места
        gzip $backup_file
        log_info "Бэкап сжат: ${backup_file}.gz"
        
        # Удаляем старые бэкапы (старше 7 дней)
        find $BACKUP_DIR -name "melsu_db_backup_*.sql.gz" -mtime +7 -delete
        
        return 0
    else
        log_error "Ошибка создания резервной копии"
        return 1
    fi
}

# Проверка наличия обновлений
check_for_updates() {
    log_step "Проверка наличия обновлений..."
    
    cd $PROJECT_PATH
    
    # Сохраняем текущий коммит
    local current_commit=$(git rev-parse HEAD)
    echo "CURRENT_COMMIT=$current_commit" >> $ROLLBACK_INFO
    
    # Получаем обновления
    git fetch origin main
    
    local remote_commit=$(git rev-parse origin/main)
    
    if [ "$current_commit" = "$remote_commit" ]; then
        log_info "Проект уже актуален"
        return 1
    fi
    
    # Показываем что изменилось
    log_info "Обнаружены обновления:"
    git log --oneline $current_commit..origin/main | head -5
    
    return 0
}

# Проверка целостности обновлений
validate_update() {
    log_step "Проверка целостности обновлений..."
    
    cd $PROJECT_PATH
    
    # Проверяем, что важные файлы на месте
    local critical_files=(
        "backend/app/main.py"
        "backend/requirements.txt"
        "frontend/package.json"
        "backend/alembic.ini"
    )
    
    for file in "${critical_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Критически важный файл отсутствует: $file"
            return 1
        fi
    done
    
    # Проверяем синтаксис Python файлов в backend
    if ! python3 -m py_compile backend/app/main.py; then
        log_error "Синтаксическая ошибка в main.py"
        return 1
    fi
    
    # Проверяем package.json
    if ! node -e "JSON.parse(require('fs').readFileSync('frontend/package.json'))"; then
        log_error "Ошибка в package.json"
        return 1
    fi
    
    log_success "Проверка целостности прошла успешно"
}

# Применение обновлений
apply_updates() {
    log_step "Применение обновлений..."
    
    cd $PROJECT_PATH
    
    # Получаем информацию об изменениях для оптимизации
    local current_commit=$(git rev-parse HEAD)
    local changed_files=$(git diff --name-only $current_commit origin/main)
    
    # Обновляем код
    git reset --hard origin/main
    
    # Проверяем, нужно ли обновить зависимости backend
    if echo "$changed_files" | grep -q "backend/requirements.txt"; then
        log_step "Обновление зависимостей backend..."
        cd $BACKEND_PATH
        sudo -u melsu venv/bin/pip install -r requirements.txt
        cd $PROJECT_PATH
    fi
    
    # Проверяем, нужно ли обновить зависимости frontend
    if echo "$changed_files" | grep -q "frontend/package.json"; then
        log_step "Обновление зависимостей frontend..."
        cd $FRONTEND_PATH
        sudo -u melsu npm install
        cd $PROJECT_PATH
    fi
    
    log_success "Обновления применены"
}

# Применение миграций БД
apply_migrations() {
    log_step "Применение миграций базы данных..."
    
    cd $BACKEND_PATH
    
    # Проверяем текущую ревизию
    local current_rev=$(sudo -u melsu venv/bin/alembic current 2>/dev/null | grep -o '[a-f0-9]\{12\}' | head -1)
    local head_rev=$(sudo -u melsu venv/bin/alembic heads 2>/dev/null | grep -o '[a-f0-9]\{12\}' | head -1)
    
    echo "MIGRATION_FROM=$current_rev" >> $ROLLBACK_INFO
    
    if [ "$current_rev" != "$head_rev" ]; then
        log_info "Применение миграций с $current_rev до $head_rev..."
        
        # Применяем миграции с timeout
        if timeout 300 sudo -u melsu venv/bin/alembic upgrade head; then
            log_success "Миграции успешно применены"
        else
            log_error "Ошибка при применении миграций или timeout"
            return 1
        fi
    else
        log_info "Все миграции уже применены"
    fi
}

# Сборка frontend
build_frontend() {
    log_step "Сборка frontend..."
    
    cd $FRONTEND_PATH
    
    # Собираем с timeout
    if timeout 600 sudo -u melsu npm run build; then
        log_success "Frontend успешно собран"
    else
        log_error "Ошибка при сборке frontend или timeout"
        return 1
    fi
}

# Перезапуск сервисов
restart_services() {
    log_step "Перезапуск сервисов приложения..."
    
    # Graceful restart с проверками
    local services=("melsu-worker" "melsu-api")
    
    for service in "${services[@]}"; do
        log_info "Перезапуск $service..."
        systemctl restart $service
        
        # Ждем запуска
        local retries=0
        while [ $retries -lt 30 ]; do
            if systemctl is-active --quiet $service; then
                log_success "$service запущен"
                break
            fi
            if [ $retries -eq 29 ]; then
                log_error "$service не запустился"
                return 1
            fi
            sleep 1
            retries=$((retries + 1))
        done
    done
    
    # Перезагружаем nginx конфигурацию
    systemctl reload nginx
}

# Проверка работоспособности после обновления
health_check() {
    log_step "Проверка работоспособности системы..."
    
    local checks_passed=0
    local total_checks=4
    
    # Проверка API
    local retries=0
    while [ $retries -lt 20 ]; do
        local api_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null)
        if [ "$api_status" = "200" ]; then
            log_success "✅ API health check - OK"
            checks_passed=$((checks_passed + 1))
            break
        fi
        if [ $retries -eq 19 ]; then
            log_error "❌ API health check - FAILED"
        fi
        sleep 3
        retries=$((retries + 1))
    done
    
    # Проверка frontend
    local frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null)
    if [ "$frontend_status" = "200" ]; then
        log_success "✅ Frontend check - OK"
        checks_passed=$((checks_passed + 1))
    else
        log_error "❌ Frontend check - FAILED (код: $frontend_status)"
    fi
    
    # Проверка БД
    if sudo -u postgres psql melsu_db -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "✅ Database check - OK"
        checks_passed=$((checks_passed + 1))
    else
        log_error "❌ Database check - FAILED"
    fi
    
    # Проверка сервисов
    local services_ok=true
    for service in melsu-api melsu-worker nginx; do
        if ! systemctl is-active --quiet $service; then
            services_ok=false
            log_error "❌ Service $service is not active"
        fi
    done
    
    if $services_ok; then
        log_success "✅ All services are active"
        checks_passed=$((checks_passed + 1))
    fi
    
    # Результат проверки
    if [ $checks_passed -eq $total_checks ]; then
        log_success "Все проверки пройдены ($checks_passed/$total_checks)"
        return 0
    else
        log_error "Проверки не пройдены ($checks_passed/$total_checks)"
        return 1
    fi
}

# Откат изменений
rollback() {
    log_error "🔄 Начинаю откат изменений..."
    
    if [ ! -f $ROLLBACK_INFO ]; then
        log_error "Информация для отката не найдена"
        return 1
    fi
    
    source $ROLLBACK_INFO
    
    # Откат кода
    if [ -n "${CURRENT_COMMIT:-}" ]; then
        log_step "Откат к коммиту $CURRENT_COMMIT..."
        cd $PROJECT_PATH
        git reset --hard $CURRENT_COMMIT
    fi
    
    # Откат миграций
    if [ -n "${MIGRATION_FROM:-}" ]; then
        log_step "Откат миграций к $MIGRATION_FROM..."
        cd $BACKEND_PATH
        sudo -u melsu venv/bin/alembic downgrade $MIGRATION_FROM
    fi
    
    # Восстановление БД из бэкапа
    if [ -n "${BACKUP_FILE:-}" ] && [ -f "${BACKUP_FILE}.gz" ]; then
        log_step "Восстановление БД из бэкапа..."
        gunzip -c "${BACKUP_FILE}.gz" | sudo -u postgres psql melsu_db
    fi
    
    # Перезапуск сервисов
    restart_services
    
    log_success "Откат завершен"
    send_notification "ROLLBACK" "Система откачена к предыдущему состоянию"
}

# Очистка временных файлов
cleanup() {
    rm -f $ROLLBACK_INFO
}

# Основная функция
main() {
    local start_time=$(date +%s)
    
    log_info "🚀 Начинаю автоматическое обновление MELSU Portal..."
    send_notification "START" "Начато автоматическое обновление"
    
    # Базовые проверки
    check_permissions
    check_services
    check_disk_space
    
    # Проверяем наличие обновлений
    if ! check_for_updates; then
        log_success "Обновления не требуются"
        cleanup
        exit 0
    fi
    
    # Создаем бэкап
    if ! backup_database; then
        log_error "Не удалось создать бэкап БД. Обновление отменено."
        send_notification "FAILED" "Обновление отменено: ошибка создания бэкапа"
        exit 1
    fi
    
    # Применяем обновления с проверками и откатом при ошибках
    if apply_updates && validate_update && apply_migrations && build_frontend && restart_services && health_check; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_success "✅ Обновление завершено успешно за ${duration} секунд!"
        log_info "🌐 Система доступна и работает корректно"
        
        send_notification "SUCCESS" "Обновление завершено успешно за ${duration}с"
        
        # Показываем статус
        echo -e "\n${GREEN}📊 Финальный статус:${NC}"
        systemctl --no-pager status melsu-api melsu-worker nginx
        
    else
        log_error "❌ Ошибка при обновлении. Выполняю откат..."
        send_notification "FAILED" "Ошибка при обновлении, выполняется откат"
        
        if rollback; then
            log_success "Откат выполнен успешно"
            send_notification "ROLLBACK_SUCCESS" "Откат выполнен, система восстановлена"
        else
            log_error "Ошибка при откате! Требуется ручное вмешательство!"
            send_notification "CRITICAL" "КРИТИЧЕСКАЯ ОШИБКА: Откат не удался, требуется ручное вмешательство"
        fi
        
        exit 1
    fi
    
    cleanup
}

# Запуск с перехватом сигналов
trap 'log_error "Получен сигнал прерывания"; rollback; exit 1' INT TERM

# Запуск основной функции
main "$@" 