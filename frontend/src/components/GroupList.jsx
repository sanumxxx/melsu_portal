import React, { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  FunnelIcon,
  XMarkIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  PencilIcon,
  UsersIcon,
  BookOpenIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

const GroupList = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [expandedGroup, setExpandedGroup] = useState(null);
  
  // Фильтры
  const [filters, setFilters] = useState({
    faculty: '',
    department: '',
    course: '',
    education_level: '',
    education_form: ''
  });

  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const pageSize = 20;

  // Опции для фильтров
  const courseOptions = [
    { value: '', label: 'Все курсы' },
    { value: '1', label: '1 курс' },
    { value: '2', label: '2 курс' },
    { value: '3', label: '3 курс' },
    { value: '4', label: '4 курс' },
    { value: '5', label: '5 курс' },
    { value: '6', label: '6 курс' }
  ];

  const educationLevelOptions = [
    { value: '', label: 'Все уровни' },
    { value: '1', label: 'Бакалавриат' },
    { value: '3', label: 'Магистратура' }
  ];

  const educationFormOptions = [
    { value: '', label: 'Все формы' },
    { value: '1', label: 'Очная' },
    { value: '2', label: 'Очно-заочная' },
    { value: '3', label: 'Заочная' }
  ];

  const educationLevels = {
    'bachelor': 'Бакалавриат',
    'master': 'Магистратура',
    'postgraduate': 'Аспирантура',
    'specialist': 'Специалитет',
    '1': 'Бакалавриат',
    '3': 'Магистратура'
  };

  const educationForms = {
    'full_time': 'Очная',
    'part_time': 'Заочная',
    'evening': 'Очно-заочная',
    'distance': 'Дистанционная',
    '1': 'Очная',
    '2': 'Очно-заочная',
    '3': 'Заочная'
  };

  const getEducationLevelLabel = (level) => {
    return educationLevels[level] || level || 'Не указан';
  };

  const getEducationFormLabel = (form) => {
    return educationForms[form] || form || 'Не указана';
  };

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        size: pageSize.toString()
      });

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(`${key}_filter`, value);
        }
      });

      const response = await api.get(`/api/group-access/my-groups?${params}`);
      
      if (response.data) {
        setGroups(response.data.groups || []);
        setTotalGroups(response.data.total || 0);
        setTotalPages(Math.ceil((response.data.total || 0) / pageSize));
        setDepartments(response.data.departments || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки групп:', err);
      setError('Ошибка загрузки групп');
      setGroups([]);
      setTotalGroups(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, filters]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      faculty: '',
      department: '',
      course: '',
      education_level: '',
      education_form: ''
    });
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const toggleGroupExpansion = (groupId) => {
    setExpandedGroup(expandedGroup === groupId ? null : groupId);
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const renderGroupCard = (group) => {
    const isExpanded = expandedGroup === group.id;
    
    return (
      <div key={group.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
        <div 
          className="p-6 cursor-pointer"
          onClick={() => toggleGroupExpansion(group.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <UserGroupIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {group.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(group.is_active)}`}>
                    {group.is_active ? 'Активная' : 'Неактивная'}
                  </span>
                </div>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                  <div className="flex items-center">
                    <AcademicCapIcon className="w-4 h-4 mr-1" />
                    {group.course ? `${group.course} курс` : 'Курс не указан'}
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    {group.admission_year || 'Год не указан'}
                  </div>
                  <div className="flex items-center">
                    <UsersIcon className="w-4 h-4 mr-1" />
                    {group.student_count || 0} студентов
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="text-sm text-gray-500">
                  {getEducationLevelLabel(group.education_level)}
                </div>
                <div className="text-xs text-gray-400">
                  {getEducationFormLabel(group.education_form)}
                </div>
              </div>
              {isExpanded ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>

          {isExpanded && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Основная информация */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <InformationCircleIcon className="w-5 h-5 mr-2 text-green-600" />
                    Основная информация
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center">
                      <BookOpenIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Название:</span>
                      <span className="ml-2 text-gray-900 font-medium">{group.name}</span>
                    </div>
                    <div className="flex items-center">
                      <AcademicCapIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Курс:</span>
                      <span className="ml-2 text-gray-900">{group.course || 'Не указан'}</span>
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Год поступления:</span>
                      <span className="ml-2 text-gray-900">{group.admission_year || 'Не указан'}</span>
                    </div>
                    <div className="flex items-center">
                      <UsersIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Количество студентов:</span>
                      <span className="ml-2 text-gray-900">{group.student_count || 0}</span>
                    </div>
                    <div className="flex items-center">
                      <AcademicCapIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Уровень образования:</span>
                      <span className="ml-2 text-gray-900">{getEducationLevelLabel(group.education_level)}</span>
                    </div>
                    <div className="flex items-center">
                      <ClockIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Форма обучения:</span>
                      <span className="ml-2 text-gray-900">{getEducationFormLabel(group.education_form)}</span>
                    </div>
                  </div>
                </div>

                {/* Академическая информация */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <BuildingOfficeIcon className="w-5 h-5 mr-2 text-green-600" />
                    Привязка к подразделениям
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-600">Кафедра:</span>
                      <div className="mt-1 p-2 bg-gray-50 rounded">
                        {group.department_name || 'Не указана'}
                      </div>
                    </div>
                    {group.specialization && (
                      <div>
                        <span className="text-gray-600">Специализация:</span>
                        <div className="mt-1 p-2 bg-gray-50 rounded">
                          {group.specialization}
                        </div>
                      </div>
                    )}
                    {group.curator && (
                      <div>
                        <span className="text-gray-600">Куратор:</span>
                        <div className="mt-1 p-2 bg-gray-50 rounded">
                          {group.curator}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Статус:</span>
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(group.is_active)}`}>
                          {group.is_active ? 'Активная группа' : 'Неактивная группа'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Действия */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigate to group details
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <EyeIcon className="w-4 h-4 mr-2" />
                    Студенты
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigate to edit group
                    }}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <PencilIcon className="w-4 h-4 mr-2" />
                    Редактировать
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 text-sm font-medium rounded-md ${
            i === currentPage
              ? 'bg-green-600 text-white'
              : 'text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Предыдущая
          </button>
          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Следующая
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Показано <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> -{' '}
              <span className="font-medium">
                {Math.min(currentPage * pageSize, totalGroups)}
              </span>{' '}
              из <span className="font-medium">{totalGroups}</span> групп
            </p>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md disabled:opacity-50"
            >
              ‹
            </button>
            {pages}
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md disabled:opacity-50"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <UserGroupIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Ошибка загрузки</h3>
        <p className="mt-1 text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={fetchGroups}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <UserGroupIcon className="w-8 h-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Список групп</h1>
            <p className="text-sm text-gray-600">
              Управление доступными группами ({totalGroups})
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <FunnelIcon className="w-4 h-4 mr-2" />
          Фильтры
        </button>
      </div>

      {/* Поиск и фильтры */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col space-y-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию группы, специализации..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {showFilters && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Факультет
                  </label>
                  <select
                    value={filters.faculty}
                    onChange={(e) => handleFilterChange('faculty', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Все факультеты</option>
                    {departments
                      .filter(dept => dept.department_type === 'faculty')
                      .map(dept => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Кафедра
                  </label>
                  <select
                    value={filters.department}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Все кафедры</option>
                    {departments
                      .filter(dept => dept.department_type === 'department')
                      .map(dept => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Курс
                  </label>
                  <select
                    value={filters.course}
                    onChange={(e) => handleFilterChange('course', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  >
                    {courseOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Уровень
                  </label>
                  <select
                    value={filters.education_level}
                    onChange={(e) => handleFilterChange('education_level', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  >
                    {educationLevelOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Форма
                  </label>
                  <select
                    value={filters.education_form}
                    onChange={(e) => handleFilterChange('education_form', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  >
                    {educationFormOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <XMarkIcon className="w-4 h-4 mr-2" />
                  Очистить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Список групп */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Группы не найдены</h3>
          <p className="mt-1 text-sm text-gray-500">
            Попробуйте изменить параметры поиска или фильтры
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(renderGroupCard)}
        </div>
      )}

      {/* Пагинация */}
      {groups.length > 0 && renderPagination()}
    </div>
  );
};

export default GroupList; 