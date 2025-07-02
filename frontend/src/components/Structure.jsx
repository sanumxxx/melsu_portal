import React, { useState, useEffect } from 'react';
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  UserGroupIcon,
  BeakerIcon,
  DocumentTextIcon,
  CogIcon,
  BanknotesIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  RectangleGroupIcon,
  UsersIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserPlusIcon,
  EyeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

const Structure = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit'
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [parentDepartment, setParentDepartment] = useState(null);
  const [departmentTypes, setDepartmentTypes] = useState([]);
  const [departmentEmployees, setDepartmentEmployees] = useState({}); // Кеш сотрудников по ID подразделения
  const [loadingEmployees, setLoadingEmployees] = useState(new Set()); // Загружаемые подразделения
  
  // Состояния для управления доступом к студентам
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedDepartmentForAccess, setSelectedDepartmentForAccess] = useState(null);
  const [accessAssignments, setAccessAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [accessLevels, setAccessLevels] = useState([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [accessFormData, setAccessFormData] = useState({
    employee_id: '',
    access_level: 'read',
    notes: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    description: '',
    department_type: 'department',
    head_name: '',
    head_title: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    room_number: '',
    is_active: true
  });

  // Иконки для разных типов подразделений
  const departmentIcons = {
    university: BuildingOfficeIcon,
    rectorate: AcademicCapIcon,
    institute: AcademicCapIcon,
    faculty: UserGroupIcon,
    department: UserGroupIcon,
    chair: DocumentTextIcon,
    management: CogIcon,
    directorate: BanknotesIcon,
    lab: BeakerIcon,
    center: BeakerIcon,
    service: WrenchScrewdriverIcon,
    sector: ClipboardDocumentListIcon,
    group: RectangleGroupIcon
  };

  // Цвета для разных типов
  const departmentColors = {
    university: 'text-purple-600',
    rectorate: 'text-purple-800',
    institute: 'text-blue-600',
    faculty: 'text-green-600',
    department: 'text-gray-600',
    chair: 'text-yellow-600',
    management: 'text-indigo-600',
    directorate: 'text-pink-600',
    lab: 'text-red-600',
    center: 'text-orange-600',
    service: 'text-teal-600',
    sector: 'text-cyan-600',
    group: 'text-lime-600'
  };

  useEffect(() => {
    fetchDepartments();
    fetchDepartmentTypes();
    fetchEmployees();
    fetchAccessLevels();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/api/departments/tree');
      setDepartments(response.data);
    } catch (err) {
      console.error('Ошибка загрузки структуры:', err);
      setError('Не удалось загрузить структуру университета');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentTypes = async () => {
    try {
      const response = await api.get('/api/departments/types');
      setDepartmentTypes(response.data.types);
    } catch (err) {
      console.error('Ошибка загрузки типов подразделений:', err);
    }
  };

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
      // Загружаем сотрудников при разворачивании узла
      fetchDepartmentEmployees(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const fetchDepartmentEmployees = async (departmentId) => {
    // Если уже загружены, не загружаем повторно
    if (departmentEmployees[departmentId] || loadingEmployees.has(departmentId)) {
      return;
    }

    setLoadingEmployees(prev => new Set([...prev, departmentId]));

    try {
      const response = await api.get(`/api/departments/${departmentId}/employees`);
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

  const openCreateModal = (parent = null) => {
    setModalMode('create');
    setParentDepartment(parent);
    setSelectedDepartment(null);
    setFormData({
      name: '',
      short_name: '',
      description: '',
      department_type: 'department',
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

  const openEditModal = (department) => {
    setModalMode('edit');
    setSelectedDepartment(department);
    setParentDepartment(null);
    setFormData({
      name: department.name || '',
      short_name: department.short_name || '',
      description: department.description || '',
      department_type: department.department_type || 'department',
      head_name: department.head_name || '',
      head_title: department.head_title || '',
      phone: department.phone || '',
      email: department.email || '',
      website: department.website || '',
      address: department.address || '',
      room_number: department.room_number || '',
      is_active: department.is_active !== false
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDepartment(null);
    setParentDepartment(null);
    setFormData({
      name: '',
      short_name: '',
      description: '',
      department_type: 'department',
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
      const submitData = {
        ...formData,
        parent_id: parentDepartment?.id || null
      };

      if (modalMode === 'create') {
        await api.post('/api/departments', submitData);
      } else {
        await api.put(`/api/departments/${selectedDepartment.id}`, formData);
      }

      await fetchDepartments();
      closeModal();
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setError('Не удалось сохранить подразделение');
    }
  };

  const handleDelete = async (department) => {
    if (!window.confirm(`Вы уверены, что хотите удалить "${department.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/api/departments/${department.id}`);
      await fetchDepartments();
    } catch (err) {
      console.error('Ошибка удаления:', err);
      setError('Не удалось удалить подразделение');
    }
  };

  // Функции для управления доступом к студентам
  const fetchEmployees = async () => {
    try {
      const response = await api.get('/api/users?role=employee');
      setEmployees(response.data.users || []);
    } catch (err) {
      console.error('Ошибка загрузки сотрудников:', err);
    }
  };

  const fetchAccessLevels = async () => {
    try {
      const response = await api.get('/api/student-access/access-levels');
      setAccessLevels(response.data.levels || []);
    } catch (err) {
      console.error('Ошибка загрузки уровней доступа:', err);
    }
  };

  const fetchAccessAssignments = async (departmentId) => {
    try {
      setLoadingAccess(true);
      const response = await api.get(`/api/student-access/assignments?department_id=${departmentId}`);
      setAccessAssignments(response.data);
    } catch (err) {
      console.error('Ошибка загрузки назначений:', err);
    } finally {
      setLoadingAccess(false);
    }
  };

  const openAccessModal = (department) => {
    // Проверяем, что это факультет или кафедра
    if (!['faculty', 'department'].includes(department.department_type)) {
      setError('Доступ к студентам можно назначать только для факультетов и кафедр');
      return;
    }

    setSelectedDepartmentForAccess(department);
    setAccessFormData({
      employee_id: '',
      access_level: 'read',
      notes: ''
    });
    fetchAccessAssignments(department.id);
    setShowAccessModal(true);
  };

  const closeAccessModal = () => {
    setShowAccessModal(false);
    setSelectedDepartmentForAccess(null);
    setAccessAssignments([]);
  };

  const handleAssignAccess = async (e) => {
    e.preventDefault();

    try {
      await api.post('/api/student-access/assign', {
        employee_id: parseInt(accessFormData.employee_id),
        department_id: selectedDepartmentForAccess.id,
        access_level: accessFormData.access_level,
        notes: accessFormData.notes
      });

      await fetchAccessAssignments(selectedDepartmentForAccess.id);
      setAccessFormData({
        employee_id: '',
        access_level: 'read',
        notes: ''
      });
      setError(null);
    } catch (err) {
      console.error('Ошибка назначения доступа:', err);
      setError('Не удалось назначить доступ');
    }
  };

  const handleDeleteAccess = async (assignmentId) => {
    if (!window.confirm('Вы уверены, что хотите удалить это назначение?')) {
      return;
    }

    try {
      await api.delete(`/api/student-access/assignments/${assignmentId}`);
      await fetchAccessAssignments(selectedDepartmentForAccess.id);
      setError(null);
    } catch (err) {
      console.error('Ошибка удаления назначения:', err);
      setError('Не удалось удалить назначение');
    }
  };

  const renderDepartmentNode = (department, level = 0) => {
    const hasChildren = department.children && department.children.length > 0;
    const isExpanded = expandedNodes.has(department.id);
    const Icon = departmentIcons[department.department_type] || UserGroupIcon;
    const colorClass = departmentColors[department.department_type] || 'text-gray-600';

    return (
      <div key={department.id} className="select-none">
        <div 
          className={`flex items-center py-2 px-3 hover:bg-gray-50 rounded-md group transition-colors ${
            level > 0 ? 'ml-' + (level * 6) : ''
          }`}
        >
          {/* Кнопка разворачивания */}
          <div className="w-6 h-6 flex items-center justify-center">
            {hasChildren ? (
              <button
                onClick={() => toggleNode(department.id)}
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

          {/* Иконка типа подразделения */}
          <Icon className={`h-5 w-5 mr-3 ${colorClass}`} />

          {/* Информация о подразделении */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {department.name}
              </h3>
              {department.short_name && (
                <span className="ml-2 text-xs text-gray-500">
                  ({department.short_name})
                </span>
              )}
              {!department.is_active && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Неактивно
                </span>
              )}
            </div>
            {department.head_name && (
              <p className="text-xs text-gray-500 mt-1">
                {department.head_title && `${department.head_title}: `}
                {department.head_name}
              </p>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
            {/* Кнопка управления доступом (только для факультетов и кафедр) */}
            {['faculty', 'department'].includes(department.department_type) && (
              <button
                onClick={() => openAccessModal(department)}
                className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                title="Управление доступом к студентам"
              >
                <ShieldCheckIcon className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => openCreateModal(department)}
              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
              title="Добавить подразделение"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => openEditModal(department)}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Редактировать"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(department)}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Удалить"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Дочерние элементы */}
        {hasChildren && isExpanded && (
          <div className="ml-6 border-l border-gray-200">
            {department.children.map(child => 
              renderDepartmentNode(child, level + 1)
            )}
          </div>
        )}

        {/* Сотрудники подразделения */}
        {isExpanded && (
          <div className="ml-6 mt-2">
            {loadingEmployees.has(department.id) ? (
              <div className="flex items-center text-sm text-gray-500 py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                Загрузка сотрудников...
              </div>
            ) : departmentEmployees[department.id] && departmentEmployees[department.id].length > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center text-xs font-medium text-gray-600 py-1">
                  <UsersIcon className="h-4 w-4 mr-1" />
                  Сотрудники ({departmentEmployees[department.id].length})
                </div>
                {departmentEmployees[department.id].map(employee => (
                  <div key={employee.id} className="flex items-center py-1 px-2 hover:bg-gray-50 rounded text-sm">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-medium text-xs">
                        {employee.first_name?.charAt(0) || employee.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {employee.first_name} {employee.last_name}
                          {employee.middle_name && ` ${employee.middle_name}`}
                        </p>
                        {/* Старое отображение department_role удалено - используйте новую систему assignments */}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 space-x-3">
                        {employee.position && (
                          <span>{employee.position}</span>
                        )}
                        {employee.phone && (
                          <div className="flex items-center">
                            <PhoneIcon className="h-3 w-3 mr-1" />
                            {employee.phone}
                          </div>
                        )}
                        <div className="flex items-center">
                          <EnvelopeIcon className="h-3 w-3 mr-1" />
                          {employee.email}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : departmentEmployees[department.id] && departmentEmployees[department.id].length === 0 ? (
              <div className="text-xs text-gray-500 py-2 pl-5">
                Нет сотрудников в данном подразделении
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Структура университета</h1>
          <p className="mt-1 text-sm text-gray-600">
            Управление подразделениями и организационной структурой
          </p>
        </div>
        <button
          onClick={() => openCreateModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Добавить подразделение
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

      {departments.length === 0 ? (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Структура не создана</h3>
          <p className="mt-1 text-sm text-gray-500">
            Начните с создания корневых подразделений университета
          </p>
          <div className="mt-6">
            <button
              onClick={() => openCreateModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Создать первое подразделение
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-1">
            {departments.map(department => renderDepartmentNode(department))}
          </div>
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
                      {modalMode === 'create' ? 'Создать подразделение' : 'Редактировать подразделение'}
                    </h3>
                    {parentDepartment && (
                      <p className="mt-1 text-sm text-gray-600">
                        Родительское подразделение: {parentDepartment.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Название *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Сокращенное название
                      </label>
                      <input
                        type="text"
                        value={formData.short_name}
                        onChange={(e) => setFormData({...formData, short_name: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Тип подразделения *
                      </label>
                      <select
                        required
                        value={formData.department_type}
                        onChange={(e) => setFormData({...formData, department_type: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                      >
                        {departmentTypes.length === 0 ? (
                          // Показываем дефолтные опции, если типы еще не загружены
                          <>
                            <option value="university">Университет</option>
                            <option value="rectorate">Ректорат</option>
                            <option value="institute">Институт</option>
                            <option value="faculty">Факультет</option>
                            <option value="department">Кафедра</option>
                            <option value="chair">Отдел</option>
                            <option value="management">Управление</option>
                            <option value="directorate">Департамент</option>
                            <option value="lab">Лаборатория</option>
                            <option value="center">Центр</option>
                            <option value="service">Служба</option>
                            <option value="sector">Сектор</option>
                            <option value="group">Группа</option>
                          </>
                        ) : (
                          departmentTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Описание
                      </label>
                      <textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Руководитель
                        </label>
                        <input
                          type="text"
                          value={formData.head_name}
                          onChange={(e) => setFormData({...formData, head_name: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Должность
                        </label>
                        <input
                          type="text"
                          value={formData.head_title}
                          onChange={(e) => setFormData({...formData, head_title: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Телефон
                        </label>
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Веб-сайт
                      </label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Адрес
                        </label>
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Номер аудитории
                        </label>
                        <input
                          type="text"
                          value={formData.room_number}
                          onChange={(e) => setFormData({...formData, room_number: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        Активное подразделение
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {modalMode === 'create' ? 'Создать' : 'Сохранить'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно управления доступом к студентам */}
      {showAccessModal && selectedDepartmentForAccess && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeAccessModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center mb-4">
                  <ShieldCheckIcon className="h-6 w-6 text-purple-600 mr-2" />
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Управление доступом к студентам: {selectedDepartmentForAccess.name}
                  </h3>
                </div>
                
                <p className="text-sm text-gray-600 mb-6">
                  Назначайте сотрудникам доступ к студентам данного {selectedDepartmentForAccess.department_type === 'faculty' ? 'факультета' : 'кафедры'}
                </p>

                {/* Форма назначения доступа */}
                <form onSubmit={handleAssignAccess} className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-md font-medium text-gray-800 mb-3">Назначить доступ сотруднику</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Сотрудник</label>
                      <select
                        value={accessFormData.employee_id}
                        onChange={(e) => setAccessFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                        required
                      >
                        <option value="">Выберите сотрудника</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name} ({emp.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Уровень доступа</label>
                      <select
                        value={accessFormData.access_level}
                        onChange={(e) => setAccessFormData(prev => ({ ...prev, access_level: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      >
                        {accessLevels.map(level => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        <UserPlusIcon className="h-4 w-4 mr-1" />
                        Назначить
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700">Примечание</label>
                    <input
                      type="text"
                      value={accessFormData.notes}
                      onChange={(e) => setAccessFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Дополнительная информация о назначении..."
                    />
                  </div>
                </form>

                {/* Список текущих назначений */}
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                    <EyeIcon className="h-5 w-5 mr-2 text-gray-600" />
                    Текущие назначения доступа
                  </h4>
                  
                  {loadingAccess ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Загрузка назначений...</span>
                    </div>
                  ) : accessAssignments.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">Нет назначений доступа</p>
                      <p className="text-xs text-gray-400">Назначьте первого сотрудника используя форму выше</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {accessAssignments.map(assignment => (
                        <div key={assignment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                              <span className="text-purple-600 font-medium text-sm">
                                {assignment.employee_name.split(' ').map(n => n.charAt(0)).join('')}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{assignment.employee_name}</p>
                              <div className="flex items-center text-sm text-gray-600 space-x-4">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {accessLevels.find(l => l.value === assignment.access_level)?.label || assignment.access_level}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Назначено: {new Date(assignment.assigned_at).toLocaleDateString('ru-RU')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteAccess(assignment.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="Удалить назначение"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={closeAccessModal}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Structure; 