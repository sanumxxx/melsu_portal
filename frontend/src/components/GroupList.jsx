import React, { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

const GroupList = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [departments, setDepartments] = useState([]);
  
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
  const pageSize = 10;

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

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchGroups();
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

  const getEducationLevelLabel = (level) => {
    const levelMap = {
      // Числовые коды (для фильтров)
      '1': 'Бакалавриат',
      '3': 'Магистратура',
      // Строковые значения (из API)
      'bachelor': 'Бакалавриат',
      'master': 'Магистратура'
    };
    return levelMap[level] || level;
  };

  const getEducationFormLabel = (form) => {
    const formMap = {
      // Числовые коды (для фильтров)
      '1': 'Очная',
      '2': 'Очно-заочная', 
      '3': 'Заочная',
      // Строковые значения (из API)
      'full_time': 'Очная',
      'evening': 'Очно-заочная',
      'part_time': 'Заочная'
    };
    return formMap[form] || form;
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
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-700">
          Показано {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalGroups)} из {totalGroups} групп
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          
          {pages.map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                page === currentPage
                  ? 'bg-red-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Заголовок */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Список групп</h1>
            <p className="text-gray-600 mt-1">Группы, к которым у вас есть доступ ({totalGroups})</p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
            Фильтры
          </button>
        </div>
      </div>

      {/* Поиск */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию группы или специализации..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </form>
      </div>

      {/* Фильтры */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Факультет</label>
              <select
                value={filters.faculty}
                onChange={(e) => handleFilterChange('faculty', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Все факультеты</option>
                {departments
                  .filter(dept => dept.department_type === 'faculty')
                  .map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Кафедра</label>
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Все кафедры</option>
                {departments
                  .filter(dept => dept.department_type === 'department')
                  .map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Курс</label>
              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
              >
                {courseOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Уровень образования</label>
              <select
                value={filters.education_level}
                onChange={(e) => handleFilterChange('education_level', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
              >
                {educationLevelOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Форма обучения</label>
              <select
                value={filters.education_form}
                onChange={(e) => handleFilterChange('education_form', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
              >
                {educationFormOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Очистить фильтры
            </button>
          </div>
        </div>
      )}

      {/* Сообщение об ошибке */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Таблица групп */}
      {groups.length > 0 ? (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Группа
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Факультет
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Кафедра
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Курс/Год набора
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Образование
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Специализация
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserGroupIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{group.name}</div>
                          <div className="text-sm text-gray-500">ID: {group.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <AcademicCapIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {group.faculty_name || 'Не указан'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {group.department_name || 'Не указана'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">
                          <div>{group.course ? `${group.course} курс` : 'Не определен'}</div>
                          {group.admission_year && (
                            <div className="text-gray-500">Набор {group.admission_year}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>
                          {group.education_level ? getEducationLevelLabel(group.education_level) : 'Не указан'}
                        </div>
                        <div className="text-gray-500">
                          {group.education_form ? getEducationFormLabel(group.education_form) : 'Не указана'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {group.specialization || 'Не указана'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination()}
        </>
      ) : (
        <div className="text-center py-12">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Нет доступных групп</h3>
          <p className="mt-1 text-sm text-gray-500">
            У вас пока нет доступа к группам
          </p>
        </div>
      )}

      {/* Информация о доступных подразделениях */}
      {departments.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            Ваш доступ к подразделениям:
          </h3>
          <div className="flex flex-wrap gap-2">
            {departments.map((dept) => (
              <span
                key={dept.id}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {dept.name} ({dept.department_type === 'faculty' ? 'Факультет' : 'Кафедра'})
                <span className="ml-1 text-blue-600">
                  {dept.access_level === 'read' ? '👁️' : dept.access_level === 'write' ? '✏️' : '🔧'}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupList; 