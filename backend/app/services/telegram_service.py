import aiohttp
import asyncio
import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from ..core.config import settings
from ..models.user_profile import UserProfile
from ..models.user import User

logger = logging.getLogger(__name__)

class TelegramService:
    """Сервис для работы с Telegram Bot API"""
    
    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"
    
    async def send_message(
        self, 
        chat_id: str, 
        text: str, 
        parse_mode: str = "HTML",
        disable_web_page_preview: bool = False
    ) -> bool:
        """Отправка сообщения в Telegram"""
        try:
            url = f"{self.base_url}/sendMessage"
            data = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": parse_mode,
                "disable_web_page_preview": disable_web_page_preview
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=data) as response:
                    if response.status == 200:
                        logger.info(f"Message sent to Telegram chat {chat_id}")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to send Telegram message to {chat_id}: {response.status} - {error_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error sending Telegram message to {chat_id}: {e}")
            return False
    
    async def send_notification_to_user(
        self,
        db: Session,
        user_id: int,
        title: str,
        message: str,
        url: Optional[str] = None
    ) -> bool:
        """Отправка уведомления конкретному пользователю"""
        try:
            # Получаем профиль пользователя с Telegram ID
            profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
            
            if not profile or not profile.telegram_id:
                logger.info(f"User {user_id} doesn't have Telegram connected")
                return False
            
            # Получаем имя пользователя
            user = db.query(User).filter(User.id == user_id).first()
            user_name = f"{user.first_name} {user.last_name}" if user else "Пользователь"
            
            # Формируем сообщение
            text = f"<b>{title}</b>\n\n{message}"
            
            if url:
                text += f"\n\n🔗 <a href='{url}'>Открыть в системе</a>"
            
            text += f"\n\n📧 Уведомление для: {user_name}"
            text += f"\n🏫 Система МелГУ"
            
            return await self.send_message(profile.telegram_id, text)
            
        except Exception as e:
            logger.error(f"Error sending notification to user {user_id}: {e}")
            return False
    
    async def send_bulk_notifications(
        self,
        db: Session,
        user_ids: List[int],
        title: str,
        message: str,
        url: Optional[str] = None
    ) -> Dict[str, int]:
        """Массовая отправка уведомлений"""
        results = {"sent": 0, "failed": 0, "no_telegram": 0}
        
        tasks = []
        for user_id in user_ids:
            task = self.send_notification_to_user(db, user_id, title, message, url)
            tasks.append(task)
        
        # Выполняем все задачи параллельно
        task_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in task_results:
            if isinstance(result, Exception):
                results["failed"] += 1
            elif result is True:
                results["sent"] += 1
            elif result is False:
                results["no_telegram"] += 1
            else:
                results["failed"] += 1
        
        logger.info(f"Bulk notification results: {results}")
        return results
    
    async def send_assignment_notification(
        self,
        db: Session,
        user_id: int,
        assignment_title: str,
        assignment_description: str,
        due_date: Optional[str] = None
    ) -> bool:
        """Уведомление о новом задании"""
        title = "📝 Новое задание"
        
        message = f"Вам назначено новое задание:\n\n<b>{assignment_title}</b>"
        
        if assignment_description:
            message += f"\n\n{assignment_description}"
        
        if due_date:
            message += f"\n\n⏰ Срок выполнения: {due_date}"
        
        url = f"https://my.melsu.ru/assignments"
        
        return await self.send_notification_to_user(db, user_id, title, message, url)
    
    async def send_request_notification(
        self,
        db: Session,
        user_id: int,
        request_title: str,
        request_status: str,
        request_id: int
    ) -> bool:
        """Уведомление об изменении статуса заявки"""
        title = "📋 Обновление заявки"
        
        status_messages = {
            "approved": "✅ Ваша заявка одобрена",
            "rejected": "❌ Ваша заявка отклонена", 
            "in_progress": "⏳ Ваша заявка в обработке",
            "completed": "✅ Ваша заявка выполнена"
        }
        
        status_text = status_messages.get(request_status, f"Статус изменен на: {request_status}")
        
        message = f"{status_text}\n\n<b>Заявка:</b> {request_title}"
        
        url = f"https://my.melsu.ru/requests/{request_id}"
        
        return await self.send_notification_to_user(db, user_id, title, message, url)
    
    async def send_announcement_notification(
        self,
        db: Session,
        user_ids: List[int],
        announcement_title: str,
        announcement_content: str
    ) -> Dict[str, int]:
        """Уведомление об объявлении"""
        title = "📢 Новое объявление"
        
        message = f"<b>{announcement_title}</b>\n\n{announcement_content}"
        
        url = f"https://my.melsu.ru/announcements"
        
        return await self.send_bulk_notifications(db, user_ids, title, message, url)
    
    async def set_webhook(self, webhook_url: str) -> bool:
        """Установка webhook для бота"""
        try:
            url = f"{self.base_url}/setWebhook"
            data = {"url": webhook_url}
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=data) as response:
                    if response.status == 200:
                        result = await response.json()
                        if result.get("ok"):
                            logger.info(f"Webhook set successfully: {webhook_url}")
                            return True
                        else:
                            logger.error(f"Failed to set webhook: {result}")
                            return False
                    else:
                        logger.error(f"Failed to set webhook: HTTP {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error setting webhook: {e}")
            return False
    
    async def get_bot_info(self) -> Optional[Dict[str, Any]]:
        """Получение информации о боте"""
        try:
            url = f"{self.base_url}/getMe"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        result = await response.json()
                        if result.get("ok"):
                            return result.get("result")
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting bot info: {e}")
            return None

# Создаем единственный экземпляр сервиса
telegram_service = TelegramService() 