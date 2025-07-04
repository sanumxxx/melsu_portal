-- 🚀 MELSU Portal - Прямое исправление структуры БД
-- Автор: Sasha Honcharov (sanumxxx@yandex.ru)

-- Удаляем проблемную историю миграций
DELETE FROM alembic_version;

-- Проверяем и добавляем поля faculty_id и department_id если их нет
DO $$
BEGIN
    -- Добавляем faculty_id если не существует
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'faculty_id'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN faculty_id INTEGER;
        ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_faculty 
            FOREIGN KEY (faculty_id) REFERENCES departments (id);
        RAISE NOTICE 'Поле faculty_id добавлено';
    ELSE
        RAISE NOTICE 'Поле faculty_id уже существует';
    END IF;

    -- Добавляем department_id если не существует
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'department_id'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN department_id INTEGER;
        ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_department 
            FOREIGN KEY (department_id) REFERENCES departments (id);
        RAISE NOTICE 'Поле department_id добавлено';
    ELSE
        RAISE NOTICE 'Поле department_id уже существует';
    END IF;
END $$;

-- Устанавливаем последнюю корректную ревизию
-- Выбираем ревизию в зависимости от того, какие поля есть в БД
DO $$
DECLARE
    target_revision TEXT;
BEGIN
    -- Если есть новые поля, используем новую ревизию
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'faculty_id'
    ) THEN
        target_revision := 'd34404f8ec53';  -- add_faculty_and_department_id_fields
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'telegram_id'
    ) THEN
        target_revision := 'a7843b1b03ca';  -- add_social_media_fields
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'vk_id'
    ) THEN
        target_revision := '59acfe778956';  -- add_oauth_fields_to_user_profile
    ELSE
        target_revision := '07e3806a12df';  -- initial_migration_with_masks_and_media
    END IF;
    
    INSERT INTO alembic_version (version_num) VALUES (target_revision);
    RAISE NOTICE 'Установлена ревизия: %', target_revision;
END $$;

-- Проверяем финальное состояние
SELECT 'Текущая ревизия: ' || version_num FROM alembic_version;

-- Проверяем наличие ключевых полей
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'faculty_id')
        THEN '✅ faculty_id существует'
        ELSE '❌ faculty_id отсутствует'
    END as faculty_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'department_id')
        THEN '✅ department_id существует'
        ELSE '❌ department_id отсутствует'
    END as department_status; 