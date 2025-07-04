from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
import httpx
import hashlib
import hmac
import time
from datetime import datetime, timedelta
import os
import json

from ..database import get_db
from ..models.user_profile import UserProfile
from ..models.user import User
from ..schemas.user_profile import VKOAuthData, TelegramOAuthData, SocialConnectionStatus
from ..dependencies import get_current_user
from ..core.config import settings

router = APIRouter(prefix="/api/oauth", tags=["oauth"])

# Настройки VK OAuth из переменных окружения
VK_CLIENT_ID = settings.VK_CLIENT_ID
VK_CLIENT_SECRET = settings.VK_CLIENT_SECRET
VK_SERVICE_KEY = settings.VK_SERVICE_KEY

# Настройки Telegram OAuth из переменных окружения
TELEGRAM_BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN



@router.post("/vk/connect")
async def connect_vk_account(
    oauth_data: VKOAuthData,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Подключить VK аккаунт через VK ID SDK"""
    try:
        print(f"🔍 VK OAuth: Получен запрос от пользователя {current_user.id}")
        print(f"🔍 VK OAuth: Данные - user_id: {oauth_data.user_id}, expires_in: {oauth_data.expires_in}")
        
        access_token = oauth_data.access_token
        user_id = oauth_data.user_id
        expires_in = oauth_data.expires_in or 3600
        
        if not access_token or not user_id:
            raise HTTPException(
                status_code=400,
                detail="Отсутствуют необходимые данные от VK"
            )
        
        # Получаем информацию о пользователе
        async with httpx.AsyncClient() as client:
            user_info_response = await client.get(
                "https://api.vk.com/method/users.get",
                params={
                    "access_token": access_token,
                    "fields": "photo_200,email",
                    "v": "5.131"
                }
            )
            
            if user_info_response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail="Ошибка получения информации о пользователе VK"
                )
                
            user_info = user_info_response.json()
            
            if "error" in user_info:
                raise HTTPException(
                    status_code=400,
                    detail=f"Ошибка VK API: {user_info['error']['error_msg']}"
                )
            
            vk_user_data = user_info["response"][0]
            print(f"🔍 VK OAuth: Получены данные пользователя VK: {vk_user_data}")
            
            # Проверяем, не привязан ли уже этот VK аккаунт к другому пользователю
            print(f"🔍 VK OAuth: Проверяем существующий профиль для VK ID: {user_id}")
            existing_profile = db.query(UserProfile).filter(
                UserProfile.vk_id == str(user_id),
                UserProfile.user_id != current_user.id
            ).first()
            
            if existing_profile:
                raise HTTPException(
                    status_code=400,
                    detail="Этот VK аккаунт уже привязан к другому пользователю"
                )
            
            # Получаем или создаем профиль текущего пользователя
            print(f"🔍 VK OAuth: Ищем профиль для пользователя {current_user.id}")
            profile = db.query(UserProfile).filter(
                UserProfile.user_id == current_user.id
            ).first()
            
            if not profile:
                print(f"🔍 VK OAuth: Создаем новый профиль для пользователя {current_user.id}")
                profile = UserProfile(user_id=current_user.id)
                db.add(profile)
            else:
                print(f"🔍 VK OAuth: Найден существующий профиль с ID {profile.id}")
            
            # Обновляем OAuth данные
            print(f"🔍 VK OAuth: Обновляем OAuth данные")
            profile.vk_id = str(user_id)
            profile.vk_oauth_token = access_token
            profile.vk_oauth_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            profile.vk_user_info = vk_user_data
            
            print(f"🔍 VK OAuth: Сохраняем в базу данных")
            db.commit()
            print(f"🔍 VK OAuth: Успешно сохранено")
            
            return {
                "message": "VK аккаунт успешно подключен",
                "vk_user_info": vk_user_data
            }
            
    except httpx.RequestError as e:
        print(f"❌ VK OAuth: Ошибка сетевого запроса: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка сетевого запроса: {str(e)}"
        )
    except Exception as e:
        print(f"❌ VK OAuth: Внутренняя ошибка сервера: {str(e)}")
        print(f"❌ VK OAuth: Тип ошибки: {type(e)}")
        import traceback
        print(f"❌ VK OAuth: Трассировка: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )

@router.post("/telegram/connect")
async def connect_telegram_account(
    oauth_data: TelegramOAuthData,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Подключить Telegram аккаунт через OAuth"""
    try:
        # Проверяем подлинность данных от Telegram
        if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "your_telegram_bot_token":
            raise HTTPException(
                status_code=500,
                detail="Telegram бот не настроен. Установите TELEGRAM_BOT_TOKEN в переменных окружения."
            )
        
        # Проверяем актуальность данных (не старше 1 часа)
        if time.time() - oauth_data.auth_date > 3600:
            raise HTTPException(
                status_code=400,
                detail="Данные авторизации устарели"
            )
        
        # Создаем строку для проверки подписи
        auth_data = {
            "id": oauth_data.id,
            "first_name": oauth_data.first_name,
            "auth_date": oauth_data.auth_date
        }
        
        if oauth_data.last_name:
            auth_data["last_name"] = oauth_data.last_name
        if oauth_data.username:
            auth_data["username"] = oauth_data.username
        if oauth_data.photo_url:
            auth_data["photo_url"] = oauth_data.photo_url
        
        # Сортируем по ключам и создаем строку для проверки
        data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(auth_data.items())])
        
        # Создаем секретный ключ
        secret_key = hashlib.sha256(TELEGRAM_BOT_TOKEN.encode()).digest()
        
        # Проверяем подпись
        expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        
        if expected_hash != oauth_data.hash:
            raise HTTPException(
                status_code=400,
                detail="Недействительная подпись данных"
            )
        
        # Проверяем, не привязан ли уже этот Telegram аккаунт к другому пользователю
        existing_profile = db.query(UserProfile).filter(
            UserProfile.telegram_id == str(oauth_data.id),
            UserProfile.user_id != current_user.id
        ).first()
        
        if existing_profile:
            raise HTTPException(
                status_code=400,
                detail="Этот Telegram аккаунт уже привязан к другому пользователю"
            )
        
        # Получаем или создаем профиль текущего пользователя
        profile = db.query(UserProfile).filter(
            UserProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            profile = UserProfile(user_id=current_user.id)
            db.add(profile)
        
        # Обновляем Telegram данные
        profile.telegram_id = str(oauth_data.id)
        profile.telegram_username = oauth_data.username
        profile.telegram_user_info = auth_data
        
        db.commit()
        
        return {
            "message": "Telegram аккаунт успешно подключен",
            "telegram_user_info": auth_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )

@router.delete("/vk/disconnect")
async def disconnect_vk_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Отключить VK аккаунт"""
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()
    
    if not profile or not profile.vk_id:
        raise HTTPException(
            status_code=404,
            detail="VK аккаунт не подключен"
        )
    
    # Очищаем VK данные
    profile.vk_id = None
    profile.vk_oauth_token = None
    profile.vk_oauth_refresh_token = None
    profile.vk_oauth_expires_at = None
    profile.vk_user_info = None
    
    db.commit()
    
    return {"message": "VK аккаунт успешно отключен"}

@router.delete("/telegram/disconnect")
async def disconnect_telegram_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Отключить Telegram аккаунт"""
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()
    
    if not profile or not profile.telegram_id:
        raise HTTPException(
            status_code=404,
            detail="Telegram аккаунт не подключен"
        )
    
    # Очищаем Telegram данные
    profile.telegram_id = None
    profile.telegram_username = None
    profile.telegram_user_info = None
    
    db.commit()
    
    return {"message": "Telegram аккаунт успешно отключен"}

@router.get("/status", response_model=SocialConnectionStatus)
async def get_social_connection_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить статус подключения социальных сетей"""
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()
    
    return SocialConnectionStatus(
        vk_connected=bool(profile and profile.vk_id),
        telegram_connected=bool(profile and profile.telegram_id),
        vk_user_info=profile.vk_user_info if profile else None,
        telegram_user_info=profile.telegram_user_info if profile else None
    ) 