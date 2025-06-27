import toast from 'react-hot-toast';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.userId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.heartbeatInterval = null;
    this.isConnecting = false;
  }

  async connect(userId) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.userId = userId;
    
    try {
      // Запрашиваем разрешение на уведомления при первом подключении
      await this.requestNotificationPermission();

      const wsUrl = `ws://localhost:8000/ws/${userId}`;
      console.log(`🔌 Подключение WebSocket: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket подключен');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.startHeartbeat();
        
        // Показываем уведомление о подключении
        toast.success('🔔 Уведомления включены', {
          duration: 3000,
          position: 'top-right'
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Ошибка парсинга WebSocket сообщения:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('❌ WebSocket отключен:', event.code, event.reason);
        this.isConnecting = false;
        this.stopHeartbeat();
        
        if (event.code !== 1000) { // Не нормальное закрытие
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('💥 Ошибка WebSocket:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Ошибка создания WebSocket:', error);
      this.isConnecting = false;
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      }
    }, 30000); // Каждые 30 секунд
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Превышено максимальное количество попыток переподключения');
      toast.error('Не удалось подключиться к серверу уведомлений', {
        duration: 5000
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`🔄 Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts} через ${delay}ms`);
    
    setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId);
      }
    }, delay);
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('Браузер не поддерживает Browser Push Notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Пользователь запретил уведомления');
      return false;
    }

    // Запрашиваем разрешение
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Ошибка запроса разрешения на уведомления:', error);
      return false;
    }
  }

  handleMessage(data) {
    console.log('📨 Получено WebSocket сообщение:', data);

    switch (data.type) {
      case 'connection_established':
        console.log('✅ Соединение установлено:', data.message);
        break;

      case 'new_request':
        this.handleNewRequest(data);
        break;

      case 'status_change':
        this.handleStatusChange(data);
        break;

      case 'request_updated':
        this.handleRequestUpdated(data);
        break;

      case 'heartbeat_response':
      case 'heartbeat_check':
        // Молча обрабатываем heartbeat
        break;

      default:
        console.log('🤷 Неизвестный тип сообщения:', data.type, data);
    }
  }

  handleNewRequest(data) {
    // Toast уведомление
    toast.success(`🔔 ${data.message}`, {
      duration: 6000,
      position: 'top-right',
      style: {
        background: '#059669',
        color: 'white',
        fontWeight: '500'
      },
      onClick: () => {
        // Переход к заявке при клике
        if (data.request_id) {
          window.location.href = `/requests/${data.request_id}`;
        }
      }
    });

    // Browser Push уведомление
    this.showBrowserNotification({
      title: '🔔 Новая заявка',
      body: data.message,
      data: { request_id: data.request_id, type: 'new_request' }
    });

    // Звук
    this.playNotificationSound('new_request');
  }

  handleStatusChange(data) {
    // Toast уведомление
    toast(`📋 ${data.message}`, {
      duration: 5000,
      position: 'top-right',
      icon: '📋',
      style: {
        background: '#3B82F6',
        color: 'white'
      },
      onClick: () => {
        if (data.request_id) {
          window.location.href = `/requests/${data.request_id}`;
        }
      }
    });

    // Browser Push уведомление
    this.showBrowserNotification({
      title: '📋 Изменение статуса заявки',
      body: data.message,
      data: { request_id: data.request_id, type: 'status_change' }
    });

    // Звук для важных изменений статуса
    if (data.new_status === 'completed' || data.new_status === 'approved') {
      this.playNotificationSound('success');
    } else {
      this.playNotificationSound('status_change');
    }
  }

  handleRequestUpdated(data) {
    // Toast уведомление
    toast.success(`📝 ${data.message}`, {
      duration: 4000,
      position: 'top-right',
      onClick: () => {
        if (data.request_id) {
          window.location.href = `/requests/${data.request_id}`;
        }
      }
    });

    // Browser Push уведомление
    this.showBrowserNotification({
      title: '📝 Обновление заявки',
      body: data.message,
      data: { request_id: data.request_id, type: 'request_updated' }
    });

    // Звук
    this.playNotificationSound('update');
  }

  showBrowserNotification({ title, body, data = {} }) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `request-${data.request_id}`, // Заменяет предыдущие уведомления с тем же тегом
        requireInteraction: false, // Автоматически скрывается
        silent: false,
        data
      });

      // Обработка клика по уведомлению
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        if (data.request_id) {
          // Переходим к заявке
          window.location.href = `/requests/${data.request_id}`;
        }
        
        notification.close();
      };

      // Автоматически закрываем через 10 секунд
      setTimeout(() => {
        notification.close();
      }, 10000);

    } catch (error) {
      console.error('Ошибка показа Browser Push уведомления:', error);
    }
  }

  playNotificationSound(type = 'default') {
    try {
      // Создаем короткий звуковой сигнал программно
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      const sounds = {
        new_request: { frequency: 800, duration: 200 },
        status_change: { frequency: 600, duration: 150 },
        success: { frequency: 1000, duration: 300 },
        update: { frequency: 500, duration: 100 },
        default: { frequency: 700, duration: 150 }
      };

      const sound = sounds[type] || sounds.default;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(sound.frequency, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + sound.duration / 1000);
      
    } catch (error) {
      console.warn('Не удалось воспроизвести звук уведомления:', error);
    }
  }

  disconnect() {
    console.log('🔌 Отключение WebSocket...');
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Пользователь отключился');
      this.ws = null;
    }
    
    this.userId = null;
    this.reconnectAttempts = 0;
  }

  // Методы для управления уведомлениями
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionStatus() {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }
}

// Экспортируем синглтон
export default new WebSocketService(); 