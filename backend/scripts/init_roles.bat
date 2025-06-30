@echo off
chcp 65001 >nul
title Инициализация системных ролей МелГУ

cd /d "%~dp0.."

echo 🎓 Инициализация системных ролей МелГУ
echo =====================================
echo.

if "%1"=="--help" goto :help
if "%1"=="-h" goto :help
if "%1"=="help" goto :help

if "%1"=="--show" goto :show
if "%1"=="-s" goto :show

if "%1"=="--force" goto :force
if "%1"=="-f" goto :force

echo 📋 Запуск обычной инициализации (создание недостающих ролей)...
python scripts\init_system_roles.py
goto :end

:show
echo 📋 Просмотр текущих ролей в системе...
python scripts\init_system_roles.py --show
goto :end

:force
echo ⚠️  Принудительное обновление всех системных ролей...
python scripts\init_system_roles.py --force
goto :end

:help
echo.
echo Использование: init_roles.bat [опция]
echo.
echo Опции:
echo   help, -h, --help    Показать это сообщение помощи
echo   -s, --show          Показать текущие роли в системе
echo   -f, --force         Принудительно обновить все системные роли
echo.
echo Примеры:
echo   init_roles.bat           Создать недостающие роли
echo   init_roles.bat --force   Обновить все системные роли
echo   init_roles.bat --show    Показать текущие роли
echo.
goto :end

:end
echo.
pause 