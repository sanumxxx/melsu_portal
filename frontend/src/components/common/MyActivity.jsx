import React, { useState, useEffect } from 'react';
import { 
  ClipboardDocumentIcon, 
  ClockIcon, 
  EyeIcon, 
  UserIcon, 
  ComputerDesktopIcon, 
  GlobeAltIcon 
} from '@heroicons/react/24/outline';
import api from '../../services/api';

const MyActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    loadMyActivities();
  }, [limit]);

  const loadMyActivities = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/activity-logs/my?limit=${limit}`);
      setActivities(response.data);
    } catch (err) {
      setError('Ошибка загрузки истории активности: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('ru-RU', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = (now - date) / (1000 * 60);

    if (diffInMinutes < 1) {
      return 'только что';
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)} мин. назад`;
    } else if (diffInMinutes < 60 * 24) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} ч. назад`;
    } else {
      const days = Math.floor(diffInMinutes / (60 * 24));
      return `${days} дн. назад`;
    }
  };

  const getActionColor = (action) => {
    const colors = {
      login: 'text-green-600 bg-green-50 border-green-200',
      logout: 'text-gray-600 bg-gray-50 border-gray-200',
      create: 'text-blue-600 bg-blue-50 border-blue-200',
      update: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      delete: 'text-red-600 bg-red-50 border-red-200',
      view: 'text-purple-600 bg-purple-50 border-purple-200',
      upload: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      download: 'text-cyan-600 bg-cyan-50 border-cyan-200'
    };
    return colors[action] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getActionIcon = (action) => {
    const icons = {
      login: UserIcon,
      logout: UserIcon,
      create: ClipboardDocumentIcon,
      update: ClipboardDocumentIcon,
      delete: ClipboardDocumentIcon,
      view: EyeIcon,
      upload: ClipboardDocumentIcon,
      download: ClipboardDocumentIcon
    };
    const IconComponent = icons[action] || ClipboardDocumentIcon;
    return <IconComponent className="w-4 h-4" />;
  };

  const getActionText = (action) => {
    const actions = {
      login: 'Вход в систему',
      logout: 'Выход из системы',
      create: 'Создание',
      update: 'Обновление',
      delete: 'Удаление',
      view: 'Просмотр',
      upload: 'Загрузка',
      download: 'Скачивание',
      request_submit: 'Подача заявки',
      announcement_publish: 'Публикация объявления',
      portfolio_add: 'Добавление в портфолио',
      portfolio_update: 'Обновление портфолио',
      report_generate: 'Генерация отчета',
      password_change: 'Смена пароля'
    };
    return actions[action] || action;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardDocumentIcon className="w-7 h-7" />
          Моя активность
        </h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">
            Показать:
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={25}>25 записей</option>
            <option value={50}>50 записей</option>
            <option value={100}>100 записей</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
          {error}
        </div>
      )}

      {/* Список активности */}
      <div className="bg-white rounded-lg border shadow-sm">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardDocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет записей</h3>
            <p className="mt-1 text-sm text-gray-500">
              У вас пока нет записей в истории активности.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activities.map((activity, index) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {/* Иконка действия */}
                    <div className={`flex-shrink-0 p-2 rounded-lg border ${getActionColor(activity.action)}`}>
                      {getActionIcon(activity.action)}
                    </div>
                    
                    {/* Контент */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getActionColor(activity.action)}`}>
                          {getActionText(activity.action)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {getRelativeTime(activity.created_at)}
                        </span>
                      </div>
                      
                      <p className="mt-1 text-sm text-gray-900">
                        {activity.description}
                      </p>
                      
                      {/* Дополнительная информация */}
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {formatDate(activity.created_at)}
                        </div>
                        
                        {activity.resource_type && (
                          <div className="flex items-center gap-1">
                            <span>📁</span>
                            {activity.resource_type}
                            {activity.resource_id && (
                              <span className="text-gray-400">#{activity.resource_id}</span>
                            )}
                          </div>
                        )}
                        
                        {activity.ip_address && (
                          <div className="flex items-center gap-1">
                            <GlobeAltIcon className="w-3 h-3" />
                            {activity.ip_address}
                          </div>
                        )}
                      </div>

                      {/* Детали (если есть) */}
                      {activity.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                            Показать детали
                          </summary>
                          <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                            <pre className="whitespace-pre-wrap font-mono">
                              {JSON.stringify(activity.details, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Информация о записях */}
      {activities.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Показано {activities.length} последних записей
          {activities.length >= limit && (
            <span className="ml-1">
              • Увеличьте лимит для просмотра большего количества записей
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MyActivity; 