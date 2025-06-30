# 🎓 MELSU Portal

<div align="center">

![MELSU Portal](https://img.shields.io/badge/MELSU-Portal-blue?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**Современная система управления заявками и документооборота для образовательного учреждения**

[🚀 Демо](http://your-demo-link.com) • [📖 Документация](https://github.com/sanumxxx/melsu_portal/wiki) • [🐛 Сообщить об ошибке](https://github.com/sanumxxx/melsu_portal/issues)

</div>

---

## ✨ Возможности

### 🎯 Система заявок
- **Создание и управление заявками** - интуитивный интерфейс для подачи различных типов заявок
- **Автоматическая маршрутизация** - умное распределение заявок между ответственными
- **Отслеживание статусов** - полная прозрачность процесса обработки
- **Комментарии и файлы** - возможность добавления дополнительной информации

### 👤 Управление пользователями
- **Многоуровневая система ролей** - студенты, преподаватели, администрация
- **Профили пользователей** - полная информация о участниках системы
- **Группы и подразделения** - структурированная организация

### 📊 Аналитика и отчетность
- **Детальная статистика** - анализ эффективности работы
- **Журнал активности** - полный аудит всех действий в системе
- **Экспорт данных** - возможность выгрузки отчетов

### 🔔 Уведомления
- **Real-time обновления** - мгновенные уведомления через WebSocket
- **Email рассылки** - автоматические уведомления о важных событиях
- **Настраиваемые алерты** - персонализация уведомлений

---

## 🏗️ Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React SPA     │    │   FastAPI       │    │   PostgreSQL    │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │     Redis       │
                    │   (Sessions)    │
                    └─────────────────┘
```

### 🛠️ Технологический стек

**Frontend:**
- ⚛️ React 18 + Hooks
- 🎨 Tailwind CSS
- 📡 Axios для HTTP запросов
- 🔌 WebSocket для real-time обновлений

**Backend:**
- 🚀 FastAPI (Python)
- 🗄️ SQLAlchemy ORM
- 🔐 JWT аутентификация
- 📧 Email интеграция
- 🔄 Celery для фоновых задач

**База данных:**
- 🐘 PostgreSQL
- 🔴 Redis (кэш и сессии)

**DevOps:**
- 🐳 Docker & Docker Compose
- 🌐 Nginx (reverse proxy)
- 🔄 GitHub Actions (CI/CD)

---

## 🚀 Быстрый старт

### Предварительные требования

- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Redis

### 🐳 Docker (Рекомендуется)

```bash
# Клонирование репозитория
git clone https://github.com/sanumxxx/melsu_portal.git
cd melsu_portal

# Запуск всех сервисов
docker-compose up -d

# Приложение доступно по адресу http://localhost
```

### 💻 Локальная разработка

<details>
<summary>Развернуть инструкции</summary>

#### Backend

```bash
cd backend

# Создание виртуального окружения
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows

# Установка зависимостей
pip install -r requirements.txt

# Настройка переменных окружения
cp .env.example .env
# Отредактируйте .env файл

# Миграции базы данных
alembic upgrade head

# Инициализация системных ролей
python scripts/init_system_roles.py

# Запуск сервера
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend

# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка для продакшена
npm run build
```

</details>

---

## 📁 Структура проекта

```
melsu_portal/
├── 📁 backend/                 # Backend приложение
│   ├── 📁 app/                 
│   │   ├── 📁 api/             # API эндпоинты
│   │   ├── 📁 models/          # SQLAlchemy модели
│   │   ├── 📁 schemas/         # Pydantic схемы
│   │   ├── 📁 services/        # Бизнес логика
│   │   └── 📁 middleware/      # Middleware компоненты
│   ├── 📁 alembic/             # Миграции БД
│   └── 📄 requirements.txt     # Python зависимости
├── 📁 frontend/                # Frontend приложение
│   ├── 📁 src/
│   │   ├── 📁 components/      # React компоненты
│   │   ├── 📁 services/        # API сервисы
│   │   └── 📁 utils/           # Утилиты
│   └── 📄 package.json         # Node.js зависимости
├── 📄 docker-compose.yml       # Docker конфигурация
└── 📄 README.md               # Документация
```

---

## 🔧 Конфигурация

### Переменные окружения

```env
# База данных
DATABASE_URL=postgresql://user:password@localhost/melsu_db

# Аутентификация
SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Redis
REDIS_URL=redis://localhost:6379

# Режим отладки
DEBUG=false
```

---

## 📝 API Документация

После запуска backend сервера документация API доступна по адресу:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Основные эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| `POST` | `/api/auth/login` | Авторизация пользователя |
| `GET` | `/api/requests` | Список заявок |
| `POST` | `/api/requests` | Создание новой заявки |
| `GET` | `/api/users/profile` | Профиль пользователя |
| `GET` | `/api/admin/analytics` | Аналитика (только админы) |

---

## 🚀 Развертывание

### На VPS сервере

```bash
# Клонирование и настройка
git clone https://github.com/sanumxxx/melsu_portal.git
cd melsu_portal

# Запуск скрипта автоустановки
chmod +x deploy.sh
./deploy.sh
```

### С использованием GitHub Actions

Репозиторий настроен для автоматического деплоя при push в `main` ветку.

---

## 🤝 Участие в разработке

Мы приветствуем вклад в развитие проекта! 

### Как внести свой вклад:

1. 🍴 Сделайте Fork репозитория
2. 🌿 Создайте feature ветку (`git checkout -b feature/amazing-feature`)
3. 💻 Внесите изменения
4. ✅ Добавьте тесты для новой функциональности
5. 📝 Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
6. 📤 Отправьте в ветку (`git push origin feature/amazing-feature`)
7. 🔄 Создайте Pull Request

### Правила разработки:

- Следуйте стилю кода проекта
- Добавляйте тесты для нового функционала
- Обновляйте документацию при необходимости
- Используйте осмысленные commit сообщения

---

## 📄 Лицензия

Этот проект лицензирован под лицензией MIT - см. файл [LICENSE](LICENSE) для деталей.

---

## 👨‍💻 Автор

**Sasha Honcharov**
- GitHub: [@sanumxxx](https://github.com/sanumxxx)
- Email: sanumxxx@yandex.ru

---

## 🙏 Благодарности

- Команда FastAPI за отличный фреймворк
- Сообщество React за мощные инструменты
- Всем контрибьюторам проекта

---

<div align="center">

**Если проект оказался полезным, поставьте ⭐ звезду!**

Made with ❤️ for education

</div> 