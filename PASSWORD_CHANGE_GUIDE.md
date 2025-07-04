# Руководство по смене пароля

## Описание функции
В систему добавлена возможность смены пароля пользователя через профиль.

## Местоположение
Функция доступна в разделе **Профиль** → **Безопасность** → кнопка **Изменить**.

## Как пользоваться

1. Войдите в свой профиль
2. Найдите раздел "Безопасность"
3. Нажмите кнопку "Изменить" рядом с полем пароля
4. В открывшемся окне введите:
   - Текущий пароль
   - Новый пароль (минимум 6 символов)
   - Подтверждение нового пароля
5. Нажмите "Изменить пароль"

## Требования к новому паролю
- Минимум 6 символов
- Должен отличаться от текущего пароля
- Поля "новый пароль" и "подтверждение" должны совпадать

## Безопасность
- Для смены пароля требуется знание текущего пароля
- Новый пароль хешируется с использованием bcrypt
- Валидация происходит как на клиенте, так и на сервере

## API Endpoint
```
POST /api/profile/change-password
{
  "current_password": "string",
  "new_password": "string", 
  "confirm_password": "string"
}
```

## Возможные ошибки
- **400**: Неверный текущий пароль
- **400**: Новый пароль должен отличаться от текущего
- **422**: Ошибки валидации (короткий пароль, несовпадение паролей)

## Файлы изменены
- `backend/app/api/profile.py` - добавлен endpoint смены пароля
- `frontend/src/components/ChangePassword.jsx` - новый компонент
- `frontend/src/components/Profile.jsx` - добавлена секция безопасности 