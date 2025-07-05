import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  BuildingOfficeIcon, 
  EyeIcon, 
  PencilIcon, 
  ShieldCheckIcon,
  ClockIcon,
  XMarkIcon,
  CheckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import Loader from '../common/Loader';
import UserSearch from '../common/UserSearch';

const DirectoryAccessManager = () => {
  const [activeTab, setActiveTab] = useState('accesses');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Состояния для управления доступом
  const [accesses, setAccesses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [statistics, setStatistics] = useState(null);
  
  // Состояния для пагинации и фильтров
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    user_id: '',
    department_id: '',
    access_type: '',
    scope: '',
    is_active: null,
    expires_soon: false
  });
  
  // Состояния для модальных окон
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingAccess, setEditingAccess] = useState(null);
  
  // Данные справочников
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);

  // Константы
  const ACCESS_TYPES = {
    read: { label: 'Чтение', color: 'bg-blue-100 text-blue-800', icon: EyeIcon },
    write: { label: 'Запись', color: 'bg-green-100 text-green-800', icon: PencilIcon },
    admin: { label: 'Администрирование', color: 'bg-purple-100 text-purple-800', icon: ShieldCheckIcon }
  };

  const SCOPES = {
    students: { label: 'Студенты', color: 'bg-orange-100 text-orange-800', icon: UserGroupIcon },
    groups: { label: 'Группы', color: 'bg-yellow-100 text-yellow-800', icon: UserGroupIcon },
    departments: { label: 'Подразделения', color: 'bg-indigo-100 text-indigo-800', icon: BuildingOfficeIcon },
    all: { label: 'Все справочники', color: 'bg-gray-100 text-gray-800', icon: AdjustmentsHorizontalIcon }
  };

  useEffect(() => {
    loadData();
    loadDepartments();
  }, [activeTab, pagination.page, filters]);

  const loadData = async () => {
    if (activeTab === 'accesses') {
      await loadAccesses();
    } else if (activeTab === 'templates') {
      await loadTemplates();
    } else if (activeTab === 'statistics') {
      await loadStatistics();
    }
  };

  const loadAccesses = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => 
            value !== '' && value !== null && value !== false
          )
        )
      };
      
      const response = await api.get('/api/admin/directory-access/accesses', { params });
      setAccesses(response.data.accesses);
      setPagination(prev => ({ ...prev, total: response.data.pagination.total }));
    } catch (error) {
      console.error('Ошибка загрузки доступов:', error);
      setError('Не удалось загрузить список доступов');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/directory-access/templates', {
        params: { page: pagination.page, limit: pagination.limit }
      });
      setTemplates(response.data.templates);
      setPagination(prev => ({ ...prev, total: response.data.pagination.total }));
    } catch (error) {
      console.error('Ошибка загрузки шаблонов:', error);
      setError('Не удалось загрузить шаблоны доступа');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/directory-access/statistics');
      setStatistics(response.data);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      setError('Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.get('/api/directories/departments');
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Ошибка загрузки подразделений:', error);
    }
  };

  const handleDeleteAccess = async (accessId) => {
    if (!confirm('Вы уверены, что хотите удалить этот доступ?')) return;
    
    try {
      await api.delete(`/api/admin/directory-access/accesses/${accessId}`);
      await loadAccesses();
    } catch (error) {
      console.error('Ошибка удаления доступа:', error);
      setError('Не удалось удалить доступ');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const isExpiringSoon = (expiresAt) => {
    if (!expiresAt) return false;
    const expireDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpire = (expireDate - now) / (1000 * 60 * 60 * 24);
    return daysUntilExpire <= 30 && daysUntilExpire > 0;
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const renderAccessCard = (access) => {
    const accessTypeInfo = ACCESS_TYPES[access.access_type] || ACCESS_TYPES.read;
    const scopeInfo = SCOPES[access.scope] || SCOPES.all;
    const AccessTypeIcon = accessTypeInfo.icon;
    const ScopeIcon = scopeInfo.icon;

    return (
      <div key={access.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        {/* Заголовок карточки */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <AccessTypeIcon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {access.user_info ? 
                  `${access.user_info.last_name} ${access.user_info.first_name} ${access.user_info.middle_name || ''}`.trim() :
                  `Пользователь #${access.user_id}`
                }
              </h3>
              <p className="text-sm text-gray-500">{access.user_info?.email}</p>
            </div>
          </div>
          
          {/* Статус и действия */}
          <div className="flex items-center space-x-2">
            {isExpired(access.expires_at) && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <ClockIcon className="w-3 h-3 mr-1" />
                Истёк
              </span>
            )}
            {isExpiringSoon(access.expires_at) && !isExpired(access.expires_at) && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                Истекает
              </span>
            )}
            {access.is_active && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckIcon className="w-3 h-3 mr-1" />
                Активен
              </span>
            )}
            
            {/* Кнопки действий */}
            <button
              onClick={() => setEditingAccess(access)}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Редактировать"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteAccess(access.id)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Удалить"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Информация о доступе */}
        <div className="space-y-3">
          {/* Тип доступа и область */}
          <div className="flex items-center space-x-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${accessTypeInfo.color}`}>
              <AccessTypeIcon className="w-3 h-3 mr-1" />
              {accessTypeInfo.label}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${scopeInfo.color}`}>
              <ScopeIcon className="w-3 h-3 mr-1" />
              {scopeInfo.label}
            </span>
          </div>

          {/* Подразделение */}
          {access.department_info ? (
            <div className="flex items-center text-sm text-gray-600">
              <BuildingOfficeIcon className="h-4 w-4 mr-2" />
              <span>{access.department_info.name}</span>
              <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs">
                {access.department_info.department_type === 'faculty' ? 'Факультет' : 'Кафедра'}
              </span>
            </div>
          ) : (
            <div className="flex items-center text-sm text-gray-600">
              <BuildingOfficeIcon className="h-4 w-4 mr-2" />
              <span className="font-medium">Все подразделения</span>
            </div>
          )}

          {/* Наследование */}
          {access.inherit_children && (
            <div className="flex items-center text-xs text-blue-600">
              <InformationCircleIcon className="h-3 w-3 mr-1" />
              Включает дочерние подразделения
            </div>
          )}

          {/* Ограничения */}
          {access.restrictions && Object.keys(access.restrictions).length > 0 && (
            <div className="text-xs text-orange-600">
              <span className="font-medium">Ограничения:</span> {JSON.stringify(access.restrictions)}
            </div>
          )}

          {/* Описание */}
          {access.description && (
            <p className="text-sm text-gray-600 italic">{access.description}</p>
          )}

          {/* Даты */}
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
            <div>
              <span className="font-medium">Предоставлен:</span><br />
              {formatDate(access.granted_at)}
              {access.granted_by_info && (
                <div className="mt-1">
                  <span className="text-gray-400">
                    {access.granted_by_info.last_name} {access.granted_by_info.first_name}
                  </span>
                </div>
              )}
            </div>
            <div>
              <span className="font-medium">Истекает:</span><br />
              {access.expires_at ? formatDate(access.expires_at) : 'Бессрочно'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStatistics = () => {
    if (!statistics) return null;

    return (
      <div className="space-y-6">
        {/* Общая статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserGroupIcon className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Всего доступов</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.total_accesses}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckIcon className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Активных</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.active_accesses}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Просроченных</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.expired_accesses}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <AdjustmentsHorizontalIcon className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Шаблонов</p>
                <p className="text-2xl font-semibold text-gray-900">{templates.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Статистика по типам доступа */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Распределение по типам доступа</h3>
          <div className="space-y-3">
            {Object.entries(statistics.by_access_type || {}).map(([type, count]) => {
              const typeInfo = ACCESS_TYPES[type] || ACCESS_TYPES.read;
              const percentage = statistics.active_accesses > 0 ? 
                Math.round((count / statistics.active_accesses) * 100) : 0;
              
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color} mr-3`}>
                      {typeInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-12 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Статистика по областям доступа */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Распределение по областям доступа</h3>
          <div className="space-y-3">
            {Object.entries(statistics.by_scope || {}).map(([scope, count]) => {
              const scopeInfo = SCOPES[scope] || SCOPES.all;
              const percentage = statistics.active_accesses > 0 ? 
                Math.round((count / statistics.active_accesses) * 100) : 0;
              
              return (
                <div key={scope} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${scopeInfo.color} mr-3`}>
                      {scopeInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-12 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление доступом к справочникам</h1>
          <p className="mt-1 text-sm text-gray-500">
            Настройка прав доступа пользователей к различным разделам справочников
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowBulkModal(true)}
            icon={UserGroupIcon}
          >
            Массовое назначение
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            icon={PlusIcon}
          >
            Добавить доступ
          </Button>
        </div>
      </div>

      {/* Уведомления об ошибках */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Вкладки */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'accesses', name: 'Доступы', icon: UserGroupIcon },
            { id: 'templates', name: 'Шаблоны', icon: AdjustmentsHorizontalIcon },
            { id: 'statistics', name: 'Статистика', icon: InformationCircleIcon }
          ].map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TabIcon
                  className={`-ml-0.5 mr-2 h-5 w-5 ${
                    activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Фильтры для доступов */}
      {activeTab === 'accesses' && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Input
                label="Поиск пользователя"
                placeholder="ID или email"
                value={filters.user_id}
                onChange={(e) => setFilters(prev => ({ ...prev, user_id: e.target.value }))}
              />
            </div>
            <div>
              <Select
                label="Подразделение"
                value={filters.department_id}
                onChange={(e) => setFilters(prev => ({ ...prev, department_id: e.target.value }))}
                options={[
                  { value: '', label: 'Все' },
                  ...departments.map(dept => ({
                    value: dept.id,
                    label: `${dept.name} (${dept.department_type === 'faculty' ? 'Факультет' : 'Кафедра'})`
                  }))
                ]}
              />
            </div>
            <div>
              <Select
                label="Тип доступа"
                value={filters.access_type}
                onChange={(e) => setFilters(prev => ({ ...prev, access_type: e.target.value }))}
                options={[
                  { value: '', label: 'Все' },
                  { value: 'read', label: 'Чтение' },
                  { value: 'write', label: 'Запись' },
                  { value: 'admin', label: 'Администрирование' }
                ]}
              />
            </div>
            <div>
              <Select
                label="Область доступа"
                value={filters.scope}
                onChange={(e) => setFilters(prev => ({ ...prev, scope: e.target.value }))}
                options={[
                  { value: '', label: 'Все' },
                  { value: 'students', label: 'Студенты' },
                  { value: 'groups', label: 'Группы' },
                  { value: 'departments', label: 'Подразделения' },
                  { value: 'all', label: 'Все справочники' }
                ]}
              />
            </div>
            <div>
              <Select
                label="Статус"
                value={filters.is_active === null ? '' : filters.is_active.toString()}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  is_active: e.target.value === '' ? null : e.target.value === 'true'
                }))}
                options={[
                  { value: '', label: 'Все' },
                  { value: 'true', label: 'Активные' },
                  { value: 'false', label: 'Неактивные' }
                ]}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  checked={filters.expires_soon}
                  onChange={(e) => setFilters(prev => ({ ...prev, expires_soon: e.target.checked }))}
                />
                <span className="ml-2 text-sm text-gray-600">Истекающие</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Контент */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      ) : (
        <div>
          {activeTab === 'accesses' && (
            <div className="space-y-4">
              {accesses.length === 0 ? (
                <div className="text-center py-12">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Нет доступов</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Создайте первый доступ к справочникам
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {accesses.map(renderAccessCard)}
                </div>
              )}
              
              {/* Пагинация */}
              {pagination.total > pagination.limit && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <Button
                      variant="outline"
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                    >
                      Предыдущая
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                    >
                      Следующая
                    </Button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Показано <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> по{' '}
                        <span className="font-medium">
                          {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span>{' '}
                        из <span className="font-medium">{pagination.total}</span> результатов
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        {/* Пагинация */}
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="text-center py-12">
              <AdjustmentsHorizontalIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Шаблоны доступа</h3>
              <p className="mt-1 text-sm text-gray-500">
                Функционал шаблонов будет добавлен в следующих версиях
              </p>
            </div>
          )}

          {activeTab === 'statistics' && renderStatistics()}
        </div>
      )}
    </div>
  );
};

export default DirectoryAccessManager; 