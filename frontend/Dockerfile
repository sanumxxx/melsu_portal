# Этап сборки
FROM node:18-alpine AS build

WORKDIR /app

# Копирование package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm ci --only=production

# Копирование исходного кода
COPY . .

# Создание продакшн сборки
RUN npm run build

# Этап продакшн
FROM nginx:alpine

# Копирование сборки в nginx
COPY --from=build /app/build /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose порт
EXPOSE 80

# Команда запуска
CMD ["nginx", "-g", "daemon off;"] 