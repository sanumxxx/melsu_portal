# backend/init_db.py

from app.database import engine
from app.models import (
    user, user_profile, department, role, field, request_template,
    request, student_access, group
    # добавьте сюда все ваши модули с моделями!
)

def main():
    print("Создание всех таблиц в базе данных...")
    # Импортируйте Base из любого файла, где он определён (например, app/database.py)
    from app.database import Base
    Base.metadata.create_all(bind=engine)
    print("Готово!")

if __name__ == "__main__":
    main()