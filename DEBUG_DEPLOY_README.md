# 🐛 Отладка и развертывание MELSU Portal

## 🚀 Быстрое развертывание

### На Linux сервере:

1. **Сделайте скрипты исполняемыми:**
   ```bash
   chmod +x deploy_debug.sh quick_deploy.sh
   ```

2. **Быстрое обновление (без пересборки):**
   ```bash
   ./quick_deploy.sh
   ```

3. **Полное развертывание с дебагом:**
   ```bash
   ./deploy_debug.sh
   ```

## 🐛 Отладка проблемы с отображением студентов

### Проблема
Не отображается информация о группе, факультете и кафедре в списке студентов.

### Добавленное логирование

#### Backend API (`/api/student-access/my-students`)
- ✅ Логирование каждого запроса к API
- ✅ Детальная информация о каждом студенте
- ✅ Проверка наличия faculty_id, department_id, group_id
- ✅ Результаты поиска факультетов и кафедр в базе данных
- ✅ Итоговые данные для каждого студента

#### Frontend (StudentList.jsx)
- ✅ Логирование ответа API
- ✅ Детальный лог первого студента
- ✅ Логирование функции getDepartmentName

### Где смотреть логи

#### Backend логи:
```bash
# Общие логи приложения
docker-compose logs -f backend

# Логи в файлах (если настроена система логирования)
tail -f backend/logs/melsu_portal.log
tail -f backend/logs/api_debug.log
tail -f backend/logs/sql_debug.log
```

#### Frontend логи:
```bash
# Логи фронтенда
docker-compose logs -f frontend

# Открыть браузер и посмотреть в Developer Tools > Console
```

## 🔍 Проверочные команды

### Проверка базы данных
```bash
# Подключение к контейнеру БД
docker-compose exec db psql -U melsu_user -d melsu_portal

# Проверка данных студентов
SELECT 
    u.id, u.first_name, u.last_name,
    up.faculty_id, up.department_id, up.group_id,
    f.name as faculty_name,
    d.name as department_name,
    g.name as group_name
FROM users u 
LEFT JOIN user_profiles up ON u.id = up.user_id 
LEFT JOIN departments f ON up.faculty_id = f.id 
LEFT JOIN departments d ON up.department_id = d.id 
LEFT JOIN groups g ON up.group_id = g.id 
WHERE u.roles::text LIKE '%student%' 
LIMIT 5;
```

### Проверка API
```bash
# Тест API (замените YOUR_TOKEN на реальный токен)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:8000/api/student-access/my-students?page=1&size=5" | jq

# Проверка состояния сервисов
curl http://localhost:8000/health
```

## 📋 Ожидаемые результаты логирования

### Backend логи должны показывать:
```
INFO - Получение списка студентов для пользователя 123
INFO - Найдено 15 студентов
INFO - Загружено 5 студентов для страницы 1
INFO - Обработка студента 1: Иван Иванов
INFO - Студент 1 имеет профиль: faculty_id=2, department_id=5, group_id=10
INFO - Найден факультет для студента 1: Факультет информатики
INFO - Найдена кафедра для студента 1: Кафедра ПМиИ
INFO - Найдена группа для студента 1: 2211-0101.1
INFO - Итоговые данные студента 1: faculty=Факультет информатики, department=Кафедра ПМиИ, group=2211-0101.1
```

### Frontend логи должны показывать:
```javascript
// В Developer Tools > Console
API Response: {students: [{...}], total: 15, ...}
Students data: [{id: 1, faculty: "Факультет информатики", ...}]
Первый студент: {
  id: 1,
  name: "Иван Иванов",
  faculty: "Факультет информатики",
  faculty_info: {id: 2, name: "Факультет информатики", ...},
  department: "Кафедра ПМиИ",
  department_info: {id: 5, name: "Кафедра ПМиИ", ...},
  group_number: "2211-0101.1",
  group_info: {id: 10, name: "2211-0101.1", ...}
}
```

## 🛠️ Возможные проблемы и решения

### 1. Данные не приходят с сервера
- Проверить логи backend
- Убедиться, что база данных содержит корректные данные
- Проверить связи между таблицами

### 2. Данные приходят, но не отображаются
- Проверить логи frontend в браузере
- Убедиться, что функция getDepartmentName получает правильные данные
- Проверить структуру объекта студента

### 3. Ошибки в логах backend
- Проверить соединение с базой данных
- Убедиться, что все миграции применены
- Проверить правильность joinedload операций

## 🔧 Команды для отладки

```bash
# Перезапуск с полной пересборкой
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Просмотр логов в реальном времени
docker-compose logs -f

# Проверка состояния контейнеров
docker-compose ps

# Подключение к контейнеру для отладки
docker-compose exec backend bash
docker-compose exec db psql -U melsu_user -d melsu_portal

# Очистка и перезапуск
docker-compose down -v  # ВНИМАНИЕ: удалит данные!
docker-compose up -d
```

## 📞 Поддержка

После развертывания с помощью `./deploy_debug.sh`:
1. Откройте https://my.melsu.ru/students/list
2. Откройте Developer Tools (F12) > Console
3. Проверьте логи в консоли браузера
4. Проверьте логи backend: `docker-compose logs -f backend`
5. Отправьте релевантные логи для дальнейшей диагностики 