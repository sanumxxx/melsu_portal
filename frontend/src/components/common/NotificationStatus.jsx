import React, { useState, useEffect } from 'react';
import { 
  WifiIcon, 
  NoSymbolIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import WebSocketService from '../../services/websocketService';

const NotificationStatus = () => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [notificationPermission, setNotificationPermission] = useState('default');

  useEffect(() => {
    // Проверяем статус соединения каждые 2 секунды
    const interval = setInterval(() => {
      setConnectionStatus(WebSocketService.getConnectionStatus());
    }, 2000);

    // Проверяем разрешение на уведомления
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <WifiIcon className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'disconnected':
        return <NoSymbolIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Уведомления включены';
      case 'connecting':
        return 'Подключение...';
      case 'disconnected':
        return 'Уведомления отключены';
      default:
        return 'Неизвестно';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'disconnected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  // Не показываем если WebSocket не поддерживается
  if (!('WebSocket' in window)) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-lg">
      {getStatusIcon()}
      <span className={`text-xs font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      
      {/* Показываем предупреждение о разрешении на уведомления */}
      {notificationPermission !== 'granted' && connectionStatus === 'connected' && (
        <button
          onClick={requestNotificationPermission}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
          title="Разрешить браузерные уведомления"
        >
          Разрешить уведомления
        </button>
      )}
    </div>
  );
};

export default NotificationStatus; 