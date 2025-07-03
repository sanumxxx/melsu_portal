#!/bin/bash

# 🚀 MELSU Portal - Автоматический скрипт развертывания на VPS
# Автор: Sasha Honcharov (sanumxxx@yandex.ru)

set -e  # Остановка при любой ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода логов
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

# Проверка root прав
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Этот скрипт должен запускаться с правами root"
        exit 1
    fi
}

# Обновление системы
update_system() {
    log_info "Обновление системы..."
    apt update && apt upgrade -y
    log_success "Система обновлена"
}

# Установка необходимых пакетов
install_dependencies() {
    log_info "Установка зависимостей..."
    apt install -y \
        python3 \
        python3-pip \
        python3-venv \
        nodejs \
        npm \
        nginx \
        postgresql \
        postgresql-contrib \
        redis-server \
        git \
        ufw \
        certbot \
        python3-certbot-nginx \
        htop \
        curl \
        unzip
    log_success "Зависимости установлены"
}

# Настройка PostgreSQL
setup_postgresql() {
    log_info "Настройка PostgreSQL..."
    
    # Запуск PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    # Создание базы данных и пользователя
    sudo -u postgres psql -c "CREATE DATABASE melsu_db;" 2>/dev/null || log_warning "База данных уже существует"
    sudo -u postgres psql -c "CREATE USER melsu_user WITH PASSWORD 'MelsuPortal2024!';" 2>/dev/null || log_warning "Пользователь уже существует"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE melsu_db TO melsu_user;" 2>/dev/null
    sudo -u postgres psql -c "ALTER USER melsu_user CREATEDB;" 2>/dev/null
    
    log_success "PostgreSQL настроен"
}

# Настройка Redis
setup_redis() {
    log_info "Настройка Redis..."
    systemctl start redis-server
    systemctl enable redis-server
    log_success "Redis настроен"
}

# Создание пользователя для приложения
create_app_user() {
    log_info "Создание пользователя для приложения..."
    
    # Создание пользователя melsu
    if ! id "melsu" &>/dev/null; then
        adduser --system --group --home /var/www/melsu melsu
        log_success "Пользователь melsu создан"
    else
        log_warning "Пользователь melsu уже существует"
    fi
}

# Клонирование проекта
clone_project() {
    log_info "Клонирование проекта..."
    
    # Создание директории и клонирование
    mkdir -p /var/www/melsu
    cd /var/www/melsu
    
    if [ ! -d ".git" ]; then
        git clone https://github.com/sanumxxx/melsu_portal.git .
    else
        git pull origin main
    fi
    
    # Изменение владельца
    chown -R melsu:melsu /var/www/melsu
    log_success "Проект клонирован"
}

# Настройка Backend
setup_backend() {
    log_info "Настройка Backend..."
    
    cd /var/www/melsu/backend
    
    # Создание виртуального окружения
    sudo -u melsu python3 -m venv venv
    
    # Установка зависимостей
    sudo -u melsu /var/www/melsu/backend/venv/bin/pip install -r requirements.txt
    
    # Создание .env файла
    sudo -u melsu tee /var/www/melsu/backend/.env > /dev/null <<EOF
DATABASE_URL=postgresql://melsu_user:MelsuPortal2024!@localhost/melsu_db
REDIS_URL=redis://localhost:6379
SECRET_KEY=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,$(curl -s ifconfig.me)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EOF
    
    # Миграции базы данных
    sudo -u melsu /var/www/melsu/backend/venv/bin/alembic upgrade head
    
    # Инициализация системных ролей
    if [ -f "scripts/init_system_roles.py" ]; then
        sudo -u melsu /var/www/melsu/backend/venv/bin/python scripts/init_system_roles.py
    fi
    
    log_success "Backend настроен"
}

# Настройка Frontend
setup_frontend() {
    log_info "Настройка Frontend..."
    
    cd /var/www/melsu/frontend
    
    # Установка зависимостей
    sudo -u melsu npm install
    
    # Сборка проекта
    sudo -u melsu npm run build
    
    log_success "Frontend настроен"
}

# Создание systemd сервисов
create_systemd_services() {
    log_info "Создание systemd сервисов..."
    
    # FastAPI сервис
    tee /etc/systemd/system/melsu-api.service > /dev/null <<EOF
[Unit]
Description=MELSU Portal FastAPI application
After=network.target postgresql.service redis.service

[Service]
Type=exec
User=melsu
Group=melsu
WorkingDirectory=/var/www/melsu/backend
Environment=PATH=/var/www/melsu/backend/venv/bin
ExecStart=/var/www/melsu/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

    # Celery Worker сервис
    tee /etc/systemd/system/melsu-worker.service > /dev/null <<EOF
[Unit]
Description=MELSU Portal Celery Worker
After=network.target redis.service

[Service]
Type=exec
User=melsu
Group=melsu
WorkingDirectory=/var/www/melsu/backend
Environment=PATH=/var/www/melsu/backend/venv/bin
ExecStart=/var/www/melsu/backend/venv/bin/celery -A app.main worker --loglevel=info
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

    # Перезагрузка systemd и запуск сервисов
    systemctl daemon-reload
    systemctl enable melsu-api melsu-worker
    systemctl start melsu-api melsu-worker
    
    log_success "Systemd сервисы созданы и запущены"
}

