import React, { useState, useEffect } from 'react';
import {
  BuildingOfficeIcon,
  UserIcon,
  PlusIcon,
  TrashIcon,
  StarIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AssignmentManager = ({ userId, userName, onClose }) => {
  const [assignments, setAssignments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Форма добавления назначения
  const [newAssignment, setNewAssignment] = useState({
    department_id: '',
    role_id: '',
    is_primary: false,
    assignment_type: 'permanent',
    workload_percentage: 100,
    assignment_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: ''
  });

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignmentsRes, departmentsRes, userRes, allRolesRes] = await Promise.all([
        api.get(`/api/assignments/users/${userId}`),
        api.get('/api/departments'),
                  api.get(`/api/users/${userId}`),
        api.get('/api/roles/')
      ]);

      setAssignments(assignmentsRes.data.assignments || []);
      setDepartments(departmentsRes.data || []);
      setUserInfo(userRes.data);
      
      // Фильтруем роли - показываем только те, которые есть у пользователя
      const allRoles = allRolesRes.data || [];
      const userRoles = userRes.data.user?.roles || [];
      const availableRoles = allRoles.filter(role => userRoles.includes(role.name));
      
      console.log('🎭 Все роли:', allRoles);
      console.log('👤 Роли пользователя:', userRoles);
      console.log('✅ Доступные роли для назначения:', availableRoles);
      
      setRoles(availableRoles);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    
    if (!newAssignment.department_id || !newAssignment.role_id) {
      toast.error('Выберите подразделение и роль');
      return;
    }

    try {
      // Подготавливаем данные для отправки - конвертируем пустые строки в null
      const assignmentData = {
        ...newAssignment,
        end_date: newAssignment.end_date === '' ? null : newAssignment.end_date,
        notes: newAssignment.notes === '' ? null : newAssignment.notes
      };

      const response = await api.post(`/api/assignments/users/${userId}`, assignmentData);
      setAssignments([response.data, ...assignments]);
      setShowAddForm(false);
      setNewAssignment({
        department_id: '',
        role_id: '',
        is_primary: false,
        assignment_type: 'permanent',
        workload_percentage: 100,
        assignment_date: new Date().toISOString().split('T')[0],
        end_date: '',
        notes: ''
      });
      toast.success('Назначение создано');
    } catch (error) {
      console.error('Ошибка создания назначения:', error);
      let errorMessage = 'Ошибка создания назначения';
      
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // Если это массив ошибок валидации
          errorMessage = error.response.data.detail.map(err => err.msg).join(', ');
        } else {
          errorMessage = error.response.data.detail;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Вы уверены, что хотите удалить это назначение?')) return;

    try {
      await api.delete(`/api/assignments/${assignmentId}`);
      setAssignments(assignments.filter(a => a.id !== assignmentId));
      toast.success('Назначение удалено');
    } catch (error) {
      console.error('Ошибка удаления назначения:', error);
      toast.error('Ошибка удаления назначения');
    }
  };

  const handleSetPrimary = async (assignmentId) => {
    try {
      await api.put(`/api/assignments/${assignmentId}/primary`);
      // Обновляем состояние
      setAssignments(assignments.map(a => ({
        ...a,
        is_primary: a.id === assignmentId
      })));
      toast.success('Назначение установлено как основное');
    } catch (error) {
      console.error('Ошибка установки основного назначения:', error);
      toast.error('Ошибка установки основного назначения');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getAssignmentTypeLabel = (type) => {
    const types = {
      permanent: 'Постоянное',
      temporary: 'Временное',
      acting: 'Исполняющий обязанности'
    };
    return types[type] || type;
  };

  const getDepartmentName = (departmentId) => {
    const dept = departments.find(d => d.id === parseInt(departmentId));
    return dept ? dept.name : '';
  };

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === parseInt(roleId));
    return role ? role.display_name : '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <BuildingOfficeIcon className="h-6 w-6 mr-2 text-indigo-600" />
                  Управление назначениями
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Пользователь: <span className="font-medium">{userName}</span>
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowAddForm(true)}
                  disabled={roles.length === 0}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    roles.length === 0 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                  title={roles.length === 0 ? 'У пользователя нет доступных ролей для назначения' : ''}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Добавить назначение
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Форма добавления назначения */}
            {showAddForm && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Новое назначение</h4>
                <form onSubmit={handleCreateAssignment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Подразделение *
                      </label>
                      <select
                        value={newAssignment.department_id}
                        onChange={(e) => setNewAssignment({...newAssignment, department_id: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      >
                        <option value="">Выберите подразделение</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Роль/Должность *
                      </label>
                      {roles.length === 0 ? (
                        <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500">
                          У пользователя нет доступных ролей для назначения
                        </div>
                      ) : (
                        <>
                          <select
                            value={newAssignment.role_id}
                            onChange={(e) => setNewAssignment({...newAssignment, role_id: e.target.value})}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                          >
                            <option value="">Выберите роль</option>
                            {roles.map(role => (
                              <option key={role.id} value={role.id}>
                                {role.display_name}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Показаны только роли, которые есть у пользователя ({userInfo?.user?.roles?.join(', ') || 'нет ролей'})
                          </p>
                        </>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Тип назначения
                      </label>
                      <select
                        value={newAssignment.assignment_type}
                        onChange={(e) => setNewAssignment({...newAssignment, assignment_type: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="permanent">Постоянное</option>
                        <option value="temporary">Временное</option>
                        <option value="acting">Исполняющий обязанности</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Процент занятости
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newAssignment.workload_percentage}
                        onChange={(e) => setNewAssignment({...newAssignment, workload_percentage: parseInt(e.target.value)})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Дата назначения
                      </label>
                      <input
                        type="date"
                        value={newAssignment.assignment_date}
                        onChange={(e) => setNewAssignment({...newAssignment, assignment_date: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Дата окончания (для временных)
                      </label>
                      <input
                        type="date"
                        value={newAssignment.end_date}
                        onChange={(e) => setNewAssignment({...newAssignment, end_date: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Заметки
                    </label>
                    <textarea
                      value={newAssignment.notes}
                      onChange={(e) => setNewAssignment({...newAssignment, notes: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows="3"
                      placeholder="Дополнительная информация о назначении..."
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_primary"
                      checked={newAssignment.is_primary}
                      onChange={(e) => setNewAssignment({...newAssignment, is_primary: e.target.checked})}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_primary" className="ml-2 block text-sm text-gray-900">
                      Основное назначение
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={roles.length === 0}
                      className={`px-4 py-2 rounded-md ${
                        roles.length === 0 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      Создать назначение
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Список назначений */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">
                Текущие назначения ({assignments.length})
              </h4>

              {assignments.length === 0 ? (
                <div className="text-center py-8">
                  <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Нет назначений</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Добавьте первое назначение пользователя в подразделение
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map(assignment => (
                    <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {assignment.is_primary ? (
                                <StarSolidIcon className="h-5 w-5 text-yellow-500" />
                              ) : (
                                <StarIcon className="h-5 w-5 text-gray-300" />
                              )}
                            </div>
                            <div>
                              <h5 className="text-lg font-medium text-gray-900">
                                {assignment.department.name}
                              </h5>
                              <p className="text-sm text-gray-600">
                                {assignment.role.display_name}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Тип:</span>
                              <p className="font-medium">{getAssignmentTypeLabel(assignment.assignment_type)}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Занятость:</span>
                              <p className="font-medium">{assignment.workload_percentage}%</p>
                            </div>
                            <div>
                              <span className="text-gray-500">С:</span>
                              <p className="font-medium">{formatDate(assignment.assignment_date)}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">До:</span>
                              <p className="font-medium">
                                {assignment.end_date ? formatDate(assignment.end_date) : 'Постоянно'}
                              </p>
                            </div>
                          </div>

                          {assignment.notes && (
                            <div className="mt-3">
                              <span className="text-gray-500 text-sm">Заметки:</span>
                              <p className="text-sm text-gray-700 mt-1">{assignment.notes}</p>
                            </div>
                          )}

                          <div className="mt-3 flex items-center space-x-4">
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              assignment.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {assignment.is_active ? 'Активно' : 'Неактивно'}
                            </div>
                            {assignment.is_primary && (
                              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Основное
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2 ml-4">
                          {!assignment.is_primary && assignment.is_active && (
                            <button
                              onClick={() => handleSetPrimary(assignment.id)}
                              className="text-sm text-indigo-600 hover:text-indigo-900"
                            >
                              Сделать основным
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            className="text-sm text-red-600 hover:text-red-900 flex items-center"
                          >
                            <TrashIcon className="h-4 w-4 mr-1" />
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentManager; 