import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  UserIcon, 
  ClipboardDocumentIcon, 
  AdjustmentsHorizontalIcon, 
  ArrowDownTrayIcon, 
  EyeIcon, 
  MagnifyingGlassIcon, 
  ClockIcon, 
  GlobeAltIcon, 
  ComputerDesktopIcon 
} from '@heroicons/react/24/outline';
import api from '../../services/api';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    user_id: '',
    action: '',
    resource_type: '',
    resource_id: '',
    start_date: '',
    end_date: '',
    page: 1,
    size: 50
  });
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [availableActions, setAvailableActions] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  useEffect(() => {
    loadActivityLogs();
    loadAvailableActions();
    loadResourceTypes();
  }, [filters]);

  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params.append(key, value);
        }
      });

      const response = await api.get(`/api/activity-logs/?${params.toString()}`);
      setLogs(response.data.items);
      setTotalPages(response.data.pages);
      setTotalLogs(response.data.total);
    } catch (err) {
      setError('Ошибка загрузки журнала активности: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/api/activity-logs/stats?days=30');
      setStats(response.data);
    } catch (err) {
      setError('Ошибка загрузки статистики: ' + err.message);
    }
  };

  const loadAvailableActions = async () => {
    try {
      const response = await api.get('/api/activity-logs/actions');
      setAvailableActions(response.data.actions);
    } catch (err) {
      console.error('Ошибка загрузки типов действий:', err);
    }
  };

  const loadResourceTypes = async () => {
    try {
      const response = await api.get('/api/activity-logs/resource-types');
      setResourceTypes(response.data.resource_types);
    } catch (err) {
      console.error('Ошибка загрузки типов ресурсов:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Сбрасываем на первую страницу при изменении фильтров
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const clearFilters = () => {
    setFilters({
      user_id: '',
      action: '',
      resource_type: '',
      resource_id: '',
      start_date: '',
      end_date: '',
      page: 1,
      size: 50
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionColor = (action) => {
    const colors = {
      login: 'text-green-600 bg-green-50',
      logout: 'text-gray-600 bg-gray-50',
      create: 'text-blue-600 bg-blue-50',
      update: 'text-yellow-600 bg-yellow-50',
      delete: 'text-red-600 bg-red-50',
      view: 'text-purple-600 bg-purple-50',
      upload: 'text-indigo-600 bg-indigo-50',
      download: 'text-cyan-600 bg-cyan-50'
    };
    return colors[action] || 'text-gray-600 bg-gray-50';
  };

  const getActionIcon = (action) => {
    const icons = {
      login: UserIcon,
      logout: UserIcon,
      create: ClipboardDocumentIcon,
      update: ClipboardDocumentIcon,
      delete: ClipboardDocumentIcon,
      view: EyeIcon,
      upload: ArrowDownTrayIcon,
      download: ArrowDownTrayIcon
    };
    const IconComponent = icons[action] || ClipboardDocumentIcon;
    return <IconComponent className="w-4 h-4" />;
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardDocumentIcon className="w-6 h-6 sm:w-8 sm:h-8" />
          Журнал активности
        </h1>
        <button
          onClick={() => {
            setShowStats(!showStats);
            if (!showStats && !stats) {
              loadStats();
            }
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base w-full sm:w-auto"
        >
          {showStats ? 'Скрыть статистику' : 'Показать статистику'}
        </button>
      </div>

      {/* Статистика */}
      {showStats && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 sm:mb-6">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Всего действий</h3>
            <p className="text-2xl font-bold text-blue-600">{stats.total_actions}</p>
            <p className="text-xs text-gray-400">за {stats.period_days} дней</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Активных пользователей</h3>
            <p className="text-2xl font-bold text-green-600">{stats.unique_users}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Самое частое действие</h3>
            <p className="text-lg font-semibold text-purple-600">
              {stats.top_actions[0]?.action || 'Нет данных'}
            </p>
            <p className="text-xs text-gray-400">
              {stats.top_actions[0]?.count || 0} раз
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Топ пользователь</h3>
            <p className="text-sm font-semibold text-orange-600">
              {stats.top_users[0]?.full_name || 'Нет данных'}
            </p>
            <p className="text-xs text-gray-400">
              {stats.top_users[0]?.actions_count || 0} действий
            </p>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div className="bg-white p-4 sm:p-6 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AdjustmentsHorizontalIcon className="w-5 h-5" />
          <h2 className="text-base sm:text-lg font-semibold">Фильтры</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID пользователя
            </label>
            <input
              type="number"
              value={filters.user_id}
              onChange={(e) => handleFilterChange('user_id', e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип действия
            </label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все действия</option>
              {availableActions.map(action => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип ресурса
            </label>
            <select
              value={filters.resource_type}
              onChange={(e) => handleFilterChange('resource_type', e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все ресурсы</option>
              {resourceTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID ресурса
            </label>
            <input
              type="text"
              value={filters.resource_id}
              onChange={(e) => handleFilterChange('resource_id', e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите ID ресурса"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Дата начала
            </label>
            <input
              type="datetime-local"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Дата окончания
            </label>
            <input
              type="datetime-local"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Записей на странице
            </label>
            <select
              value={filters.size}
              onChange={(e) => handleFilterChange('size', parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm sm:text-base"
            >
              Очистить фильтры
            </button>
          </div>
        </div>
      </div>

      {/* Информация о результатах */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-gray-600">
        <span>
          Показано {logs.length} из {totalLogs} записей
        </span>
        <span>
          Страница {filters.page} из {totalPages}
        </span>
      </div>

      {/* Журнал активности */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
            {error}
          </div>
        )}

        {logs.length > 0 ? (
          <>
            {/* Таблица для больших экранов */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Время
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Пользователь
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действие
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Описание
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ресурс
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP адрес
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4 text-gray-400" />
                          {formatDate(log.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {log.user_full_name || 'Система'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {log.user_email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {log.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.resource_type && (
                          <div>
                            <div>{log.resource_type}</div>
                            {log.resource_id && (
                              <div className="text-xs text-gray-400">ID: {log.resource_id}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <GlobeAltIcon className="w-4 h-4" />
                          {log.ip_address || 'Неизвестно'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Карточки для мобильных и планшетов */}
            <div className="lg:hidden p-4 space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                          {log.action}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <ClockIcon className="w-3 h-3" />
                          {formatDate(log.created_at)}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-medium text-gray-500">Пользователь:</span>
                          <div className="text-sm text-gray-900">
                            {log.user_full_name || 'Система'}
                          </div>
                          {log.user_email && (
                            <div className="text-xs text-gray-500">{log.user_email}</div>
                          )}
                        </div>
                        
                        {log.description && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Описание:</span>
                            <div className="text-sm text-gray-900">{log.description}</div>
                          </div>
                        )}
                        
                        {log.resource_type && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Ресурс:</span>
                            <div className="text-sm text-gray-900">
                              {log.resource_type}
                              {log.resource_id && (
                                <span className="text-xs text-gray-400 ml-1">ID: {log.resource_id}</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <GlobeAltIcon className="w-3 h-3" />
                          <span>IP: {log.ip_address || 'Неизвестно'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : !loading && (
          <div className="text-center py-12">
            <ClipboardDocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет записей</h3>
            <p className="mt-1 text-sm text-gray-500">
              Не найдено записей в журнале активности с выбранными фильтрами.
            </p>
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => handlePageChange(filters.page - 1)}
            disabled={filters.page <= 1}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Предыдущая
          </button>
          
          <div className="flex space-x-1 overflow-x-auto max-w-full">
            {[...Array(Math.min(totalPages > 5 ? 5 : totalPages, totalPages))].map((_, index) => {
              let page;
              if (totalPages <= 5) {
                page = index + 1;
              } else {
                const start = Math.max(1, filters.page - 2);
                page = start + index;
              }
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap ${
                    filters.page === page
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(filters.page + 1)}
            disabled={filters.page >= totalPages}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Следующая
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs; 