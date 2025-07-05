import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  UserIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import Loader from '../common/Loader';

const StudentsDirectory = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  
  // Фильтры
  const [filters, setFilters] = useState({
    search: '',
    faculty_id: '',
    department_id: '',
    group_id: '',
    course: '',
    education_form: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  
  // Загрузка справочников для фильтров
  const loadReferenceData = async () => {
    try {
      const [facultiesRes, departmentsRes, groupsRes] = await Promise.all([
        api.get('/api/directories/departments?department_type=faculty'),
        api.get('/api/directories/departments?department_type=department'),
        api.get('/api/directories/groups?limit=1000')
      ]);
      
      setFaculties(facultiesRes.data.departments || []);
      setDepartments(departmentsRes.data.departments || []);
      setGroups(groupsRes.data.groups || []);
    } catch (error) {
      console.error('Ошибка загрузки справочников:', error);
    }
  };
  
  // Загрузка студентов
  const loadStudents = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      });
      
      // Добавляем фильтры
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.toString().trim()) {
          params.append(key, value.toString().trim());
        }
      });
      
      const response = await api.get(`/api/directories/students?${params}`);
      const data = response.data;
      
      setStudents(data.students || []);
      setPagination(data.pagination || {});
      
    } catch (error) {
      console.error('Ошибка загрузки студентов:', error);
      setError('Ошибка при загрузке списка студентов');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Обработка поиска
  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
  };
  
  // Обработка фильтров
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // Сброс фильтров
  const resetFilters = () => {
    setFilters({
      search: '',
      faculty_id: '',
      department_id: '',
      group_id: '',
      course: '',
      education_form: ''
    });
  };
  
  // Применение фильтров
  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadStudents(1);
  };
  
  // Загрузка данных при монтировании
  useEffect(() => {
    loadReferenceData();
    loadStudents();
  }, []);
  
  // Обработка изменения поиска с задержкой
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.search !== undefined) {
        applyFilters();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [filters.search]);
  
  // Переход на страницу
  const goToPage = (page) => {
    setPagination(prev => ({ ...prev, page }));
    loadStudents(page);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };
  
  const getEducationFormLabel = (form) => {
    const forms = {
      'full_time': 'Очная',
      'part_time': 'Очно-заочная',
      'correspondence': 'Заочная',
      'distance': 'Дистанционная'
    };
    return forms[form] || form || 'Не указано';
  };
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          <p className="font-medium">Ошибка загрузки</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => loadStudents()}
            className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Заголовок и действия */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900">
            Список студентов
            {pagination.total > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({pagination.total} студентов)
              </span>
            )}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md
              ${showFilters
                ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }
            `}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Фильтры
            {Object.values(filters).some(v => v && v.toString().trim()) && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {Object.values(filters).filter(v => v && v.toString().trim()).length}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Поиск */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleSearch(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500"
          placeholder="Поиск по ФИО, email или номеру студенческого билета..."
        />
      </div>
      
      {/* Панель фильтров */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Факультет */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Факультет
              </label>
              <select
                value={filters.faculty_id}
                onChange={(e) => handleFilterChange('faculty_id', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
              >
                <option value="">Все факультеты</option>
                {faculties.map(faculty => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.short_name || faculty.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Кафедра */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Кафедра
              </label>
              <select
                value={filters.department_id}
                onChange={(e) => handleFilterChange('department_id', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
              >
                <option value="">Все кафедры</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.short_name || dept.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Группа */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Группа
              </label>
              <select
                value={filters.group_id}
                onChange={(e) => handleFilterChange('group_id', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
              >
                <option value="">Все группы</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Курс */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Курс
              </label>
              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
              >
                <option value="">Все курсы</option>
                <option value="1">1 курс</option>
                <option value="2">2 курс</option>
                <option value="3">3 курс</option>
                <option value="4">4 курс</option>
                <option value="5">5 курс</option>
                <option value="6">6 курс</option>
              </select>
            </div>
            
            {/* Форма обучения */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Форма обучения
              </label>
              <select
                value={filters.education_form}
                onChange={(e) => handleFilterChange('education_form', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
              >
                <option value="">Все формы</option>
                <option value="full_time">Очная</option>
                <option value="part_time">Очно-заочная</option>
                <option value="correspondence">Заочная</option>
                <option value="distance">Дистанционная</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={resetFilters}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <XMarkIcon className="h-4 w-4 mr-2" />
              Сбросить
            </button>
            
            <button
              onClick={applyFilters}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Применить фильтры
            </button>
          </div>
        </div>
      )}
      
      {/* Таблица студентов */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-8">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Студенты не найдены</h3>
          <p className="mt-1 text-sm text-gray-500">
            {Object.values(filters).some(v => v && v.toString().trim())
              ? 'Попробуйте изменить параметры поиска'
              : 'В системе пока нет зарегистрированных студентов'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {students.map((student) => (
              <li key={student.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-red-600" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <div className="flex items-center">
                        <Link
                          to={`/student-portfolio/${student.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-red-600 truncate"
                        >
                          {student.last_name} {student.first_name} {student.middle_name}
                        </Link>
                        {!student.is_active && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Неактивен
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <span className="truncate">{student.email}</span>
                        {student.profile?.student_id && (
                          <>
                            <span className="mx-2">•</span>
                            <span>{student.profile.student_id}</span>
                          </>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                        {student.profile?.group_info && (
                          <div className="flex items-center">
                            <UserGroupIcon className="h-3 w-3 mr-1" />
                            {student.profile.group_info.name}
                          </div>
                        )}
                        {student.profile?.faculty_info && (
                          <div className="flex items-center">
                            <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                            {student.profile.faculty_info.short_name || student.profile.faculty_info.name}
                          </div>
                        )}
                        {student.profile?.course && (
                          <div className="flex items-center">
                            <AcademicCapIcon className="h-3 w-3 mr-1" />
                            {student.profile.course} курс
                          </div>
                        )}
                        {student.profile?.education_form && (
                          <div>
                            {getEducationFormLabel(student.profile.education_form)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <span>Регистрация: {formatDate(student.created_at)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Пагинация */}
      {pagination.pages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Предыдущая
            </button>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Следующая
            </button>
          </div>
          
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Показано{' '}
                <span className="font-medium">
                  {((pagination.page - 1) * pagination.limit) + 1}
                </span>
                {' '}-{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>
                {' '}из{' '}
                <span className="font-medium">{pagination.total}</span>
                {' '}результатов
              </p>
            </div>
            
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Предыдущая</span>
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                
                {/* Номера страниц */}
                {[...Array(Math.min(pagination.pages, 7))].map((_, idx) => {
                  let pageNum;
                  if (pagination.pages <= 7) {
                    pageNum = idx + 1;
                  } else if (pagination.page <= 4) {
                    pageNum = idx + 1;
                  } else if (pagination.page >= pagination.pages - 3) {
                    pageNum = pagination.pages - 6 + idx;
                  } else {
                    pageNum = pagination.page - 3 + idx;
                  }
                  
                  const isActive = pageNum === pagination.page;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`
                        relative inline-flex items-center px-4 py-2 border text-sm font-medium
                        ${isActive
                          ? 'z-10 bg-red-50 border-red-500 text-red-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }
                      `}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Следующая</span>
                  <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsDirectory; 