import React, { useState, useEffect } from 'react';
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  AcademicCapIcon,
  UsersIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';

const Institutes = () => {
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedInstitute, setSelectedInstitute] = useState(null);
  const [departmentEmployees, setDepartmentEmployees] = useState({});
  const [loadingEmployees, setLoadingEmployees] = useState(new Set());

  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    description: '',
    department_type: 'institute',
    head_name: '',
    head_title: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    room_number: '',
    is_active: true
  });

  useEffect(() => {
    fetchInstitutes();
  }, []);

  const fetchInstitutes = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/departments/tree');
      // Фильтруем только институты и их дочерние элементы
      const institutesData = response.data.filter(dept => dept.department_type === 'institute');
      setInstitutes(institutesData);
    } catch (err) {
      console.error('Ошибка загрузки институтов:', err);
      setError('Не удалось загрузить список институтов');
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
      fetchDepartmentEmployees(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const fetchDepartmentEmployees = async (departmentId) => {
    if (departmentEmployees[departmentId] || loadingEmployees.has(departmentId)) {
      return;
    }

    setLoadingEmployees(prev => new Set([...prev, departmentId]));

    try {
      const response = await api.get(`/departments/${departmentId}/employees`);
      setDepartmentEmployees(prev => ({
        ...prev,
        [departmentId]: response.data.employees
      }));
    } catch (err) {
      console.error('Ошибка загрузки сотрудников:', err);
    } finally {
      setLoadingEmployees(prev => {
        const newSet = new Set(prev);
        newSet.delete(departmentId);
        return newSet;
      });
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedInstitute(null);
    setFormData({
      name: '',
      short_name: '',
      description: '',
      department_type: 'institute',
      head_name: '',
      head_title: '',
      phone: '',
      email: '',
      website: '',
      address: '',
      room_number: '',
      is_active: true
    });
    setShowModal(true);
  };

  const openEditModal = (institute) => {
    setModalMode('edit');
    setSelectedInstitute(institute);
    setFormData({
      name: institute.name || '',
      short_name: institute.short_name || '',
      description: institute.description || '',
      department_type: 'institute',
      head_name: institute.head_name || '',
      head_title: institute.head_title || '',
      phone: institute.phone || '',
      email: institute.email || '',
      website: institute.website || '',
      address: institute.address || '',
      room_number: institute.room_number || '',
      is_active: institute.is_active !== false
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedInstitute(null);
    setFormData({
      name: '',
      short_name: '',
      description: '',
      department_type: 'institute',
      head_name: '',
      head_title: '',
      phone: '',
      email: '',
      website: '',
      address: '',
      room_number: '',
      is_active: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (modalMode === 'create') {
        await api.post('/departments', formData);
      } else {
        await api.put(`/departments/${selectedInstitute.id}`, formData);
      }

      await fetchInstitutes();
      closeModal();
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setError('Не удалось сохранить институт');
    }
  };

  const handleDelete = async (institute) => {
    if (!window.confirm(`Вы уверены, что хотите удалить институт "${institute.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/departments/${institute.id}`);
      await fetchInstitutes();
    } catch (err) {
      console.error('Ошибка удаления:', err);
      setError('Не удалось удалить институт');
    }
  };

  const renderInstituteNode = (institute) => {
    const hasChildren = institute.children && institute.children.length > 0;
    const isExpanded = expandedNodes.has(institute.id);

    return (
      <div key={institute.id} className="select-none">
        <div className="flex items-center py-3 px-4 hover:bg-gray-50 rounded-lg border border-gray-200 mb-4 group transition-colors">
          {/* Кнопка разворачивания */}
          <div className="w-6 h-6 flex items-center justify-center">
            {hasChildren ? (
              <button
                onClick={() => toggleNode(institute.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-4 h-4"></div>
            )}
          </div>

          {/* Иконка института */}
          <AcademicCapIcon className="h-6 w-6 mr-3 text-blue-600" />

          {/* Информация об институте */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {institute.name}
              </h3>
              {institute.short_name && (
                <span className="ml-2 text-sm text-gray-500">
                  ({institute.short_name})
                </span>
              )}
              {!institute.is_active && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Неактивен
                </span>
              )}
            </div>
            {institute.head_name && (
              <p className="text-sm text-gray-600 mt-1">
                {institute.head_title && `${institute.head_title}: `}
                {institute.head_name}
              </p>
            )}
            {institute.description && (
              <p className="text-sm text-gray-500 mt-1">{institute.description}</p>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
            <button
              onClick={() => openEditModal(institute)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Редактировать"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleDelete(institute)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Удалить"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Дочерние элементы (факультеты и кафедры) */}
        {hasChildren && isExpanded && (
          <div className="ml-8 mb-4 space-y-2">
            {institute.children.map(child => (
              <div key={child.id} className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <h4 className="font-medium text-gray-800">{child.name}</h4>
                  <span className="ml-2 text-xs text-gray-500">({child.department_type})</span>
                </div>
                {child.head_name && (
                  <p className="text-sm text-gray-600 ml-5 mt-1">
                    {child.head_title && `${child.head_title}: `}
                    {child.head_name}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Сотрудники института */}
        {isExpanded && (
          <div className="ml-8 mt-2 mb-4">
            {loadingEmployees.has(institute.id) ? (
              <div className="flex items-center text-sm text-gray-500 py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                Загрузка сотрудников...
              </div>
            ) : departmentEmployees[institute.id] && departmentEmployees[institute.id].length > 0 ? (
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center text-sm font-medium text-gray-700 mb-3">
                  <UsersIcon className="h-4 w-4 mr-2" />
                  Сотрудники института ({departmentEmployees[institute.id].length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {departmentEmployees[institute.id].map(employee => (
                    <div key={employee.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-medium text-xs">
                          {employee.first_name?.charAt(0) || employee.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {employee.first_name} {employee.last_name}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 space-x-2">
                          <EnvelopeIcon className="h-3 w-3" />
                          <span>{employee.email}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : departmentEmployees[institute.id] && departmentEmployees[institute.id].length === 0 ? (
              <div className="text-sm text-gray-500 py-2 bg-gray-50 rounded text-center">
                Нет сотрудников в данном институте
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Институты</h1>
          <p className="mt-1 text-sm text-gray-600">
            Управление институтами университета
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Добавить институт
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Ошибка</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {institutes.length === 0 ? (
        <div className="text-center py-12">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Нет институтов</h3>
          <p className="mt-1 text-sm text-gray-500">
            Начните с создания первого института
          </p>
          <div className="mt-6">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Создать институт
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {institutes.map(institute => renderInstituteNode(institute))}
        </div>
      )}

      {/* Модальное окно */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {modalMode === 'create' ? 'Создать институт' : 'Редактировать институт'}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Название *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Например: Институт информационных технологий"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Краткое название</label>
                      <input
                        type="text"
                        value={formData.short_name}
                        onChange={(e) => setFormData({...formData, short_name: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ИИТ"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Описание</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows="3"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Руководитель</label>
                        <input
                          type="text"
                          value={formData.head_name}
                          onChange={(e) => setFormData({...formData, head_name: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="ФИО директора"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Должность</label>
                        <input
                          type="text"
                          value={formData.head_title}
                          onChange={(e) => setFormData({...formData, head_title: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Директор"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Телефон</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-600">Активен</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {modalMode === 'create' ? 'Создать' : 'Сохранить'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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

export default Institutes; 