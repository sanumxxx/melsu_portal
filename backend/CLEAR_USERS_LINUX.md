# Очистка пользователей МелГУ в Linux

## Вариант 1: Одна команда (скопируйте и вставьте в терминал)

```bash
PGPASSWORD="MelsuPortal2024!" psql -h localhost -U melsu_user -d melsu_db -c "SET session_replication_role = replica; DELETE FROM activity_logs WHERE user_id IS NOT NULL; DELETE FROM email_verifications; DELETE FROM user_profiles; DELETE FROM user_assignments; DELETE FROM requests; DELETE FROM reports; DELETE FROM student_access; DELETE FROM notifications; DELETE FROM users; ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1; ALTER SEQUENCE IF EXISTS user_profiles_id_seq RESTART WITH 1; ALTER SEQUENCE IF EXISTS email_verifications_id_seq RESTART WITH 1; SET session_replication_role = DEFAULT; SELECT 'Пользователи очищены!' as result, COUNT(*) as users_count FROM users;"
```

## Вариант 2: Через скрипт

```bash
# Перейти в папку с проектом
cd /path/to/melsu/backend

# Сделать скрипт исполняемым и запустить
chmod +x clear_users.sh && bash clear_users.sh
```

## Вариант 3: Только очистить таблицу users (быстро)

```bash
PGPASSWORD="MelsuPortal2024!" psql -h localhost -U melsu_user -d melsu_db -c "DELETE FROM users; ALTER SEQUENCE users_id_seq RESTART WITH 1; SELECT COUNT(*) as remaining_users FROM users;"
```

## Результат

После выполнения любого варианта:
- ✅ Все пользователи удалены
- ✅ ID счетчики сброшены  
- ✅ Связанные данные очищены
- 🔄 Можно регистрировать новых пользователей

## Проверка результата

```bash
PGPASSWORD="MelsuPortal2024!" psql -h localhost -U melsu_user -d melsu_db -c "SELECT COUNT(*) as users_count FROM users;"
```

Должно показать: `users_count = 0` 