# Настройка Nginx
setup_nginx() {
    log_info "Настройка Nginx..."
    
    # Удаление дефолтного сайта
    rm -f /etc/nginx/sites-enabled/default
    
    # Создание конфигурации для MELSU Portal
    tee /etc/nginx/sites-available/melsu-portal > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    client_max_body_size 100M;

    # Frontend
    location / {
        root /var/www/melsu/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Backend docs
    location /docs {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /redoc {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files
    location /static/ {
        alias /var/www/melsu/backend/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /uploads/ {
        alias /var/www/melsu/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    # Активация сайта
    ln -sf /etc/nginx/sites-available/melsu-portal /etc/nginx/sites-enabled/
    
    # Проверка конфигурации и перезапуск Nginx
    nginx -t && systemctl restart nginx
    systemctl enable nginx
    
    log_success "Nginx настроен"
}

# Настройка файрвола
setup_firewall() {
    log_info "Настройка файрвола..."
    
    # Базовые правила UFW
    ufw default deny incoming
    ufw default allow outgoing
    
    # Разрешение SSH, HTTP, HTTPS
    ufw allow ssh
    ufw allow 'Nginx Full'
    
    # Включение UFW
    ufw --force enable
    
    log_success "Файрвол настроен"
}

# Создание скрипта обновления
create_update_script() {
    log_info "Создание скриптов управления..."
    
    # Копируем основной скрипт управления
    cp melsu_control.sh /usr/local/bin/melsu
    chmod +x /usr/local/bin/melsu
    chown root:root /usr/local/bin/melsu
    
    # Копируем автоматический скрипт обновления
    cp auto_update.sh /usr/local/bin/melsu-auto-update
    chmod +x /usr/local/bin/melsu-auto-update
    chown root:root /usr/local/bin/melsu-auto-update
    
    # Создаем cron задачу для автоматических обновлений (по желанию)
    tee /etc/cron.d/melsu-auto-update > /dev/null <<EOF
# Автоматическое обновление MELSU Portal каждый день в 3:00 утра
# Раскомментируйте следующую строку, если хотите включить автоматические обновления
# 0 3 * * * root /usr/local/bin/melsu-auto-update >> /var/log/melsu/auto_update.log 2>&1
EOF
    
    # Создаем простой скрипт обновления для обратной совместимости
    tee /var/www/melsu/update.sh > /dev/null <<'EOF'
#!/bin/bash

# Простой скрипт обновления MELSU Portal (обратная совместимость)
# Для более продвинутых возможностей используйте: melsu update

set -e

echo "🔄 Обновление MELSU Portal..."

# Переход в директорию проекта
cd /var/www/melsu

# Обновление кода
git pull origin main

# Обновление backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
deactivate

# Обновление frontend
cd ../frontend
npm install
npm run build

# Перезапуск сервисов
sudo systemctl restart melsu-api melsu-worker nginx

echo "✅ Обновление завершено!"
EOF

    chmod +x /var/www/melsu/update.sh
    chown melsu:melsu /var/www/melsu/update.sh
    
    log_success "Скрипты управления созданы"
}

# Вывод информации о завершении
print_completion_info() {
    local SERVER_IP=$(curl -s ifconfig.me)
    
    echo
    echo "🎉 РАЗВЕРТЫВАНИЕ ЗАВЕРШЕНО УСПЕШНО!"
    echo "=================================="
    echo
    echo "🌐 Ваш сайт доступен по адресу:"
    echo "   http://$SERVER_IP"
    echo "   http://localhost (если на локальной машине)"
    echo
    echo "📚 API документация:"
    echo "   http://$SERVER_IP/docs"
    echo "   http://$SERVER_IP/redoc"
    echo
    echo "🔧 Управление сервисами:"
    echo "   systemctl status melsu-api    # Статус API"
    echo "   systemctl status melsu-worker # Статус Celery"
    echo "   systemctl restart melsu-api   # Перезапуск API"
    echo
    echo "📋 Логи:"
    echo "   journalctl -u melsu-api -f    # Логи API"
    echo "   journalctl -u melsu-worker -f # Логи Celery"
    echo
    echo "🔄 Обновление:"
    echo "   /var/www/melsu/update.sh      # Скрипт обновления"
    echo
    echo "⚙️ Файлы конфигурации:"
    echo "   /var/www/melsu/backend/.env               # Переменные окружения"
    echo "   /etc/nginx/sites-available/melsu-portal  # Конфигурация Nginx"
    echo "   /etc/systemd/system/melsu-*.service      # Systemd сервисы"
    echo
    echo "🔐 Не забудьте:"
    echo "   1. Настроить DNS для вашего домена"
    echo "   2. Установить SSL сертификат: certbot --nginx"
    echo "   3. Настроить email в /var/www/melsu/backend/.env"
    echo "   4. Создать первого администратора в системе"
    echo
}

# Основная функция
main() {
    echo "🚀 Начинаем автоматическое развертывание MELSU Portal"
    echo "======================================================"
    
    check_root
    update_system
    install_dependencies
    setup_postgresql
    setup_redis
    create_app_user
    clone_project
    setup_backend
    setup_frontend
    create_systemd_services
    setup_nginx
    setup_firewall
    create_update_script
    
    print_completion_info
}

# Запуск основной функции
main "$@" 