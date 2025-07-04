import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  EyeIcon, 
  XMarkIcon, 
  MagnifyingGlassIcon,
  PhoneIcon,
  DocumentTextIcon,
  HomeIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  BookOpenIcon,
  UserGroupIcon,
  TrophyIcon,
  LightBulbIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import AssignmentManager from './admin/AssignmentManager';
import PixelCard from './common/PixelCard';

// Компонент для отображения "Не указано" с иконкой
const NotSpecified = () => (
  <span className="flex items-center text-orange-600">
    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
    Не указано
  </span>
);

// Компонент для отображения назначений пользователя
const AssignmentsDisplay = ({ userDetails }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userDetails?.user?.id) {
      fetchAssignments();
    }
  }, [userDetails]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/assignments/users/${userDetails.user.id}`);
      setAssignments(response.data.assignments || []);
    } catch (error) {
      console.error('Ошибка загрузки назначений:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
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

  const getDepartmentTypeLabel = (type) => {
    const typeMap = {
      'university': 'Университет',
      'rectorate': 'Ректорат',
      'institute': 'Институт',
      'faculty': 'Факультет',
      'department': 'Кафедра',
      'chair': 'Отдел',
      'management': 'Управление',
      'directorate': 'Департамент',
      'lab': 'Лаборатория',
      'center': 'Центр',
      'service': 'Служба',
      'sector': 'Сектор',
      'group': 'Группа'
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-xl font-semibold text-gray-900 mb-4">Назначения в подразделения</h4>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-xl font-semibold text-gray-900 mb-4">Назначения в подразделения</h4>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BuildingOfficeIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет назначений</h3>
          <p className="text-gray-500">У пользователя нет назначений в подразделения</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h4 className="text-xl font-semibold text-gray-900 mb-4">
        Назначения в подразделения ({assignments.length})
      </h4>
      <div className="space-y-4">
        {assignments.map((assignment) => (
          <div 
            key={assignment.id} 
            className={`border rounded-lg p-4 ${assignment.is_primary ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h5 className="text-lg font-medium text-gray-900">
                    {assignment.department.name}
                  </h5>
                  {assignment.is_primary && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Основное
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    assignment.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {assignment.is_active ? 'Активно' : 'Неактивно'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Должность:</span>
                    <p className="font-medium text-gray-900">{assignment.role.display_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Тип назначения:</span>
                    <p className="font-medium text-gray-900">{getAssignmentTypeLabel(assignment.assignment_type)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Занятость:</span>
                    <p className="font-medium text-gray-900">{assignment.workload_percentage}%</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Период:</span>
                    <p className="font-medium text-gray-900">
                      с {formatDate(assignment.assignment_date)}
                      {assignment.end_date ? ` до ${formatDate(assignment.end_date)}` : ' (постоянно)'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  <span>Тип подразделения: {getDepartmentTypeLabel(assignment.department.department_type)}</span>
                  {assignment.department.short_name && (
                    <span> • Сокращение: {assignment.department.short_name}</span>
                  )}
                </div>
                
                {assignment.notes && (
                  <div className="mt-3">
                    <span className="text-gray-500 text-sm">Заметки:</span>
                    <p className="text-sm text-gray-700 mt-1">{assignment.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Мапинг роутов на роли (вынесен за пределы компонента)
const roleMapping = {
  'all': null,
  'employees': 'employee',
  'teachers': 'teacher',
  'students': 'student',
  'schoolchildren': 'schoolchild'
};

// Вспомогательная функция для форматирования VK ID
const formatVkId = (vkId) => {
  if (!vkId) return '';
  // Если ID уже содержит префикс 'id', оставляем как есть
  if (vkId.startsWith('id')) return vkId;
  // Если это числовой ID, добавляем префикс 'id'
  if (/^\d+$/.test(vkId)) return `id${vkId}`;
  // Если это текстовый ID (screen_name), оставляем как есть
  return vkId;
};

const Users = () => {
  const { type } = useParams(); // all, employees, teachers, students, schoolchildren
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [searchFields, setSearchFields] = useState([]);
  const [selectedField, setSelectedField] = useState('all');
  const [loadingFields, setLoadingFields] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isPaginating, setIsPaginating] = useState(false);
  // Состояния старой системы назначений удалены - используйте AssignmentManager
  const [currentUser, setCurrentUser] = useState(null);
  
  // Состояние для управления назначениями
  const [showAssignmentManager, setShowAssignmentManager] = useState(false);
  const [selectedUserForAssignment, setSelectedUserForAssignment] = useState(null);
  
  // Состояние для управления ролями
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Инициализация параметров из URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const urlSearch = urlParams.get('search') || '';
    const urlField = urlParams.get('field') || 'all';
    const urlPage = parseInt(urlParams.get('page')) || 1;

    if (urlSearch !== searchQuery) setSearchQuery(urlSearch);
    if (urlField !== selectedField) setSelectedField(urlField);
    if (urlPage !== currentPage) setCurrentPage(urlPage);
  }, [location.search]); // Только при изменении URL

  // Обновление URL при изменении параметров
  const updateURL = useCallback((newParams) => {
    const currentParams = new URLSearchParams(location.search);
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all' && value !== 1) {
        currentParams.set(key, value);
      } else {
        currentParams.delete(key);
      }
    });

    const newSearch = currentParams.toString();
    const newPath = location.pathname + (newSearch ? `?${newSearch}` : '');
    
    // Обновляем URL без перезагрузки страницы
    if (newPath !== location.pathname + location.search) {
      navigate(newPath, { replace: true });
    }
  }, [location, navigate]);

  // Заголовки для разных типов
  const titleMapping = {
    'all': 'Все пользователи',
    'employees': 'Сотрудники',
    'teachers': 'Преподаватели',
    'students': 'Студенты',
    'schoolchildren': 'Школьники'
  };





  // Загрузка полей для поиска и текущего пользователя
  useEffect(() => {
    const fetchSearchFields = async () => {
      setLoadingFields(true);
      try {
        const response = await api.get('/api/users/search-fields');
        setSearchFields(response.data.fields || []);
      } catch (err) {
        console.error('❌ Ошибка загрузки полей поиска:', err);
        // В случае ошибки оставляем базовую опцию "Все поля"
        setSearchFields([
          { value: 'all', label: 'Все поля', category: 'system' }
        ]);
      } finally {
        setLoadingFields(false);
      }
    };

    const fetchCurrentUser = async () => {
      try {
        const response = await api.getCurrentUser();
        setCurrentUser(response.data);
      } catch (err) {
        console.error('❌ Ошибка загрузки текущего пользователя:', err);
      }
    };

    fetchSearchFields();
    fetchCurrentUser();
  }, []);

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // Увеличиваем задержку для более стабильной работы

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Основная функция загрузки пользователей
  const fetchUsers = useCallback(async (isNewSearch = false, isPageChange = false) => {
    // Устанавливаем соответствующий индикатор загрузки
    if (isNewSearch) {
      setIsSearching(true);
    } else if (isPageChange) {
      setIsPaginating(true);
    } else {
      setLoading(true);
    }
    
    setError(null);
    
    try {
      const role = roleMapping[type] || null;
      
      // Для студентов проверяем права доступа
      if (type === 'students' && currentUser && !currentUser.is_admin) {
        // Загружаем студентов через систему доступа
        try {
          const accessResponse = await api.get('/api/student-access/my-students');
          setUsers(accessResponse.data.students || []);
          setPagination({
            page: 1,
            limit: accessResponse.data.students.length,
            total: accessResponse.data.students.length,
            pages: 1
          });
          return;
        } catch (accessErr) {
          console.error('❌ Ошибка проверки доступа к студентам:', accessErr);
          // Продолжаем с обычным запросом
        }
      }
      
      const params = { 
        page: currentPage, 
        limit: 20,
        field: selectedField 
      };
      if (role) {
        params.role = role;
      }
      if (debouncedSearchQuery && debouncedSearchQuery.trim()) {
        params.search = debouncedSearchQuery.trim();
      }

      const response = await api.get('/api/users', { params });
      
      setUsers(response.data.users || []);
      setPagination(response.data.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      });
    } catch (err) {
      console.error('❌ Ошибка загрузки пользователей:', err);
      setError('Не удалось загрузить список пользователей');
      setUsers([]);
      setPagination({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      });
    } finally {
      setLoading(false);
      setIsSearching(false);
      setIsPaginating(false);
    }
  }, [type, currentPage, debouncedSearchQuery, selectedField, currentUser]);

  // Эффект для первоначальной загрузки и изменений типа
  useEffect(() => {
    fetchUsers();
  }, [type]);

  // Эффект для поиска
  useEffect(() => {
    if (debouncedSearchQuery !== searchQuery) return; // Избегаем лишних вызовов
    
    // Если это поиск, то сбрасываем на первую страницу
    if (currentPage !== 1 && debouncedSearchQuery) {
      setCurrentPage(1);
      updateURL({ search: debouncedSearchQuery, page: 1, field: selectedField });
    } else {
      updateURL({ search: debouncedSearchQuery, page: currentPage, field: selectedField });
      fetchUsers(true); // isNewSearch = true
    }
  }, [debouncedSearchQuery, selectedField, fetchUsers, currentPage, updateURL]);

  // Эффект для пагинации
  useEffect(() => {
    if (currentPage === 1) return; // Первая страница обрабатывается в других эффектах
    fetchUsers(false, true); // isPageChange = true
  }, [currentPage, fetchUsers]);

  // Сбрасываем страницу на 1 при изменении типа
  useEffect(() => {
    setCurrentPage(1);
  }, [type]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatRoles = (userRoles) => {
    if (!userRoles || userRoles.length === 0) return 'Без роли';
    return userRoles.map(roleName => getRoleDisplayName(roleName)).join(', ');
  };

  const getDepartmentTypeLabel = (type) => {
    const typeMap = {
      'university': 'Университет',
      'rectorate': 'Ректорат',
      'institute': 'Институт',
      'faculty': 'Факультет',
      'department': 'Кафедра',
      'chair': 'Отдел',
      'management': 'Управление',
      'directorate': 'Департамент',
      'lab': 'Лаборатория',
      'center': 'Центр',
      'service': 'Служба',
      'sector': 'Сектор',
      'group': 'Группа'
    };
    
    return typeMap[type] || type;
  };

  const getRoleDisplayName = (roleName) => {
    // Простое отображение ролей без загрузки всех ролей
    const roleDisplayNames = {
      'admin': 'Администратор',
      'manager': 'Менеджер', 
      'employee': 'Сотрудник',
      'student': 'Студент',
      'teacher': 'Преподаватель',
      'guest': 'Гость'
    };
    return roleDisplayNames[roleName] || roleName;
  };

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
    updateURL({ page: newPage, search: searchQuery, field: selectedField });
  }, [updateURL, searchQuery, selectedField]);

  const handleViewUser = useCallback(async (user) => {
    setSelectedUser(user);
    setShowModal(true);
    setLoadingDetails(true);
    setUserDetails(null);

    try {
      const response = await api.get(`/api/users/${user.id}`);
      console.log('📊 Первоначальная загрузка пользователя:', response.data);
      console.log('🏢 Подразделение при загрузке:', response.data.profile?.department);
                      // Старая логика загрузки роли удалена - используйте assignments
      setUserDetails(response.data);
    } catch (err) {
      console.error('Ошибка загрузки данных пользователя:', err);
      // Можно добавить toast уведомление об ошибке
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedUser(null);
    setUserDetails(null);
  }, []);

  // Функции старой системы назначений удалены - используйте AssignmentManager



  // Функции для управления ролями
  const loadAvailableRoles = async () => {
    try {
      setLoadingRoles(true);
      const response = await api.get('/api/roles');
      setAvailableRoles(response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки ролей:', error);
      setAvailableRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleToggleRole = async (userId, roleName, hasRole) => {
    try {
      const action = hasRole ? 'remove' : 'add';
      await api.post(`/api/users/${userId}/roles`, {
        role: roleName,
        action: action
      });
      
      // Обновляем данные пользователя в модальном окне
      if (userDetails && userDetails.user.id === userId) {
        const updatedRoles = hasRole 
          ? userDetails.user.roles.filter(r => r !== roleName)
          : [...userDetails.user.roles, roleName];
        
        setUserDetails({
          ...userDetails,
          user: {
            ...userDetails.user,
            roles: updatedRoles
          }
        });
      }
      
      // Обновляем список пользователей
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? {
                ...user,
                roles: hasRole 
                  ? user.roles.filter(r => r !== roleName)
                  : [...user.roles, roleName]
              }
            : user
        )
      );
      
    } catch (error) {
      console.error('Ошибка при изменении ролей:', error);
      alert('Ошибка при изменении ролей пользователя');
    }
  };

  // Обработка клавиши Escape для закрытия модального окна
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && showModal) {
        closeModal();
      }
    };

    if (showModal) {
      document.addEventListener('keydown', handleEscape);
      // Блокируем скролл body при открытом модальном окне
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showModal, closeModal]);

  const handleSearchChange = useCallback((e) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    // URL будет обновлен через debounced эффект
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setCurrentPage(1);
    updateURL({ search: '', page: 1, field: selectedField });
  }, [updateURL, selectedField]);

  const handleFieldChange = useCallback((e) => {
    const newField = e.target.value;
    setSelectedField(newField);
    setCurrentPage(1);
    updateURL({ field: newField, search: searchQuery, page: 1 });
  }, [updateURL, searchQuery]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Ошибка</h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Прогресс-бар */}
      {(loading || isSearching || isPaginating) && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 z-50">
          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse"></div>
        </div>
      )}
      
      <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              {titleMapping[type] || 'Пользователи'}
              {(loading || isSearching || isPaginating) && (
                <svg className="animate-spin ml-3 h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
            </h1>
            <p className="mt-1 text-sm text-gray-600 flex items-center">
              Найдено пользователей: <span className="font-medium ml-1">{pagination?.total || 0}</span>
              {isSearching && (
                <span className="ml-2 text-blue-600 text-xs">
                  Обновление результатов...
                </span>
              )}
            </p>
          </div>
          {(searchQuery || selectedField !== 'all') && (
            <div className="text-right">
              <p className="text-sm text-gray-500">
                Активные фильтры
              </p>
              <div className="flex items-center space-x-2 mt-1">
                {selectedField !== 'all' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {searchFields.find(f => f.value === selectedField)?.label || selectedField}
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    "{searchQuery}"
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Поисковое поле */}
      <div className="mb-6">
        <div className="flex space-x-4">
          {/* Выпадающий список полей */}
          <div className="flex-shrink-0 w-64">
            <label htmlFor="search-field" className="block text-sm font-medium text-gray-700 mb-1">
              Поле для поиска
            </label>
            <select
              id="search-field"
              value={selectedField}
              onChange={handleFieldChange}
              disabled={loadingFields || isSearching}
              className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm disabled:opacity-50"
            >
              {searchFields.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>

          {/* Поисковое поле */}
          <div className="flex-1">
            <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
              Поисковый запрос
              {isSearching && (
                <span className="ml-2 text-sm text-blue-600">
                  <svg className="inline h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Поиск...
                </span>
              )}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                id="search-input"
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm disabled:opacity-50"
                placeholder={`Поиск по ${searchFields.find(f => f.value === selectedField)?.label?.toLowerCase() || 'полю'}...`}
                value={searchQuery}
                onChange={handleSearchChange}
                disabled={isSearching}
              />
              {searchQuery && !isSearching && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={handleClearSearch}
                  >
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {searchQuery && (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Поиск по запросу: "<span className="font-medium">{searchQuery}</span>" 
              в поле: "<span className="font-medium">{searchFields.find(f => f.value === selectedField)?.label || selectedField}</span>"
            </p>
            {isSearching && (
              <span className="text-sm text-blue-600">Выполняется поиск...</span>
            )}
          </div>
        )}
      </div>

      {/* Содержимое с плавными переходами */}
      <div className="transition-opacity duration-200" style={{ opacity: isSearching ? 0.6 : 1 }}>
        {users.length === 0 && !loading && !isSearching ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Пользователи не найдены</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery ? (
                `По запросу "${searchQuery}" пользователи не найдены.`
              ) : type === 'all' ? (
                'В системе нет зарегистрированных пользователей.'
              ) : (
                `Нет пользователей с выбранной ролью.`
              )}
            </p>
          </div>
        ) : users.length > 0 ? (
        <>
          {/* Таблица пользователей */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {users.map((user) => (
                <li key={user.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12">
                        <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                          <span className="text-red-600 font-medium text-lg">
                            {user.first_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                            {user.middle_name && ` ${user.middle_name}`}
                          </p>
                          {!user.is_active && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Неактивен
                            </span>
                          )}
                          {!user.is_verified && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Не подтвержден
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-gray-500">
                            Роли: {formatRoles(user.roles)}
                          </p>
                          {/* Индикаторы социальных сетей */}
                          {user.social_networks && (
                            <div className="flex space-x-1">
                              {user.social_networks.vk_connected && (
                                <div className="group relative">
                                  <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.029-1.49-1.172-1.744-1.172-.357 0-.458.101-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.101-.491.593-.491h1.744c.441 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.221 0 .322-.101.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.169-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.169.508.271.508.221 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.271.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .763.186.254.796.78 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/>
                                  </svg>
                                                                     <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                     ВКонтакте: {formatVkId(user.social_networks.vk_id)}
                                   </div>
                                </div>
                              )}
                              {user.social_networks.telegram_connected && (
                                <div className="group relative">
                                  <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.58 7.44c-.12.54-.43.67-.87.42l-2.4-1.77-1.16 1.12c-.13.13-.24.24-.49.24l.17-2.43 4.54-4.1c.2-.18-.04-.28-.31-.1L9.39 13.17l-2.27-.71c-.49-.15-.5-.49.1-.73l8.86-3.42c.41-.15.77.1.63.69z"/>
                                  </svg>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    Telegram: @{user.social_networks.telegram_username || 'подключен'}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Зарегистрирован: {formatDate(user.created_at)}
                        </p>
                        {user.birth_date && (
                          <p className="text-xs text-gray-400">
                            Дата рождения: {formatDate(user.birth_date)}
                          </p>
                        )}
                        {user.gender && (
                          <p className="text-xs text-gray-400">
                            Пол: {user.gender === 'male' ? 'Мужской' : 'Женский'}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          disabled={loadingDetails && selectedUser?.id === user.id}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                        >
                          {loadingDetails && selectedUser?.id === user.id ? (
                            <>
                              <svg className="animate-spin h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Загрузка...
                            </>
                          ) : (
                            <>
                              <EyeIcon className="h-4 w-4 mr-1" />
                              Посмотреть
                            </>
                          )}
                        </button>
                        

                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Пагинация */}
          {pagination?.pages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6 rounded-lg shadow">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || isPaginating}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPaginating && currentPage > 1 ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Загрузка...
                    </>
                  ) : (
                    'Предыдущая'
                  )}
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= (pagination?.pages || 1) || isPaginating}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPaginating && currentPage < (pagination?.pages || 1) ? (
                    <>
                      Загрузка...
                      <svg className="animate-spin ml-2 -mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </>
                  ) : (
                    'Следующая'
                  )}
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4">
                  <p className="text-sm text-gray-700">
                    Показано <span className="font-medium">{((currentPage - 1) * (pagination?.limit || 20)) + 1}</span> -{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * (pagination?.limit || 20), pagination?.total || 0)}
                    </span>{' '}
                    из <span className="font-medium">{pagination?.total || 0}</span> результатов
                  </p>
                  {isPaginating && (
                    <span className="text-sm text-blue-600 flex items-center">
                      <svg className="animate-spin -ml-1 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Загрузка страницы...
                    </span>
                  )}
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || isPaginating}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Предыдущая</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {Array.from({ length: Math.min(5, pagination?.pages || 1) }, (_, i) => {
                      const pageNumber = i + 1;
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          disabled={isPaginating}
                          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                            pageNumber === currentPage
                              ? 'bg-red-50 border-red-500 text-red-600'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= (pagination?.pages || 1) || isPaginating}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Следующая</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
        ) : null}
      </div>

      {/* Модальное окно для просмотра данных пользователя */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity duration-300 ease-out" 
              onClick={closeModal}
              aria-hidden="true"
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all duration-300 ease-out sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full animate-in slide-in-from-bottom-4 fade-in">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Информация о пользователе
                  </h3>
                  <button
                    onClick={closeModal}
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {loadingDetails ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                  </div>
                ) : userDetails ? (
                  <div className="space-y-6">
                    {/* Основная информация */}
                    <div className="bg-white shadow rounded-lg p-6">
                      <h4 className="text-xl font-semibold text-gray-900 mb-4">Основная информация</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
                          <p className="text-gray-900">{userDetails.user.first_name || 'Не указано'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Фамилия</label>
                          <p className="text-gray-900">{userDetails.user.last_name || 'Не указано'}</p>
                        </div>
                        {userDetails.user.middle_name && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Отчество</label>
                            <p className="text-gray-900">{userDetails.user.middle_name}</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <p className="text-gray-900">{userDetails.user.email}</p>
                        </div>
                        {userDetails.user.birth_date && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Дата рождения</label>
                            <p className="text-gray-900">{formatDate(userDetails.user.birth_date)}</p>
                          </div>
                        )}
                        {userDetails.user.gender && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Пол</label>
                            <p className="text-gray-900">{userDetails.user.gender === 'male' ? 'Мужской' : 'Женский'}</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Роли</label>
                          <p className="text-gray-900">{formatRoles(userDetails.user.roles)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
                          <div className="flex space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              userDetails.user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {userDetails.user.is_active ? 'Активен' : 'Неактивен'}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              userDetails.user.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {userDetails.user.is_verified ? 'Подтвержден' : 'Не подтвержден'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Дата регистрации</label>
                          <p className="text-gray-900">{formatDate(userDetails.user.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Назначения в подразделения */}
                    <AssignmentsDisplay userDetails={userDetails} />

                    {/* Полная информация профиля */}
                    {userDetails.profile ? (
                      <div className="space-y-6">
                        {/* Контактная информация */}
                        <div className="bg-white shadow rounded-lg p-6">
                          <h4 className="text-xl font-semibold text-gray-900 mb-4">Контактная информация</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                              {userDetails.profile.phone ? (
                                <PixelCard variant="black" className="inline-block min-w-24">
                                  <p className="pixel-card-content text-gray-900">{userDetails.profile.phone}</p>
                                </PixelCard>
                              ) : (
                                <p className="text-gray-900">Не указано</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Дополнительный email</label>
                              <p className="text-gray-900">{userDetails.profile.alternative_email || 'Не указано'}</p>
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Контакт для экстренной связи</label>
                              <p className="text-gray-900">{userDetails.profile.emergency_contact || 'Не указано'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Социальные сети */}
                        <div className="bg-white shadow rounded-lg p-6">
                          <h4 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Социальные сети
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">ВКонтакте</label>
                              {userDetails.profile?.vk_id ? (
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.029-1.49-1.172-1.744-1.172-.357 0-.458.101-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.101-.491.593-.491h1.744c.441 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.221 0 .322-.101.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.169-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.169.508.271.508.221 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.271.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .763.186.254.796.78 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/>
                                  </svg>
                                                                     <a 
                                     href={`https://vk.com/${formatVkId(userDetails.profile.vk_id)}`}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="text-blue-600 hover:text-blue-800 underline"
                                   >
                                     vk.com/{formatVkId(userDetails.profile.vk_id)}
                                   </a>
                                </div>
                              ) : (
                                <div className="flex items-center text-gray-500">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Не подключен
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Telegram</label>
                              {userDetails.profile?.telegram_id ? (
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.58 7.44c-.12.54-.43.67-.87.42l-2.4-1.77-1.16 1.12c-.13.13-.24.24-.49.24l.17-2.43 4.54-4.1c.2-.18-.04-.28-.31-.1L9.39 13.17l-2.27-.71c-.49-.15-.5-.49.1-.73l8.86-3.42c.41-.15.77.1.63.69z"/>
                                  </svg>
                                  <a 
                                    href={`https://t.me/${userDetails.profile.telegram_username || userDetails.profile.telegram_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-700 underline"
                                  >
                                    @{userDetails.profile.telegram_username || userDetails.profile.telegram_id}
                                  </a>
                                </div>
                              ) : (
                                <div className="flex items-center text-gray-500">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Не подключен
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Дополнительная информация о Telegram */}
                          {userDetails.profile?.telegram_user_info && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Информация Telegram:</h5>
                              <div className="text-xs text-gray-600">
                                {(() => {
                                  try {
                                    const telegramInfo = typeof userDetails.profile.telegram_user_info === 'string' 
                                      ? JSON.parse(userDetails.profile.telegram_user_info)
                                      : userDetails.profile.telegram_user_info;
                                    
                                    return (
                                      <div className="space-y-1">
                                        {telegramInfo.first_name && (
                                          <div>Имя: {telegramInfo.first_name}</div>
                                        )}
                                        {telegramInfo.last_name && (
                                          <div>Фамилия: {telegramInfo.last_name}</div>
                                        )}
                                        {telegramInfo.username && (
                                          <div>Username: @{telegramInfo.username}</div>
                                        )}
                                        {telegramInfo.language_code && (
                                          <div>Язык: {telegramInfo.language_code}</div>
                                        )}
                                      </div>
                                    );
                                  } catch (e) {
                                    return <div>Информация недоступна</div>;
                                  }
                                })()}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Документы */}
                        <div className="bg-white shadow rounded-lg p-6">
                          <h4 className="text-xl font-semibold text-gray-900 mb-4">Документы</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Серия паспорта</label>
                              {userDetails.profile.passport_series ? (
                                <PixelCard variant="black" className="inline-block min-w-24">
                                  <p className="pixel-card-content text-gray-900">{userDetails.profile.passport_series}</p>
                                </PixelCard>
                              ) : (
                                <p className="text-gray-900">Не указано</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Номер паспорта</label>
                              {userDetails.profile.passport_number ? (
                                <PixelCard variant="black" className="inline-block min-w-24">
                                  <p className="pixel-card-content text-gray-900">{userDetails.profile.passport_number}</p>
                                </PixelCard>
                              ) : (
                                <p className="text-gray-900">Не указано</p>
                              )}
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Кем выдан паспорт</label>
                              <p className="text-gray-900">{userDetails.profile.passport_issued_by || 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Дата выдачи паспорта</label>
                              <p className="text-gray-900">{userDetails.profile.passport_issued_date ? formatDate(userDetails.profile.passport_issued_date) : 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">СНИЛС</label>
                              {userDetails.profile.snils ? (
                                <PixelCard variant="black" className="inline-block min-w-24">
                                  <p className="pixel-card-content text-gray-900">{userDetails.profile.snils}</p>
                                </PixelCard>
                              ) : (
                                <p className="text-gray-900">Не указано</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">ИНН</label>
                              {userDetails.profile.inn ? (
                                <PixelCard variant="black" className="inline-block min-w-24">
                                  <p className="pixel-card-content text-gray-900">{userDetails.profile.inn}</p>
                                </PixelCard>
                              ) : (
                                <p className="text-gray-900">Не указано</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Адресная информация */}
                        <div className="bg-white shadow rounded-lg p-6">
                          <h4 className="text-xl font-semibold text-gray-900 mb-4">Адресная информация</h4>
                          <div className="space-y-6">
                            <div>
                              <h5 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">Адрес регистрации</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Регион</label>
                                  <p className="text-gray-900">{userDetails.profile.registration_region || 'Не указано'}</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Город</label>
                                  <p className="text-gray-900">{userDetails.profile.registration_city || 'Не указано'}</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Адрес</label>
                                  <p className="text-gray-900">{userDetails.profile.registration_address || 'Не указано'}</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Почтовый индекс</label>
                                  <p className="text-gray-900">{userDetails.profile.registration_postal_code || 'Не указано'}</p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h5 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">Адрес проживания</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Регион</label>
                                  <p className="text-gray-900">{userDetails.profile.residence_region || 'Не указано'}</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Город</label>
                                  <p className="text-gray-900">{userDetails.profile.residence_city || 'Не указано'}</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Адрес</label>
                                  <p className="text-gray-900">{userDetails.profile.residence_address || 'Не указано'}</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Почтовый индекс</label>
                                  <p className="text-gray-900">{userDetails.profile.residence_postal_code || 'Не указано'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Академическая информация */}
                        <div className="bg-white shadow rounded-lg p-6">
                          <h4 className="text-xl font-semibold text-gray-900 mb-4">Академическая информация</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Студенческий билет</label>
                              {userDetails.profile.student_id ? (
                                <PixelCard variant="black" className="inline-block min-w-24">
                                  <p className="pixel-card-content text-gray-900">{userDetails.profile.student_id}</p>
                                </PixelCard>
                              ) : (
                                <p className="text-gray-900">Не указано</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Группа</label>
                              <p className="text-gray-900">
                                {userDetails.profile.group ? (
                                  <span>
                                    {userDetails.profile.group.name}
                                    {userDetails.profile.group.specialization && (
                                      <span className="text-gray-500 text-sm ml-2">({userDetails.profile.group.specialization})</span>
                                    )}
                                  </span>
                                ) : 'Не указано'}
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Курс</label>
                              <p className="text-gray-900">{userDetails.profile.course || 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Семестр</label>
                              <p className="text-gray-900">{userDetails.profile.semester || 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Факультет</label>
                              <p className="text-gray-900">{userDetails.profile.faculty || 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Кафедра/Отделение</label>
                              <p className="text-gray-900">{userDetails.profile.academic_department || 'Не указано'}</p>
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Специализация</label>
                              <p className="text-gray-900">{userDetails.profile.specialization || 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Уровень образования</label>
                              <p className="text-gray-900">{userDetails.profile.education_level || 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Форма обучения</label>
                              <p className="text-gray-900">{userDetails.profile.education_form || 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Тип финансирования</label>
                              <p className="text-gray-900">{userDetails.profile.funding_type || 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Академический статус</label>
                              <p className="text-gray-900">{userDetails.profile.academic_status || 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Дата поступления</label>
                              <p className="text-gray-900">{userDetails.profile.enrollment_date ? formatDate(userDetails.profile.enrollment_date) : 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Дата окончания</label>
                              <p className="text-gray-900">{userDetails.profile.graduation_date ? formatDate(userDetails.profile.graduation_date) : 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Средний балл (GPA)</label>
                              <p className="text-gray-900">{userDetails.profile.gpa || 'Не указано'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Профессиональная информация */}
                        <div className="bg-white shadow rounded-lg p-6">
                          <h4 className="text-xl font-semibold text-gray-900 mb-4">Профессиональная информация</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Табельный номер</label>
                              {userDetails.profile.employee_id ? (
                                <PixelCard variant="black" className="inline-block min-w-24">
                                  <p className="pixel-card-content text-gray-900">{userDetails.profile.employee_id}</p>
                                </PixelCard>
                              ) : (
                                <p className="text-gray-900">Не указано</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Тип трудоустройства</label>
                              <p className="text-gray-900">{userDetails.profile.employment_type || 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">График работы</label>
                              <p className="text-gray-900">{userDetails.profile.work_schedule || 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Дата приема на работу</label>
                              <p className="text-gray-900">{userDetails.profile.hire_date ? formatDate(userDetails.profile.hire_date) : 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Опыт работы (лет)</label>
                              <p className="text-gray-900">{userDetails.profile.work_experience || 'Не указано'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Педагогический опыт (лет)</label>
                              <p className="text-gray-900">{userDetails.profile.pedagogical_experience || 'Не указано'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Дополнительная информация */}
                        <div className="bg-white shadow rounded-lg p-6">
                          <h4 className="text-xl font-semibold text-gray-900 mb-4">Дополнительная информация</h4>
                          <div className="space-y-4">
                            {userDetails.profile.education_degree && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Ученая степень</label>
                                <p className="text-gray-900">{userDetails.profile.education_degree}</p>
                              </div>
                            )}
                            {userDetails.profile.education_title && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Ученое звание</label>
                                <p className="text-gray-900">{userDetails.profile.education_title}</p>
                              </div>
                            )}
                            {userDetails.profile.marital_status && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Семейное положение</label>
                                <p className="text-gray-900">{userDetails.profile.marital_status}</p>
                              </div>
                            )}
                            {(userDetails.profile.children_count !== null && userDetails.profile.children_count !== undefined) && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Количество детей</label>
                                <p className="text-gray-900">{userDetails.profile.children_count}</p>
                              </div>
                            )}
                            {userDetails.profile.social_category && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Социальная категория</label>
                                <p className="text-gray-900">{userDetails.profile.social_category}</p>
                              </div>
                            )}
                            {userDetails.profile.military_service && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Военная служба</label>
                                <p className="text-gray-900">{userDetails.profile.military_service}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-gray-500">Расширенная информация профиля не заполнена</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Не удалось загрузить данные пользователя</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={closeModal}
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Закрыть
                </button>
                {/* Кнопки управления (только для админов) */}
                {userDetails && currentUser && currentUser.roles?.includes('admin') && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUserForRoles({
                          id: userDetails.user.id,
                          name: `${userDetails.user.first_name} ${userDetails.user.last_name}`,
                          roles: userDetails.user.roles || []
                        });
                        setShowRoleManager(true);
                        loadAvailableRoles();
                      }}
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm"
                    >
                      <ShieldCheckIcon className="h-4 w-4 mr-2" />
                      Управлять ролями
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUserForAssignment({
                          id: userDetails.user.id,
                          name: `${userDetails.user.first_name} ${userDetails.user.last_name}`
                        });
                        setShowAssignmentManager(true);
                      }}
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:w-auto sm:text-sm"
                    >
                      <CogIcon className="h-4 w-4 mr-2" />
                      Управлять назначениями
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Менеджер назначений */}
      {showAssignmentManager && selectedUserForAssignment && (
        <AssignmentManager
          userId={selectedUserForAssignment.id}
          userName={selectedUserForAssignment.name}
          onClose={() => {
            setShowAssignmentManager(false);
            setSelectedUserForAssignment(null);
          }}
        />
      )}

      {/* Модальное окно управления ролями */}
      {showRoleManager && selectedUserForRoles && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={() => setShowRoleManager(false)}
            />
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <ShieldCheckIcon className="h-6 w-6 mr-2 text-blue-600" />
                    Управление ролями
                  </h3>
                  <button
                    onClick={() => setShowRoleManager(false)}
                    className="rounded-md text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Пользователь: <span className="font-medium">{selectedUserForRoles.name}</span>
                  </p>
                </div>

                {loadingRoles ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">Доступные роли:</h4>
                    {availableRoles.length > 0 ? (
                      <div className="space-y-2">
                        {availableRoles.map((role) => {
                          const hasRole = selectedUserForRoles.roles.includes(role.name);
                          return (
                            <div key={role.name} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <h5 className="font-medium text-gray-900">{role.display_name}</h5>
                                <p className="text-sm text-gray-500">{role.description}</p>
                              </div>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={hasRole}
                                  onChange={() => handleToggleRole(selectedUserForRoles.id, role.name, hasRole)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                  {hasRole ? 'Убрать' : 'Назначить'}
                                </span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Роли не найдены</p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowRoleManager(false)}
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Готово
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Users; 