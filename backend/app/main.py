import os
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла в корне проекта
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, HTTPException, Depends, status, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import traceback
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from .database import engine, Base
from .startup import startup_application, check_required_environment
from .api import auth, profile, dev, users, departments
from .dependencies import get_current_user, UserInfo
from .models.user import User as UserModel, UserRole
from .schemas.user import UserRoleUpdate
from sqlalchemy.orm import Session
from .database import get_db
from .middleware.activity_middleware import ActivityLoggingMiddleware

# WebSocket для уведомлений
from .api.websocket import websocket_endpoint

# Проверяем переменные окружения
check_required_environment()

# Инициализируем приложение (база данных, роли и т.д.)
startup_application()

app = FastAPI(
    title="MelSU Portal Backend",
    description="Portal API for my.melsu.ru",
    version="1.0.0"
)

# Добавляем middleware для логирования активности
app.add_middleware(ActivityLoggingMiddleware)

# Добавляем обработчик ошибок валидации для диагностики
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"❌ Ошибка валидации запроса к {request.url}:")
    print(f"   Метод: {request.method}")
    print(f"   Заголовки: {dict(request.headers)}")
    print(f"   Детали ошибки: {exc.errors()}")
    print(f"   Тело ошибки: {exc}")
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "url": str(request.url),
            "method": request.method
        }
    )

# Общий обработчик ошибок
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    print(f"❌ Общая ошибка в {request.url}:")
    print(f"   Тип ошибки: {type(exc).__name__}")
    print(f"   Сообщение: {str(exc)}")
    print(f"   Трассировка: {traceback.format_exc()}")
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"Внутренняя ошибка сервера: {str(exc)}",
            "type": type(exc).__name__
        }
    )

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3000",
        "http://10.128.7.101:3000",  # Локальная сеть
        "https://my.melsu.ru"  
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language", 
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers"
    ],
    expose_headers=["*"],
)

# Схемы Pydantic

class DashboardResponse(BaseModel):
    message: str
    user: UserInfo
    quick_links: List[Dict[str, str]]
    recent_activity: List[Dict[str, Any]]

class ScheduleItem(BaseModel):
    time: str
    subject: str
    room: str
    teacher: Optional[str] = None

class ScheduleResponse(BaseModel):
    user_email: str
    date: str
    schedule: List[ScheduleItem]

# Утилиты для работы с авторизацией

# Подключаем роуты
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(profile.router, prefix="/api", tags=["profile"])
app.include_router(dev.router, tags=["development"])  # DEV endpoints
app.include_router(users.router, tags=["users"])  # Users management endpoints
app.include_router(departments.router, tags=["departments"])  # Departments management endpoints

# Система шаблонов заявок
from .api import request_templates
app.include_router(request_templates.router, prefix="/api/request-templates", tags=["request-templates"])

# Система полей
from .api import fields
app.include_router(fields.router, prefix="/api/fields", tags=["fields"])

# Система заявок
from .api import requests
app.include_router(requests.router, prefix="/api/requests", tags=["requests"])

# Система ролей
from .api import roles
from .api import profile_fields
app.include_router(roles.router, prefix="/api/roles", tags=["roles"])
app.include_router(profile_fields.router, prefix="/api", tags=["profile-fields"])

# Система файлов
from .api import files
app.include_router(files.router, prefix="/api", tags=["files"])

# Система назначений
from .api import assignments
app.include_router(assignments.router, tags=["assignments"])

# Система портфолио
from .api import portfolio
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])

# Система доступа к студентам
from .api import student_access
app.include_router(student_access.router, prefix="/api", tags=["student-access"])

# Система доступа к группам
from .api import group_access
app.include_router(group_access.router, prefix="/api", tags=["group-access"])

# Система групп
from .api import groups
app.include_router(groups.router, prefix="/api", tags=["groups"])

# Система объявлений
from .api import announcements
app.include_router(announcements.router, prefix="/api", tags=["announcements"])

# Система кураторского доступа
from .api import curator_access
app.include_router(curator_access.router, prefix="/api", tags=["curator-access"])

# Система отчетов
from .api import report_templates, reports
app.include_router(report_templates.router, prefix="/api", tags=["report-templates"])
app.include_router(reports.router, prefix="/api", tags=["reports"])

