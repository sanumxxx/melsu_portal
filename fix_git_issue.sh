#!/bin/bash

# 🔧 Быстрое исправление проблемы с Git divergent branches
# Запустите этот скрипт на сервере: bash fix_git_issue.sh

echo "🔧 Исправляю проблему с Git divergent branches..."

cd /var/www/melsu

# Настраиваем Git для автоматического merge
git config pull.rebase false

# Принудительно синхронизируемся с remote
echo "📦 Принудительная синхронизация с GitHub..."
git fetch origin main
git reset --hard origin/main

echo "✅ Проблема исправлена!"
echo "🔄 Теперь можно запустить обновление:"
echo "   melsu update"

# Проверяем статус
echo "📊 Текущий статус Git:"
git status 