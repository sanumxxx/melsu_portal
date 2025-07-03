# 🤖 Автоматизация развертывания MELSU Portal

Полная инструкция по настройке автоматизированной системы развертывания без Docker с поддержкой миграций базы данных.

## 📋 Содержание

1. [Начальная настройка](#начальная-настройка)
2. [Настройка GitHub Actions](#настройка-github-actions)  
3. [Скрипты управления](#скрипты-управления)
4. [Автоматические обновления](#автоматические-обновления)
5. [Мониторинг и логи](#мониторинг-и-логи)
6. [Решение проблем](#решение-проблем)

---

## 🚀 Начальная настройка

### 1. Развертывание на сервере

```bash
# Подключаемся к серверу
ssh root@your-server-ip

# Запускаем автоматическое развертывание
curl -sSL https://raw.githubusercontent.com/sanumxxx/melsu_portal/main/deploy.sh | bash

# Или скачиваем и запускаем локально
wget https://raw.githubusercontent.com/sanumxxx/melsu_portal/main/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

### 2. Проверка установки

После установки у вас будут доступны следующие команды:

```bash
# Основной скрипт управления
melsu status          # Проверить статус системы
melsu update          # Обновить проект
melsu restart         # Перезапустить сервисы

# Автоматическое обновление
melsu-auto-update     # Безопасное обновление с откатом
```

---

## ⚙️ Настройка GitHub Actions

### 1. Создание SSH ключа для развертывания

На вашем сервере:

```bash
# Создаем специальный SSH ключ для GitHub Actions
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy_key -N ""

# Добавляем публичный ключ в authorized_keys
cat ~/.ssh/github_deploy_key.pub >> ~/.ssh/authorized_keys

# Получаем приватный ключ для добавления в GitHub Secrets
cat ~/.ssh/github_deploy_key
```

### 2. Настройка GitHub Secrets

Идем в ваш репозиторий на GitHub → Settings → Secrets and variables → Actions

Добавляем следующие secrets:

| Название | Значение | Описание |
|----------|----------|----------|
| `SERVER_HOST` | `82.202.130.12` | IP адрес вашего сервера |
| `SERVER_USER` | `root` | Пользователь для подключения |
| `SERVER_SSH_KEY` | `приватный ключ` | Содержимое файла ~/.ssh/github_deploy_key |

### 3. Проверка GitHub Actions

После настройки secrets:

1. Сделайте любой коммит в ветку `main`
2. Push в репозиторий
3. Перейдите в Actions вашего репозитория
4. Наблюдайте за процессом автоматического развертывания

---

## 🛠️ Скрипты управления

### Основной скрипт управления: `melsu`

```bash
# Основные команды
melsu start           # Запустить все сервисы
melsu stop            # Остановить сервисы приложения  
melsu restart         # Перезапустить сервисы
melsu update          # Полное обновление с миграциями
melsu status          # Показать статус системы

# Управление БД
melsu migrate         # Применить миграции БД
melsu backup          # Создать резервную копию БД

# Мониторинг
melsu logs            # Показать последние логи
melsu live-logs       # Мониторинг логов в реальном времени
melsu test            # Тестировать все сервисы

# Дополнительно
melsu ssl             # Настроить SSL сертификат
melsu deploy          # Полное развертывание системы
```

### Автоматическое обновление: `melsu-auto-update`

Безопасный скрипт обновления с:
- ✅ Автоматическим бэкапом БД
- ✅ Проверкой целостности
- ✅ Применением миграций
- ✅ Health check
- ✅ Автоматическим откатом при ошибках

```bash
# Запуск автоматического обновления
melsu-auto-update

# Логи автоматического обновления
tail -f /var/log/melsu/auto_update.log
```

---

## ⏰ Автоматические обновления

### 1. Настройка cron для автоматических обновлений

Редактируем cron файл:

```bash
nano /etc/cron.d/melsu-auto-update
```

Раскомментируйте строку для включения автоматических обновлений:

```cron
# Автоматическое обновление каждый день в 3:00 утра
0 3 * * * root /usr/local/bin/melsu-auto-update >> /var/log/melsu/auto_update.log 2>&1
```

### 2. Другие варианты расписания

```cron
# Каждые 6 часов
0 */6 * * * root /usr/local/bin/melsu-auto-update

# Только в рабочие дни в 2:00
0 2 * * 1-5 root /usr/local/bin/melsu-auto-update

# Каждое воскресенье в 4:00
0 4 * * 0 root /usr/local/bin/melsu-auto-update
```

### 3. Webhook для мгновенных обновлений

Если хотите обновления сразу после push, создайте endpoint:

```bash
# Создаем простой webhook скрипт
tee /var/www/melsu/webhook.php > /dev/null <<'EOF'
<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = json_decode(file_get_contents('php://input'), true);
    
    if ($payload['ref'] === 'refs/heads/main') {
        // Запускаем обновление в фоне
        exec('/usr/local/bin/melsu-auto-update > /dev/null 2>&1 &');
        http_response_code(200);
        echo "Update triggered";
    }
}
?>
EOF

# Добавляем в Nginx конфигурацию
# location /webhook.php {
#     fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
#     include fastcgi_params;
#     fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
# }
```

---

## 📊 Мониторинг и логи

### 1. Логи системы

```bash
# Основные логи
journalctl -u melsu-api -f           # API логи
journalctl -u melsu-worker -f        # Worker логи
tail -f /var/log/nginx/error.log     # Nginx ошибки

# Логи автоматического обновления
tail -f /var/log/melsu/auto_update.log

# Все логи MELSU
journalctl -u melsu-* -f
```

### 2. Мониторинг статуса

```bash
# Быстрая проверка всего
melsu status

# Детальная информация о сервисах
systemctl status melsu-api melsu-worker nginx postgresql redis-server

# Проверка подключений к БД
sudo -u postgres psql melsu_db -c "SELECT datname, numbackends FROM pg_stat_database WHERE datname='melsu_db';"
```

### 3. Настройка alertов

Создаем скрипт для проверки здоровья системы:

```bash
tee /usr/local/bin/melsu-health-monitor > /dev/null <<'EOF'
#!/bin/bash

# Проверяем API
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "CRITICAL: API not responding" | logger -t melsu-monitor
    # Отправляем уведомление (email, Slack, Telegram)
fi

# Проверяем использование диска
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "WARNING: Disk usage at ${DISK_USAGE}%" | logger -t melsu-monitor
fi

# Проверяем память
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEM_USAGE -gt 90 ]; then
    echo "WARNING: Memory usage at ${MEM_USAGE}%" | logger -t melsu-monitor
fi
EOF

chmod +x /usr/local/bin/melsu-health-monitor

# Добавляем в cron (каждые 5 минут)
echo "*/5 * * * * root /usr/local/bin/melsu-health-monitor" >> /etc/cron.d/melsu-monitoring
```

---

## 🔧 Управление миграциями

### 1. Создание новой миграции

На вашей локальной машине:

```bash
cd backend
source venv/bin/activate

# Создаем новую миграцию
alembic revision --autogenerate -m "Описание изменений"

# Проверяем миграцию
alembic show head

# Коммитим и пушим
git add alembic/versions/
git commit -m "Add new migration: описание"
git push origin main
```

### 2. Применение миграций

Миграции автоматически применяются при:
- GitHub Actions развертывании
- Команде `melsu update`
- Автоматическом обновлении `melsu-auto-update`

Ручное применение:

```bash
# Только миграции
melsu migrate

# Проверить текущую версию БД
cd /var/www/melsu/backend
sudo -u melsu venv/bin/alembic current
```

### 3. Откат миграций

```bash
cd /var/www/melsu/backend

# Посмотреть историю
sudo -u melsu venv/bin/alembic history

# Откатить к конкретной ревизии
sudo -u melsu venv/bin/alembic downgrade <revision_id>

# Откатить на одну версию назад
sudo -u melsu venv/bin/alembic downgrade -1
```

---

## 🚨 Решение проблем

### 1. GitHub Actions не работает

```bash
# Проверяем SSH подключение
ssh -i ~/.ssh/github_deploy_key root@your-server-ip

# Проверяем права на файлы
ls -la ~/.ssh/
cat ~/.ssh/authorized_keys | grep github

# Проверяем логи GitHub Actions
# Идем в репозиторий → Actions → последний запуск
```

### 2. Ошибки при миграциях

```bash
# Проверяем состояние БД
sudo -u postgres psql melsu_db -c "\dt"

# Принудительно устанавливаем ревизию (ОСТОРОЖНО!)
cd /var/www/melsu/backend
sudo -u melsu venv/bin/alembic stamp head

# Восстанавливаем из бэкапа
ls -la /var/backups/melsu/
gunzip -c /var/backups/melsu/melsu_db_backup_YYYYMMDD_HHMMSS.sql.gz | sudo -u postgres psql melsu_db
```

### 3. Сервисы не запускаются

```bash
# Проверяем статус и логи
systemctl status melsu-api
journalctl -u melsu-api -n 50

# Проверяем конфигурацию
cd /var/www/melsu/backend
source venv/bin/activate
python -c "from app.main import app; print('App loads successfully')"

# Перезапускаем все
melsu restart
```

### 4. Проблемы с фронтендом

```bash
# Пересобираем фронтенд
cd /var/www/melsu/frontend
sudo -u melsu npm install
sudo -u melsu npm run build

# Проверяем Nginx
nginx -t
systemctl reload nginx
```

---

## 📞 Полезные команды

### Быстрая диагностика

```bash
# Полная проверка системы
melsu status && melsu test

# Просмотр активности
melsu live-logs

# Быстрый перезапуск
melsu restart

# Принудительное обновление
melsu update
```

### Резервное копирование

```bash
# Создать бэкап
melsu backup

# Просмотр бэкапов
ls -la /var/backups/melsu/

# Восстановление из конкретного бэкапа
gunzip -c /var/backups/melsu/backup_file.sql.gz | sudo -u postgres psql melsu_db
```

### Просмотр логов

```bash
# Все логи MELSU
journalctl -u melsu-* --since "1 hour ago"

# Только ошибки
journalctl -u melsu-api -p err --since today

# Логи автоматического обновления
tail -100 /var/log/melsu/auto_update.log
```

---

## ✅ Заключение

Теперь у вас есть полностью автоматизированная система развертывания:

1. **GitHub Actions** автоматически обновляет сервер при push в main
2. **Скрипт управления** `melsu` упрощает повседневные операции
3. **Автоматические обновления** с бэкапом и откатом
4. **Система мониторинга** и логирования
5. **Безопасные миграции** БД

**Основной workflow:**
1. Делаете изменения локально
2. Push в GitHub
3. Actions автоматически обновляет сервер
4. Миграции применяются автоматически
5. При ошибках - автоматический откат

🎉 **Готово! Теперь развертывание стало простым и безопасным!** 