# Журнал активности
from .api import activity_logs
app.include_router(activity_logs.router, prefix="/api/activity-logs", tags=["activity-logs"])

# Статическая раздача файлов
import os
uploads_dir = "uploads"
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# WebSocket для уведомлений
@app.websocket("/ws/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: int):
    """WebSocket endpoint для real-time уведомлений"""
    await websocket_endpoint(websocket, user_id)

@app.get("/")
async def root():
    return {"message": "University Portal API"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "portal-backend", "version": "1.0.0"}

# ===========================================
# ЗАЩИЩЕННЫЕ ЭНДПОИНТЫ С ПРОСТОЙ АВТОРИЗАЦИЕЙ
# ===========================================

@app.get("/profile", response_model=UserInfo)
async def get_profile(current_user: UserInfo = Depends(get_current_user)):
    """Получение профиля пользователя"""
    return current_user

@app.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(current_user: UserInfo = Depends(get_current_user)):
    """Получение данных для главной страницы"""
    
    return DashboardResponse(
        message=f"Добро пожаловать, {current_user.first_name} {current_user.last_name}!",
        user=current_user,
        quick_links=[
            {"name": "Расписание", "url": "/schedule"},
            {"name": "Оценки", "url": "/grades"},
            {"name": "Объявления", "url": "/announcements"}
        ],
        recent_activity=[
            {
                "type": "login",
                "message": "Вход в систему",
                "timestamp": datetime.now().isoformat()
            },
            {
                "type": "schedule",
                "message": "Просмотр расписания",
                "timestamp": datetime.now().isoformat()
            }
        ]
    )

@app.get("/schedule", response_model=ScheduleResponse)
async def get_schedule(current_user: UserInfo = Depends(get_current_user)):
    """Получение расписания пользователя"""
    
    # Заглушка данных расписания
    mock_schedule = [
        ScheduleItem(
            time="09:00-10:30",
            subject="Математика",
            room="ауд. 301",
            teacher="Иванов И.И."
        ),
        ScheduleItem(
            time="11:00-12:30",
            subject="Физика",
            room="ауд. 205",
            teacher="Петров П.П."
        ),
        ScheduleItem(
            time="13:30-15:00",
            subject="Программирование",
            room="ауд. 401",
            teacher="Сидоров С.С."
        )
    ]
    
    return ScheduleResponse(
        user_email=current_user.email,
        date=datetime.now().strftime("%Y-%m-%d"),
        schedule=mock_schedule
    )

@app.get("/grades")
async def get_grades(current_user: UserInfo = Depends(get_current_user)):
    """Получение оценок пользователя"""
    
    return {
        "user_email": current_user.email,
        "semester": "2024-2025 осенний",
        "subjects": [
            {
                "name": "Математика",
                "grades": [5, 4, 5, 4],
                "average": 4.5
            },
            {
                "name": "Физика", 
                "grades": [4, 5, 4, 5],
                "average": 4.5
            },
            {
                "name": "Программирование",
                "grades": [5, 5, 5, 5],
                "average": 5.0
            }
        ]
    }

@app.get("/announcements")
async def get_announcements(current_user: UserInfo = Depends(get_current_user)):
    """Получение объявлений"""
    
    return {
        "announcements": [
            {
                "id": 1,
                "title": "Изменение в расписании",
                "content": "Занятие по математике 25.06 переносится на 26.06",
                "date": "2025-06-22",
                "urgent": True
            },
            {
                "id": 2,
                "title": "Новые материалы в библиотеке",
                "content": "Добавлены новые учебники по программированию",
                "date": "2025-06-21",
                "urgent": False
            }
        ]
    }

# ===========================================
# АДМИНСКИЕ ЭНДПОИНТЫ 
# ===========================================

def has_admin_role(current_user: UserInfo) -> bool:
    """Проверка админских прав"""
    return "admin" in (current_user.roles if hasattr(current_user, 'roles') else [])

@app.post("/admin/make-admin/{user_id}")
async def make_user_admin(user_id: int, current_user: UserInfo = Depends(get_current_user), db: Session = Depends(get_db)):
    """Тестовый эндпоинт для назначения админа (временно без проверки прав)"""
    
    # Получаем пользователя
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Добавляем роль админа если её нет
    user_roles = user.roles or []
    if "admin" not in user_roles:
        user_roles.append("admin")
        user.roles = user_roles
        db.commit()
        db.refresh(user)
    
    return {"message": f"Пользователь {user.email} назначен администратором", "roles": user.roles}

@app.get("/admin/users")
async def get_all_users(current_user: UserInfo = Depends(get_current_user), db: Session = Depends(get_db)):
    """Получение всех пользователей (только для админа)"""
    
    # Проверяем админские права
    user_full = db.query(UserModel).filter(UserModel.email == current_user.email).first()
    if not user_full or "admin" not in (user_full.roles or []):
        raise HTTPException(status_code=403, detail="Доступ запрещен: требуются права администратора")
    
    users = db.query(UserModel).all()
    return {"users": users}

@app.get("/admin/users/by-role/{role}")
async def get_users_by_role(role: str, current_user: UserInfo = Depends(get_current_user), db: Session = Depends(get_db)):
    """Получение пользователей по роли"""
    
    # Проверяем админские права
    user_full = db.query(UserModel).filter(UserModel.email == current_user.email).first()
    if not user_full or "admin" not in (user_full.roles or []):
        raise HTTPException(status_code=403, detail="Доступ запрещен: требуются права администратора")
    
    # Валидируем роль
    valid_roles = [r.value for r in UserRole]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Недопустимая роль. Доступные роли: {valid_roles}")
    
    users = db.query(UserModel).all()
    filtered_users = [user for user in users if role in (user.roles or [])]
    
    return {"role": role, "users": filtered_users, "count": len(filtered_users)}

@app.put("/admin/users/{user_id}/roles")
async def update_user_roles(user_id: int, role_data: UserRoleUpdate, current_user: UserInfo = Depends(get_current_user), db: Session = Depends(get_db)):
    """Обновление ролей пользователя"""
    
    # Проверяем админские права
    user_full = db.query(UserModel).filter(UserModel.email == current_user.email).first()
    if not user_full or "admin" not in (user_full.roles or []):
        raise HTTPException(status_code=403, detail="Доступ запрещен: требуются права администратора")
    
    # Получаем пользователя для обновления
    target_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Валидируем роли
    valid_roles = [r.value for r in UserRole]
    for role in role_data.roles:
        if role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Недопустимая роль: {role}")
    
    # Обновляем роли
    target_user.roles = role_data.roles
    db.commit()
    db.refresh(target_user)
    
    return {"message": "Роли пользователя обновлены", "user": target_user}

@app.post("/api/users/{user_id}/roles")
async def manage_user_role(
    user_id: int, 
    role_data: dict,
    current_user: UserInfo = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Добавление или удаление роли пользователя"""
    
    # Проверяем админские права
    user_full = db.query(UserModel).filter(UserModel.email == current_user.email).first()
    if not user_full or "admin" not in (user_full.roles or []):
        raise HTTPException(status_code=403, detail="Доступ запрещен: требуются права администратора")
    
    # Получаем пользователя для обновления
    target_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    role = role_data.get("role")
    action = role_data.get("action", "add")  # add или remove
    
    if not role:
        raise HTTPException(status_code=400, detail="Не указана роль")
    
    # Валидируем роль
    valid_roles = [r.value for r in UserRole]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Недопустимая роль: {role}")
    
    # Получаем текущие роли
    current_roles = target_user.roles or []
    
    if action == "add":
        if role not in current_roles:
            current_roles.append(role)
            message = f"Роль '{role}' добавлена пользователю"
        else:
            message = f"Пользователь уже имеет роль '{role}'"
    elif action == "remove":
        if role in current_roles:
            current_roles.remove(role)
            message = f"Роль '{role}' удалена у пользователя"
        else:
            message = f"Пользователь не имеет роль '{role}'"
    else:
        raise HTTPException(status_code=400, detail="Недопустимое действие. Используйте 'add' или 'remove'")
    
    # Обновляем роли
    target_user.roles = current_roles
    db.commit()
    db.refresh(target_user)
    
    return {
        "message": message, 
        "user_id": user_id,
        "role": role,
        "action": action,
        "current_roles": current_roles
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 