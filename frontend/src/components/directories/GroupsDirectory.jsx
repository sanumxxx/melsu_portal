import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import Loader from '../common/Loader';

const GroupsDirectory = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupStudents, setGroupStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  
  // Фильтры
  const [filters, setFilters] = useState({
    search: '',
    department_id: '',
    course: '',
    education_form: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [departments, setDepartments] = useState([]);
  
  // Загрузка справочников для фильтров
  const loadReferenceData = async () => {
    try {
      const departmentsRes = await api.get('/api/directories/departments');
      setDepartments(departmentsRes.data.departments || []);
    } catch (error) {
      console.error('Ошибка загрузки справочников:', error);
    }
  };
  
  // Загрузка групп
  const loadGroups = async (page = 1) => {
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
      
      const response = await api.get(`/api/directories/groups?${params}`);
      const data = response.data;
      
      setGroups(data.groups || []);
      setPagination(data.pagination || {});
      
    } catch (error) {
      console.error('Ошибка загрузки групп:', error);
      setError('Ошибка при загрузке списка групп');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Загрузка студентов группы
  const loadGroupStudents = async (groupId) => {
    try {
      setLoadingStudents(true);
      const response = await api.get(`/api/directories/groups/${groupId}`);
      setGroupStudents(response.data.students || []);
    } catch (error) {
      console.error('Ошибка загрузки студентов группы:', error);
      setGroupStudents([]);
    } finally {
      setLoadingStudents(false);
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
      department_id: '',
      course: '',
      education_form: ''
    });
  };
  
  // Применение фильтров
  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadGroups(1);
  };
  
  // Просмотр группы
  const viewGroup = (group) => {
    setSelectedGroup(group);
    loadGroupStudents(group.id);
  };
  
  // Закрытие модального окна
  const closeModal = () => {
    setSelectedGroup(null);
    setGroupStudents([]);
  };
  
  // Загрузка данных при монтировании
  useEffect(() => {
    loadReferenceData();
    loadGroups();
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
    loadGroups(page);
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
  
  const getEducationLevelLabel = (level) => {
    const levels = {
      'bachelor': 'Бакалавриат',
      'master': 'Магистратура',
      'specialist': 'Специалитет',
      'postgraduate': 'Аспирантура'
    };
    return levels[level] || level || 'Не указано';
  };
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          <p className="font-medium">Ошибка загрузки</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => loadGroups()}
            className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="space-y-6">
        {/* Заголовок и действия */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Список групп
              {pagination.total > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  ({pagination.total} групп)
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
            placeholder="Поиск по названию группы или специализации..."
          />
        </div>
        
        {/* Панель фильтров */}
        {showFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Подразделение */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Подразделение
                </label>
                <select
                  value={filters.department_id}
                  onChange={(e) => handleFilterChange('department_id', e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                >
                  <option value="">Все подразделения</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.short_name || dept.name}
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
        
        {/* Список групп */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Группы не найдены</h3>
            <p className="mt-1 text-sm text-gray-500">
              {Object.values(filters).some(v => v && v.toString().trim())
                ? 'Попробуйте изменить параметры поиска'
                : 'В системе пока нет зарегистрированных групп'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UserGroupIcon className="h-8 w-8 text-red-600" />
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {group.name}
                      </h3>
                      {group.specialization && (
                        <p className="text-sm text-gray-500 truncate">
                          {group.specialization}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <AcademicCapIcon className="h-4 w-4 mr-2" />
                      <span>
                        {group.course ? `${group.course} курс` : 'Курс не указан'}
                        {group.education_level && (
                          <span className="ml-2">
                            • {getEducationLevelLabel(group.education_level)}
                          </span>
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <UsersIcon className="h-4 w-4 mr-2" />
                      <span>
                        {group.students_count} студентов
                      </span>
                    </div>
                    
                    {group.department_info && (
                      <div className="flex items-center text-sm text-gray-500">
                        <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                        <span className="truncate">
                          {group.department_info.short_name || group.department_info.name}
                        </span>
                      </div>
                    )}
                    
                    {group.education_form && (
                      <div className="text-sm text-gray-500">
                        {getEducationFormLabel(group.education_form)}
                      </div>
                    )}
                    
                    {group.admission_year && (
                      <div className="text-sm text-gray-500">
                        Год поступления: {group.admission_year}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <button
                      onClick={() => viewGroup(group)}
                      className="w-full inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      Просмотреть студентов
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
      
      {/* Модальное окно с информацией о группе */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Информация о группе {selectedGroup.name}
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Основная информация */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Специализация:</span>
                        <p className="text-gray-900">{selectedGroup.specialization || 'Не указано'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Курс:</span>
                        <p className="text-gray-900">{selectedGroup.course || 'Не указан'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Форма обучения:</span>
                        <p className="text-gray-900">{getEducationFormLabel(selectedGroup.education_form)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Уровень образования:</span>
                        <p className="text-gray-900">{getEducationLevelLabel(selectedGroup.education_level)}</p>
                      </div>
                      {selectedGroup.admission_year && (
                        <div>
                          <span className="font-medium text-gray-700">Год поступления:</span>
                          <p className="text-gray-900">{selectedGroup.admission_year}</p>
                        </div>
                      )}
                      {selectedGroup.department_info && (
                        <div>
                          <span className="font-medium text-gray-700">Подразделение:</span>
                          <p className="text-gray-900">{selectedGroup.department_info.name}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Список студентов */}
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">
                        Студенты группы ({selectedGroup.students_count})
                      </h4>
                      
                      {loadingStudents ? (
                        <div className="flex justify-center py-4">
                          <Loader />
                        </div>
                      ) : groupStudents.length === 0 ? (
                        <p className="text-gray-500 text-sm">В группе пока нет студентов</p>
                      ) : (
                        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                          <ul className="divide-y divide-gray-200">
                            {groupStudents.map((student) => (
                              <li key={student.id} className="px-3 py-2 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {student.last_name} {student.first_name} {student.middle_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {student.email}
                                      {student.student_id && (
                                        <span className="ml-2">• {student.student_id}</span>
                                      )}
                                    </p>
                                  </div>
                                  {!student.is_active && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      Неактивен
                                    </span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={closeModal}
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GroupsDirectory; 