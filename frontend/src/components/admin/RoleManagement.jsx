import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../common/Card';
import Button from '../common/Button';
import { Alert } from '../common/Alert';
import { Loader } from '../common/Loader';
import api, { getErrorMessage } from '../../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/roles?include_inactive=true');
      setRoles(response.data);
    } catch (err) {
      console.error('Ошибка загрузки ролей:', err);
      setError('Не удалось загрузить роли: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      is_active: true
    });
    setEditingRole(null);
    setShowCreateModal(true);
  };

  const handleEdit = (role) => {
    setFormData({
      name: role.name,
      display_name: role.display_name,
      description: role.description || '',
      is_active: role.is_active
    });
    setEditingRole(role);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);

      if (editingRole) {
        // Обновление роли
        await api.put(`/api/roles/${editingRole.id}`, {
          display_name: formData.display_name,
          description: formData.description,
          is_active: formData.is_active
        });
      } else {
        // Создание новой роли
        await api.post('/api/roles', formData);
      }

      setShowCreateModal(false);
      await loadRoles();
    } catch (err) {
      console.error('Ошибка сохранения роли:', err);
      setError('Ошибка сохранения роли: ' + getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`Вы уверены, что хотите удалить роль "${role.display_name}"?`)) {
      return;
    }

    try {
      setError(null);
      await api.delete(`/api/roles/${role.id}`);
      await loadRoles();
    } catch (err) {
      console.error('Ошибка удаления роли:', err);
      setError('Ошибка удаления роли: ' + getErrorMessage(err));
    }
  };

  const getRoleIcon = (role) => {
    if (role.is_system) {
      return <ShieldCheckIcon className="h-5 w-5 text-blue-500" />;
    }
    return <UserGroupIcon className="h-5 w-5 text-gray-500" />;
  };

  const getRoleBadge = (role) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    
    if (role.is_system) {
      return (
        <span className={`${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`}>
          Системная
        </span>
      );
    }
    
    return (
      <span className={`${baseClasses} bg-green-100 text-green-800 border border-green-200`}>
        Пользовательская
      </span>
    );
  };

  const getStatusBadge = (role) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    
    if (role.is_active) {
      return (
        <span className={`${baseClasses} bg-green-100 text-green-800 border border-green-200`}>
          Активна
        </span>
      );
    }
    
    return (
      <span className={`${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`}>
        Неактивна
      </span>
    );
  };

  if (loading) {
    return <Loader text="Загрузка ролей..." />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Управление ролями</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Создание и настройка ролей в системе</p>
        </div>
        <Button onClick={handleCreate} variant="primary" className="w-full sm:w-auto">
          <PlusIcon className="h-4 w-4 mr-2" />
          Создать роль
        </Button>
      </div>

      {error && <Alert variant="error" message={error} />}

      {/* Список ролей */}
      <Card>
        <CardHeader>
          <CardTitle>
            Роли в системе
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({roles.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-8">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Нет ролей</h3>
              <p className="mt-2 text-sm text-gray-500">
                Создайте первую роль для начала работы
              </p>
            </div>
          ) : (
            <>
              {/* Таблица для больших экранов */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Роль
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Описание
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Тип
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Статус
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {roles.map((role) => (
                      <tr key={role.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getRoleIcon(role)}
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {role.display_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {role.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {role.description || 'Нет описания'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRoleBadge(role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleEdit(role)}
                              variant="outline"
                              size="sm"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            {!role.is_system && (
                              <Button
                                onClick={() => handleDelete(role)}
                                variant="danger"
                                size="sm"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Карточки для мобильных и планшетов */}
              <div className="lg:hidden space-y-4">
                {roles.map((role) => (
                  <div key={role.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 min-w-0 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {getRoleIcon(role)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h3 className="text-sm sm:text-base font-medium text-gray-900">
                              {role.display_name}
                            </h3>
                            <div className="flex items-center gap-2">
                              {getRoleBadge(role)}
                              {getStatusBadge(role)}
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            {role.name}
                          </p>
                          {role.description && (
                            <p className="text-xs sm:text-sm text-gray-600 mt-2 line-clamp-2">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-2">
                        <Button
                          onClick={() => handleEdit(role)}
                          variant="outline"
                          size="sm"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        {!role.is_system && (
                          <Button
                            onClick={() => handleDelete(role)}
                            variant="danger"
                            size="sm"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Модальное окно создания/редактирования роли */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md sm:max-w-lg h-full sm:h-auto overflow-y-auto sm:overflow-visible">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 sm:pb-0 sm:static">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">
                {editingRole ? 'Редактировать роль' : 'Создать роль'}
              </h3>
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="ghost"
                size="sm"
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingRole && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Системное имя роли
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="admin, manager, employee..."
                    required
                    disabled={submitting}
                  />
                  <p className="mt-1 text-xs sm:text-sm text-gray-500">
                    Используется в коде. Только латинские буквы, цифры и подчеркивания.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Отображаемое имя
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Администратор, Менеджер..."
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Описание
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Описание роли и её возможностей..."
                  disabled={submitting}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={submitting}
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Роль активна
                </label>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? 'Сохранение...' : (editingRole ? 'Обновить' : 'Создать')}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={submitting}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement; 