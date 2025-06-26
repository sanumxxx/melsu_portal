-- Создание таблиц портфолио для системы МелГУ

-- Создаем enum для категорий достижений
CREATE TYPE achievementcategory AS ENUM (
    'academic', 
    'sports', 
    'creative', 
    'volunteer', 
    'professional'
);

-- Создаем таблицу достижений портфолио
CREATE TABLE portfolio_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    description TEXT,
    category achievementcategory NOT NULL,
    achievement_date TIMESTAMP WITH TIME ZONE NOT NULL,
    organization VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Создаем индексы для таблицы достижений
CREATE INDEX ix_portfolio_achievements_id ON portfolio_achievements(id);
CREATE INDEX ix_portfolio_achievements_user_id ON portfolio_achievements(user_id);

-- Создаем таблицу файлов портфолио
CREATE TABLE portfolio_files (
    id SERIAL PRIMARY KEY,
    achievement_id INTEGER NOT NULL REFERENCES portfolio_achievements(id) ON DELETE CASCADE,
    filename VARCHAR NOT NULL,
    original_filename VARCHAR NOT NULL,
    file_path VARCHAR NOT NULL,
    file_size INTEGER NOT NULL,
    content_type VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для таблицы файлов
CREATE INDEX ix_portfolio_files_id ON portfolio_files(id);
CREATE INDEX ix_portfolio_files_achievement_id ON portfolio_files(achievement_id);

-- Добавляем комментарии для документации
COMMENT ON TABLE portfolio_achievements IS 'Достижения студентов для портфолио';
COMMENT ON TABLE portfolio_files IS 'Файлы прикрепленные к достижениям (дипломы, сертификаты, фото)';
COMMENT ON TYPE achievementcategory IS 'Категории достижений: академические, спортивные, творческие, волонтерские, профессиональные'; 