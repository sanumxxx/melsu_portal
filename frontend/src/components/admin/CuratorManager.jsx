import React, { useState, useEffect } from 'react';
import {
  UserIcon,
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';

const CuratorManager = () => {
  const [curators, setCurators] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  // Форма назначения куратора
  const [assignForm, setAssignForm] = useState({
    curator_id: '',
    group_ids: [],
    notes: ''
  });
  
  // Поиск
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Загружаем кураторов и пользователей
      const [curatorsRes, usersRes] = await Promise.all([
        api.get('/api/curator-access/curators'),
        api.get('/users?role=employee')
      ]);

      setCurators(curatorsRes.data.curators || []);
      setUsers(usersRes.data.users || []);

      // Загружаем все группы с пагинацией
      const allGroups = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const groupsRes = await api.get(`/api/group-access/my-groups?page=${page}&size=100`);
        const groups = groupsRes.data.groups || [];
        allGroups.push(...groups);
        
        // Проверяем, есть ли еще страницы
        hasMore = groups.length === 100;
        page++;
      }
      
      setGroups(allGroups);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCurator = async (e) => {
    e.preventDefault();
    
    if (!assignForm.curator_id) {
      setError('Выберите куратора');
      return;
    }
    
    if (assignForm.group_ids.length === 0) {
      setError('Выберите хотя бы одну группу');
      return;
    }

    try {
      setLoading(true);
      
      await api.post('/api/curator-access/assign-curator', {
        curator_id: parseInt(assignForm.curator_id),
        group_ids: assignForm.group_ids.map(id => parseInt(id)),
        department_ids: [],
        notes: assignForm.notes
      });

      // Сбрасываем форму
      setAssignForm({
        curator_id: '',
        group_ids: [],
        notes: ''
      });
      
      setShowAssignModal(false);
      await loadData();
    } catch (err) {
      console.error('Ошибка назначения куратора:', err);
      setError(err.response?.data?.detail || 'Ошибка назначения куратора');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCurator = async (curatorId) => {
    if (!window.confirm('Вы уверены, что хотите удалить кураторский доступ?')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/api/curator-access/remove-curator/${curatorId}`);
      await loadData();
    } catch (err) {
      console.error('Ошибка удаления куратора:', err);
      setError(err.response?.data?.detail || 'Ошибка удаления куратора');
    } finally {
      setLoading(false);
    }
  };

  const filteredCurators = curators.filter(curator =>
    curator.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    curator.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    curator.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableUsers = users.filter(user => 
    !curators.some(curator => curator.id === user.id)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Заголовок */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Управление кураторами</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Назначение кураторов для групп</p>
          </div>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 w-full sm:w-auto text-sm sm:text-base"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Назначить куратора
          </button>
        </div>
      </div>

      {/* Поиск */}
      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск кураторов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>

      {/* Сообщение об ошибке */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Список кураторов */}
      {filteredCurators.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {filteredCurators.map((curator) => (
            <div key={curator.id} className="bg-white shadow rounded-lg p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-red-600" />
                      </div>
                    </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">
                        {curator.last_name} {curator.first_name} {curator.middle_name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{curator.email}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center">
                            <UserGroupIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span>{curator.groups_count} групп</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveCurator(curator.id)}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors"
                      title="Удалить кураторский доступ"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Группы */}
                {curator.groups.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-gray-500 mb-2">Группы:</div>
                    <div className="flex flex-wrap gap-1">
                      {curator.groups.map((group) => (
                        <span
                          key={group.id}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {group.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                  </div>
                </div>
              </div>
            </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Нет кураторов</h3>
          <p className="mt-1 text-sm text-gray-500">
            Начните с назначения первого куратора
          </p>
        </div>
      )}

      {/* Модальное окно назначения куратора */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4">
          <div className="flex items-center justify-center min-h-screen">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAssignModal(false)}></div>
            
            <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-2xl h-full sm:h-auto overflow-y-auto sm:overflow-visible">
              <form onSubmit={handleAssignCurator}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 sm:pb-0 sm:static">
                      <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">
                        Назначить куратора
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowAssignModal(false)}
                        className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-md transition-colors sm:hidden"
                      >
                        ×
                      </button>
                    </div>
                      
                      {/* Выбор куратора */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Куратор
                        </label>
                        <select
                          value={assignForm.curator_id}
                          onChange={(e) => setAssignForm({...assignForm, curator_id: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:ring-red-500 focus:border-red-500"
                          required
                        >
                          <option value="">Выберите куратора</option>
                          {availableUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.last_name} {user.first_name} {user.middle_name} ({user.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Выбор групп */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Группы
                        </label>
                        <div className="max-h-32 sm:max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                          {groups.map((group) => (
                            <label key={group.id} className="flex items-center mb-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={assignForm.group_ids.includes(group.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setAssignForm({
                                      ...assignForm,
                                      group_ids: [...assignForm.group_ids, group.id]
                                    });
                                  } else {
                                    setAssignForm({
                                      ...assignForm,
                                      group_ids: assignForm.group_ids.filter(id => id !== group.id)
                                    });
                                  }
                                }}
                                className="mr-3 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                              />
                              <span className="text-xs sm:text-sm text-gray-900">{group.name} ({group.department_name})</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Примечания */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Примечания
                        </label>
                        <textarea
                          value={assignForm.notes}
                          onChange={(e) => setAssignForm({...assignForm, notes: e.target.value})}
                          rows={3}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:ring-red-500 focus:border-red-500"
                          placeholder="Дополнительная информация о назначении..."
                        />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-col sm:flex-row sm:flex-row-reverse gap-2 sm:gap-0 sticky bottom-0 z-10">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? 'Назначение...' : 'Назначить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CuratorManager; 