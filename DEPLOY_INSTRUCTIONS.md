# 🚀 Инструкции по развертыванию MELSU Portal

## 📋 Подготовка к развертыванию

### 1. Загрузка кода в репозиторий

**На вашем локальном компьютере:**

```bash
# Переход в папку с проектом
cd /c/Users/sanumxxx/Desktop/my_melsu

# Инициализация git репозитория (если еще не сделано)
git init

# Добавление remote репозитория
git remote add origin https://github.com/sanumxxx/melsu_portal.git

# Создание .gitignore файла
echo "# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv
ENV/
.env
.DS_Store

# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
Thumbs.db
.DS_Store

# Logs
logs/
*.log

# Database
*.db
*.sqlite3

# Uploads (не коммитим загруженные файлы)
uploads/
image_cache/
pdf_cache/

# Compiled files
dist/
build/" > .gitignore

# Добавление всех файлов
git add .

# Первый коммит
git commit -m "🎉 Initial commit: MELSU Portal - система управления заявками

✨ Возможности:
- Система заявок с автоматической маршрутизацией
- Управление пользователями и ролями
- Журнал активности и аналитика
- WebSocket уведомления
- Email интеграция

🛠️ Технологии:
- Backend: FastAPI + SQLAlchemy + PostgreSQL
- Frontend: React + Tailwind CSS
- Кэш: Redis
- Фоновые задачи: Celery"

# Отправка в репозиторий
git branch -M main
git push -u origin main
```

### 2. Настройка Git учетных данных (если нужно)

```bash
# Настройка имени и email
git config --global user.name "Sasha Honcharov"
git config --global user.email "sanumxxx@yandex.ru"

# Если нужна аутентификация через токен
git config --global credential.helper store
```

---

## 🖥️ Развертывание на VPS (Автоматическое)

### Способ 1: Скрипт автоматической установки

**На VPS сервере (82.202.130.12):**

```bash
# Подключение к серверу
ssh root@82.202.130.12

# Скачивание и запуск скрипта установки
curl -sSL https://raw.githubusercontent.com/sanumxxx/melsu_portal/main/deploy.sh | bash

# Или локально:
wget https://raw.githubusercontent.com/sanumxxx/melsu_portal/main/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

**Что делает скрипт:**
- ✅ Обновляет систему
- ✅ Устанавливает все зависимости (Python, Node.js, PostgreSQL, Redis, Nginx)
- ✅ Создает пользователя и базу данных
- ✅ Клонирует проект
- ✅ Настраивает backend и frontend
- ✅ Создает systemd сервисы
- ✅ Настраивает Nginx
- ✅ Настраивает файрвол

---

## 🐳 Развертывание через Docker (Альтернативный способ)

### Предварительные требования:
- Docker
- Docker Compose

```bash
# Подключение к серверу
ssh root@82.202.130.12

# Установка Docker (если не установлен)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Клонирование проекта
git clone https://github.com/sanumxxx/melsu_portal.git
cd melsu_portal

# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка сервисов
docker-compose down
```

---

## ⚙️ Ручное развертывание (Пошагово)

<details>
<summary>Развернуть инструкции для ручной установки</summary>

### 1. Подготовка сервера

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка зависимостей
apt install -y python3 python3-pip python3-venv nodejs npm nginx postgresql postgresql-contrib redis-server git ufw
```

### 2. Настройка PostgreSQL

```bash
# Создание базы данных
sudo -u postgres psql
CREATE DATABASE melsu_db;
CREATE USER melsu_user WITH PASSWORD 'MelsuPortal2024!';
GRANT ALL PRIVILEGES ON DATABASE melsu_db TO melsu_user;
\q
```

### 3. Клонирование проекта

```bash
# Создание директории
mkdir -p /var/www/melsu
cd /var/www/melsu

# Клонирование
git clone https://github.com/sanumxxx/melsu_portal.git .

# Создание пользователя
adduser --system --group melsu
chown -R melsu:melsu /var/www/melsu
```

### 4. Настройка Backend

```bash
cd /var/www/melsu/backend

# Виртуальное окружение
sudo -u melsu python3 -m venv venv
sudo -u melsu venv/bin/pip install -r requirements.txt

# Переменные окружения
sudo -u melsu nano .env
# Добавить:
DATABASE_URL=postgresql://melsu_user:MelsuPortal2024!@localhost/melsu_db
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key
DEBUG=False

# Миграции
sudo -u melsu venv/bin/alembic upgrade head
```

