#!/bin/bash

# Быстрое развертывание MELSU Portal на продакшн сервере
# Использование: ./quick_deploy.sh

set -e

echo "🚀 Быстрое развертывание MELSU Portal..."

# Проверяем, что мы в правильной директории
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Файл docker-compose.yml не найден!"
    exit 1
fi

# Получаем последние изменения
echo "📥 Получаем обновления..."
git fetch origin
git reset --hard origin/main

# Быстрый перезапуск без пересборки (только если контейнеры уже существуют)
echo "🔄 Перезапускаем сервисы..."
docker-compose restart

# Ждем запуска
echo "⏳ Ждем запуска..."
sleep 5

# Проверяем статус
echo "🔍 Статус сервисов:"
docker-compose ps

# Показываем последние логи
echo "📋 Последние логи backend:"
docker-compose logs --tail=10 backend

echo ""
echo "✅ Быстрое развертывание завершено!"
echo ""
echo "📊 Для отладки используйте:"
echo "  Все логи:        docker-compose logs -f"
echo "  Логи backend:    docker-compose logs -f backend"
echo "  Полная пересборка: ./deploy_debug.sh" 