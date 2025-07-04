from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any
import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta
import secrets

from ..database import get_db
from ..models.user import User
from ..models.user_profile import UserProfile
from ..core.config import settings
from ..services.auth_service import verify_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()

# Временное хранилище кодов подключения (в продакшн лучше использовать Redis)
connection_codes = {}

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> int:
    """Получение ID текущего пользователя"""
    token = credentials.credentials
    email = verify_token(token)
    if email is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user.id

@router.post("/telegram/generate-link")
async def generate_telegram_link(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Генерация ссылки для подключения Telegram"""
    
    # Генерируем уникальный код
    connection_code = secrets.token_urlsafe(16)
    
    # Сохраняем код с привязкой к пользователю (время жизни 10 минут)
    expiry_time = datetime.utcnow() + timedelta(minutes=10)
    connection_codes[connection_code] = {
        "user_id": current_user_id,
        "expires_at": expiry_time
    }
    
    # Получаем имя бота - нужно будет заменить на реальное имя вашего бота
    bot_username = "my_melsu_ru_auth_bot"  # Замените на реальное имя вашего бота
    
    # Формируем ссылку
    telegram_link = f"https://t.me/{bot_username}?start={connection_code}"
    
    return {
        "telegram_link": telegram_link,
        "code": connection_code,
        "expires_in": 600  # 10 минут в секундах
    }

@router.post("/telegram/webhook")
async def telegram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Webhook для получения обновлений от Telegram"""
    
    try:
        # Получаем данные от Telegram
        data = await request.json()
        logger.info(f"Received Telegram webhook: {data}")
        
        # Обрабатываем сообщение в фоне
        background_tasks.add_task(process_telegram_message, data, db)
        
        return {"ok": True}
        
    except Exception as e:
        logger.error(f"Error processing Telegram webhook: {e}")
        return {"ok": False, "error": str(e)}

async def process_telegram_message(data: Dict[Any, Any], db: Session):
    """Обработка сообщения от Telegram"""
    
    try:
        if "message" not in data:
            return
            
        message = data["message"]
        
        # Проверяем, что это команда /start
        if "text" not in message or not message["text"].startswith("/start"):
            return
            
        # Извлекаем пользователя Telegram
        telegram_user = message["from"]
        telegram_id = str(telegram_user["id"])
        telegram_username = telegram_user.get("username", "")
        first_name = telegram_user.get("first_name", "")
        last_name = telegram_user.get("last_name", "")
        
        # Извлекаем код подключения из команды /start
        text_parts = message["text"].split(" ")
        if len(text_parts) < 2:
            await send_telegram_message(
                telegram_id,
                "❌ Некорректная ссылка. Пожалуйста, используйте ссылку из личного кабинета на сайте МелГУ."
            )
            return
            
        connection_code = text_parts[1]
        
        # Проверяем код подключения
        if connection_code not in connection_codes:
            await send_telegram_message(
                telegram_id,
                "❌ Код подключения не найден или истек. Пожалуйста, сгенерируйте новую ссылку в личном кабинете."
            )
            return
            
        code_data = connection_codes[connection_code]
        
        # Проверяем срок действия кода
        if datetime.utcnow() > code_data["expires_at"]:
            del connection_codes[connection_code]
            await send_telegram_message(
                telegram_id,
                "❌ Код подключения истек. Пожалуйста, сгенерируйте новую ссылку в личном кабинете."
            )
            return
            
        user_id = code_data["user_id"]
        
        # Получаем профиль пользователя
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        if not profile:
            # Создаем профиль если его нет
            profile = UserProfile(user_id=user_id)
            db.add(profile)
        
        # Проверяем, не подключен ли уже этот Telegram к другому пользователю
        existing_profile = db.query(UserProfile).filter(
            UserProfile.telegram_id == telegram_id,
            UserProfile.user_id != user_id
        ).first()
        
        if existing_profile:
            await send_telegram_message(
                telegram_id,
                "❌ Этот Telegram-аккаунт уже привязан к другому пользователю."
            )
            return
        
        # Сохраняем данные Telegram в профиль
        profile.telegram_id = telegram_id
        profile.telegram_username = telegram_username
        profile.telegram_user_info = {
            "id": telegram_user["id"],
            "username": telegram_username,
            "first_name": first_name,
            "last_name": last_name,
            "connected_at": datetime.utcnow().isoformat()
        }
        
        db.commit()
        
        # Удаляем использованный код
        del connection_codes[connection_code]
        
        # Получаем имя пользователя для персонализации сообщения
        user = db.query(User).filter(User.id == user_id).first()
        user_name = f"{user.first_name} {user.last_name}" if user else "Пользователь"
        
        # Отправляем подтверждение
        await send_telegram_message(
            telegram_id,
            f"✅ Отлично! Ваш Telegram успешно привязан к аккаунту {user_name} в системе МелГУ.\n\n"
            f"Теперь вы будете получать уведомления о новых заданиях, сообщениях и другой важной информации."
        )
        
        logger.info(f"Successfully connected Telegram {telegram_id} to user {user_id}")
        
    except Exception as e:
        logger.error(f"Error processing Telegram message: {e}")

async def send_telegram_message(chat_id: str, text: str):
    """Отправка сообщения в Telegram"""
    import aiohttp
    
    try:
        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        data = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=data) as response:
                if response.status == 200:
                    logger.info(f"Message sent to {chat_id}")
                else:
                    logger.error(f"Failed to send message to {chat_id}: {response.status}")
                    
    except Exception as e:
        logger.error(f"Error sending Telegram message: {e}")

@router.get("/telegram/status")
async def get_telegram_status(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Получение статуса подключения Telegram"""
    
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user_id).first()
    
    if not profile or not profile.telegram_id:
        return {
            "connected": False,
            "telegram_id": None,
            "telegram_username": None
        }
    
    return {
        "connected": True,
        "telegram_id": profile.telegram_id,
        "telegram_username": profile.telegram_username,
        "connected_at": profile.telegram_user_info.get("connected_at") if profile.telegram_user_info else None
    }

@router.delete("/telegram/disconnect")
async def disconnect_telegram(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Отключение Telegram от профиля"""
    
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user_id).first()
    
    if not profile or not profile.telegram_id:
        raise HTTPException(status_code=404, detail="Telegram не подключен")
    
    # Очищаем данные Telegram
    telegram_id = profile.telegram_id
    profile.telegram_id = None
    profile.telegram_username = None
    profile.telegram_user_info = None
    
    db.commit()
    
    # Отправляем уведомление об отключении
    try:
        await send_telegram_message(
            telegram_id,
            "ℹ️ Ваш Telegram-аккаунт был отключен от системы МелГУ."
        )
    except:
        pass  # Игнорируем ошибки отправки сообщения при отключении
    
    return {"message": "Telegram успешно отключен"} 