### 5. Настройка Frontend

```bash
cd /var/www/melsu/frontend

# Установка зависимостей и сборка
sudo -u melsu npm install
sudo -u melsu npm run build
```

### 6. Создание Systemd сервисов

```bash
# Создание сервисов (см. deploy.sh для полных конфигураций)
nano /etc/systemd/system/melsu-api.service
nano /etc/systemd/system/melsu-worker.service

# Запуск
systemctl daemon-reload
systemctl enable melsu-api melsu-worker
systemctl start melsu-api melsu-worker
```

### 7. Настройка Nginx

```bash
# Создание конфигурации (см. deploy.sh)
nano /etc/nginx/sites-available/melsu-portal
ln -s /etc/nginx/sites-available/melsu-portal /etc/nginx/sites-enabled/
systemctl restart nginx
```

</details>

---

## 🔧 После развертывания

### 1. Проверка работоспособности

```bash
# Проверка статуса сервисов
systemctl status melsu-api
systemctl status melsu-worker
systemctl status nginx
systemctl status postgresql
systemctl status redis

# Проверка логов
journalctl -u melsu-api -f
journalctl -u melsu-worker -f
```

### 2. Настройка SSL сертификата

```bash
# Установка Certbot (если не установлен)
apt install -y certbot python3-certbot-nginx

# Получение сертификата
certbot --nginx -d your-domain.com

# Автоматическое обновление
crontab -e
# Добавить: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Создание первого администратора

```bash
# Переход в директорию backend
cd /var/www/melsu/backend

# Активация виртуального окружения
source venv/bin/activate

# Запуск скрипта создания админа (если есть)
python scripts/create_admin.py

# Или через Django shell/FastAPI консоль
```

### 4. Настройка email

Отредактируйте файл `/var/www/melsu/backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## 🔄 Обновление проекта

### Автоматическое обновление

```bash
# Запуск скрипта обновления
/var/www/melsu/update.sh
```

### Ручное обновление

```bash
cd /var/www/melsu

# Обновление кода
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
deactivate

# Frontend
cd ../frontend
npm install
npm run build

# Перезапуск сервисов
systemctl restart melsu-api melsu-worker nginx
```

---

## 📊 Мониторинг

### Основные команды

```bash
# Статус сервисов
systemctl status melsu-api melsu-worker

# Логи в реальном времени
journalctl -u melsu-api -f
journalctl -u melsu-worker -f

# Использование ресурсов
htop
df -h
free -h

# Подключения к базе данных
sudo -u postgres psql melsu_db
\dt  # Список таблиц
\q   # Выход
```

### Мониторинг с Prometheus + Grafana (Docker)

```bash
# Запуск с мониторингом
docker-compose --profile monitoring up -d

# Prometheus: http://your-server:9090
# Grafana: http://your-server:3001 (admin/MelsuGrafana2024!)
```

---

## 🚨 Решение проблем

### Проблемы с базой данных

```bash
# Проверка статуса PostgreSQL
systemctl status postgresql

# Перезапуск
systemctl restart postgresql

# Проверка подключения
sudo -u postgres psql melsu_db
```

### Проблемы с API

```bash
# Проверка логов
journalctl -u melsu-api -n 50

# Перезапуск API
systemctl restart melsu-api

# Проверка портов
netstat -tlnp | grep 8000
```

### Проблемы с Nginx

```bash
# Проверка конфигурации
nginx -t

# Проверка логов
tail -f /var/log/nginx/error.log

# Перезапуск
systemctl restart nginx
```

---

## 📞 Поддержка

**Контакты:**
- GitHub: [@sanumxxx](https://github.com/sanumxxx)
- Email: sanumxxx@yandex.ru

**Полезные ссылки:**
- Репозиторий: https://github.com/sanumxxx/melsu_portal
- Документация API: http://your-server/docs
- Мониторинг: http://your-server:9090 (Prometheus)

---

## 🎯 Следующие шаги

1. ✅ Развернуть проект на сервере
2. ✅ Настроить домен и SSL
3. ✅ Создать первого администратора
4. ✅ Настроить email уведомления
5. ✅ Добавить пользователей и роли
6. ✅ Создать шаблоны заявок
7. ✅ Настроить мониторинг
8. ✅ Создать резервные копии

**Удачного развертывания! 🚀** 