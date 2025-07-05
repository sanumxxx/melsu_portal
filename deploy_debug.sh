#!/bin/bash

# Deploy script для обновления MELSU Portal с дебагом
# Использование: ./deploy_debug.sh

set -e

echo "🚀 Начинаем развертывание MELSU Portal с дебагом..."

# Проверяем, что мы в правильной директории
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Файл docker-compose.yml не найден! Убедитесь, что вы в корневой директории проекта."
    exit 1
fi

# Получаем последние изменения
echo "📥 Получаем последние изменения из Git..."
git fetch origin
git reset --hard origin/main

# Останавливаем сервисы
echo "🛑 Останавливаем сервисы..."
docker-compose down

# Пересобираем контейнеры
echo "🔨 Пересобираем контейнеры..."
docker-compose build --no-cache

# Включаем дебажный режим для backend
echo "🐛 Настраиваем дебажный режим..."

# Создаем временный docker-compose файл с дебагом
cat > docker-compose.debug.yml << EOF
version: '3.8'
services:
  backend:
    environment:
      - DEBUG=True
      - LOG_LEVEL=DEBUG
      - PYTHONPATH=/app
    volumes:
      - ./backend/logs:/app/logs
    ports:
      - "8000:8000"
    command: ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--log-level", "debug"]
  
  frontend:
    environment:
      - NODE_ENV=development
      - REACT_APP_DEBUG=true
    ports:
      - "3000:3000"
EOF

# Создаем директорию для логов
mkdir -p backend/logs

# Запускаем сервисы с дебагом
echo "🚀 Запускаем сервисы с дебагом..."
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up -d

# Ждем запуска сервисов
echo "⏳ Ждем запуска сервисов..."
sleep 10

# Проверяем статус
echo "🔍 Проверяем статус сервисов..."
docker-compose ps

# Проверяем логи backend
echo "📋 Последние логи backend:"
docker-compose logs --tail=20 backend

# Проверяем доступность API
echo "🌐 Проверяем доступность API..."
if curl -f -s http://localhost:8000/docs > /dev/null; then
    echo "✅ Backend API доступен"
else
    echo "❌ Backend API недоступен"
fi

# Проверяем доступность фронтенда
if curl -f -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend доступен"
else
    echo "❌ Frontend недоступен"
fi

echo ""
echo "🎉 Развертывание завершено!"
echo ""
echo "📊 Полезные команды для отладки:"
echo "  Логи backend:    docker-compose logs -f backend"
echo "  Логи frontend:   docker-compose logs -f frontend"
echo "  Логи database:   docker-compose logs -f db"
echo "  Все логи:        docker-compose logs -f"
echo "  Статус:          docker-compose ps"
echo "  Перезапуск:      docker-compose restart"
echo ""
echo "🌐 URLs:"
echo "  Frontend:        http://localhost:3000"
echo "  Backend API:     http://localhost:8000"
echo "  API Docs:        http://localhost:8000/docs"
echo ""
echo "📁 Логи сохраняются в: backend/logs/" 