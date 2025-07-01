-- Скрипт для очистки таблицы пользователей и связанных данных
-- ВНИМАНИЕ: Этот скрипт удалит ВСЕ пользовательские данные!

-- Отключаем проверки внешних ключей временно
SET session_replication_role = replica;

-- Очищаем таблицы в правильном порядке (сначала зависимые, потом основные)

-- 1. Очищаем логи активности
DELETE FROM activity_logs WHERE user_id IS NOT NULL;

-- 2. Очищаем верификации email
DELETE FROM email_verifications;

-- 3. Очищаем профили пользователей
DELETE FROM user_profiles;

-- 4. Очищаем назначения пользователей
DELETE FROM user_assignments;

-- 5. Очищаем запросы пользователей  
DELETE FROM requests;

-- 6. Очищаем отчеты пользователей
DELETE FROM reports;

-- 7. Очищаем доступы студентов
DELETE FROM student_access;

-- 8. Очищаем уведомления
DELETE FROM notifications;

-- 9. Наконец очищаем таблицу пользователей
DELETE FROM users;

-- Сбрасываем счетчики автоинкремента
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE user_profiles_id_seq RESTART WITH 1;
ALTER SEQUENCE email_verifications_id_seq RESTART WITH 1;
ALTER SEQUENCE activity_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE user_assignments_id_seq RESTART WITH 1;
ALTER SEQUENCE requests_id_seq RESTART WITH 1;
ALTER SEQUENCE reports_id_seq RESTART WITH 1;
ALTER SEQUENCE student_access_id_seq RESTART WITH 1;
ALTER SEQUENCE notifications_id_seq RESTART WITH 1;

-- Включаем обратно проверки внешних ключей
SET session_replication_role = DEFAULT;

-- Показываем результат
SELECT 'Таблица пользователей очищена!' as result;
SELECT COUNT(*) as remaining_users FROM users; 