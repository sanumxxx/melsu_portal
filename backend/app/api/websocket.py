from fastapi import WebSocket, WebSocketDisconnect, Depends
import json
import asyncio
from typing import Dict, List
from datetime import datetime
from ..dependencies import get_current_user
from ..models.user_profile import User

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"WebSocket connection established for user {user_id}")

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"WebSocket connection closed for user {user_id}")

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
                return True
            except Exception as e:
                print(f"Error sending message to user {user_id}: {e}")
                self.disconnect(user_id)
                return False
        return False

    async def notify_new_request(self, user_id: int, request_data: dict):
        """Отправка уведомления о новой заявке"""
        message = {
            "type": "new_request",
            "title": "Новая заявка",
            "message": f"У вас новая заявка: {request_data.get('title', 'Без названия')}",
            "request_id": request_data.get('id'),
            "priority": request_data.get('priority', 'medium'),
            "timestamp": datetime.now().isoformat(),
            "data": request_data
        }
        return await self.send_personal_message(message, user_id)

    async def notify_request_status_change(self, user_id: int, request_data: dict, old_status: str, new_status: str):
        """Уведомление об изменении статуса заявки"""
        status_texts = {
            'draft': 'Черновик',
            'submitted': 'Подана',
            'in_review': 'На рассмотрении',
            'approved': 'Одобрена',
            'rejected': 'Отклонена',
            'completed': 'Завершена'
        }
        
        message = {
            "type": "status_change",
            "title": "Изменение статуса заявки",
            "message": f"Заявка '{request_data.get('title', '')}' изменила статус: {status_texts.get(old_status, old_status)} → {status_texts.get(new_status, new_status)}",
            "request_id": request_data.get('id'),
            "old_status": old_status,
            "new_status": new_status,
            "timestamp": datetime.now().isoformat(),
            "data": request_data
        }
        return await self.send_personal_message(message, user_id)

    async def broadcast_to_admins(self, message: dict):
        """Отправка сообщения всем админам"""
        # Здесь можно добавить логику получения списка админов
        # Пока что заглушка
        pass

    def get_connected_users(self) -> List[int]:
        """Получить список подключенных пользователей"""
        return list(self.active_connections.keys())

# Глобальный экземпляр менеджера соединений
manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket, user_id: int):
    """WebSocket endpoint для пользователя"""
    await manager.connect(websocket, user_id)
    
    try:
        # Отправляем приветственное сообщение
        welcome_message = {
            "type": "connection_established",
            "message": "Подключение к уведомлениям установлено",
            "timestamp": datetime.now().isoformat()
        }
        await manager.send_personal_message(welcome_message, user_id)
        
        # Ожидаем сообщения от клиента (heartbeat, etc.)
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                
                # Обработка heartbeat и других сообщений от клиента
                try:
                    client_message = json.loads(data)
                    if client_message.get('type') == 'heartbeat':
                        # Отвечаем на heartbeat
                        response = {
                            "type": "heartbeat_response",
                            "timestamp": datetime.now().isoformat()
                        }
                        await manager.send_personal_message(response, user_id)
                except json.JSONDecodeError:
                    pass
                    
            except asyncio.TimeoutError:
                # Отправляем heartbeat проверку
                heartbeat = {
                    "type": "heartbeat_check",
                    "timestamp": datetime.now().isoformat()
                }
                success = await manager.send_personal_message(heartbeat, user_id)
                if not success:
                    break
                    
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error for user {user_id}: {e}")
    finally:
        manager.disconnect(user_id)

# Вспомогательные функции для интеграции с системой заявок
async def notify_request_assigned(request_id: int, assignee_id: int, request_data: dict):
    """Уведомление о назначении заявки"""
    await manager.notify_new_request(assignee_id, request_data)

async def notify_request_updated(request_id: int, affected_user_ids: List[int], request_data: dict, old_status: str = None, new_status: str = None):
    """Уведомление об обновлении заявки"""
    for user_id in affected_user_ids:
        if old_status and new_status and old_status != new_status:
            await manager.notify_request_status_change(user_id, request_data, old_status, new_status)
        else:
            # Обычное уведомление об обновлении
            message = {
                "type": "request_updated",
                "title": "Заявка обновлена",
                "message": f"Заявка '{request_data.get('title', '')}' была обновлена",
                "request_id": request_data.get('id'),
                "timestamp": datetime.now().isoformat(),
                "data": request_data
            }
            await manager.send_personal_message(message, user_id) 