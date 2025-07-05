import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserGroupIcon,
  MagnifyingGlassIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  CalendarIcon,
  FunnelIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon,
  WrenchScrewdriverIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';

const StudentList = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [pageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    faculty_filter: '',
    department_filter: '',
    course_filter: ''
  });

  const educationLevels = {
    'bachelor': 'Бакалавриат',
    'master': 'Магистратура',
    'postgraduate': 'Аспирантура',
    'specialist': 'Специалитет'
  };

  const educationForms = {
    'full_time': 'Очная',
    'part_time': 'Заочная',
    'evening': 'Очно-заочная',
    'distance': 'Дистанционная'
  };

  const academicStatuses = {
    'active': 'Активный',
    'academic_leave': 'Академический отпуск',
    'expelled': 'Отчислен'
  };

  // Функция для получения названия факультета/кафедры
  const getDepartmentName = (student, type) => {
    if (type === 'faculty') {
      // Проверяем новое поле faculty_id через связь
      if (student.faculty_info && student.faculty_info.name) {
        return student.faculty_info.name;
      }
      // Fallback на старое текстовое поле
      return student.faculty || 'Не указан';
    } else if (type === 'department') {
      // Проверяем новое поле department_id через связь
      if (student.department_info && student.department_info.name) {
        return student.department_info.name;
      }
      // Fallback на старое текстовое поле
      return student.department || 'Не указана';
    }
    return 'Не указано';
  };

  useEffect(() => {
    loadStudents();
  }, [currentPage, searchQuery, filters]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        size: pageSize,
        ...(searchQuery && { search: searchQuery }),
        ...(filters.faculty_filter && { faculty_filter: filters.faculty_filter }),
        ...(filters.department_filter && { department_filter: filters.department_filter }),
        ...(filters.course_filter && { course_filter: parseInt(filters.course_filter) })
      };

      const response = await api.get('/api/student-access/my-students', { params });
      
      setStudents(response.data.students || []);
      setTotalStudents(response.data.total || 0);
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Ошибка загрузки студентов:', error);
      toast.error('Не удалось загрузить список студентов');
      setStudents([]);
      setTotalStudents(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Сбрасываем на первую страницу при поиске
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    setCurrentPage(1); // Сбрасываем на первую страницу при фильтрации
  };

  const clearFilters = () => {
    setFilters({
      faculty_filter: '',
      department_filter: '',
      course_filter: ''
    });
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalStudents / pageSize);

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
          onClick={() => setCurrentPage(i)}
          className={`px-3 py-2 text-sm font-medium rounded-md ${
            i === currentPage
              ? 'bg-red-600 text-white'
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
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Предыдущая
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
                {Math.min(currentPage * pageSize, totalStudents)}
              </span>{' '}
              из <span className="font-medium">{totalStudents}</span> студентов
            </p>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md disabled:opacity-50"
            >
              ‹
            </button>
            {pages}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Список студентов</h1>
          <p className="text-gray-600 mt-1">
            Студенты, к которым у вас есть доступ ({totalStudents})
          </p>
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <FunnelIcon className="h-4 w-4 mr-2" />
          Фильтры
        </button>
      </div>

      {/* Поиск и фильтры */}
      <div className="bg-white shadow rounded-lg p-4 space-y-4">
        {/* Поиск */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500"
            placeholder="Поиск по имени, email, номеру студенческого билета или группе..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        {/* Фильтры */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Факультет
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                value={filters.faculty_filter}
                onChange={(e) => handleFilterChange('faculty_filter', e.target.value)}
              >
                <option value="">Все факультеты</option>
                {/* Получаем уникальные факультеты из всех источников */}
                {[...new Set([
                  // Из старых текстовых полей
                  ...students.map(s => s.faculty).filter(Boolean),
                  // Из новых связей через faculty_info
                  ...students.map(s => s.faculty_info?.name).filter(Boolean),
                  // Из departments массива (факультеты)
                  ...departments.filter(d => d.department_type === 'faculty').map(d => d.name)
                ])].sort().map(faculty => (
                  <option key={faculty} value={faculty}>{faculty}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Кафедра
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                value={filters.department_filter}
                onChange={(e) => handleFilterChange('department_filter', e.target.value)}
              >
                <option value="">Все кафедры</option>
                {/* Получаем уникальные кафедры из всех источников */}
                {[...new Set([
                  // Из старых текстовых полей
                  ...students.map(s => s.department).filter(Boolean),
                  // Из новых связей через department_info
                  ...students.map(s => s.department_info?.name).filter(Boolean),
                  // Из departments массива (кафедры)
                  ...departments.filter(d => d.department_type === 'department').map(d => d.name)
                ])].sort().map(department => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Курс
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                value={filters.course_filter}
                onChange={(e) => handleFilterChange('course_filter', e.target.value)}
              >
                <option value="">Все курсы</option>
                {[1, 2, 3, 4, 5, 6].map(course => (
                  <option key={course} value={course}>{course} курс</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <XMarkIcon className="h-4 w-4 inline mr-1" />
                Очистить
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Список студентов */}
      <div className="bg-white shadow rounded-lg">
        {students.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchQuery || Object.values(filters).some(f => f) ? 'Студенты не найдены' : 'Нет доступных студентов'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || Object.values(filters).some(f => f)
                ? 'Попробуйте изменить поисковый запрос или фильтры'
                : 'У вас пока нет доступа к студентам'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Студент
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Факультет
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Кафедра
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Группа/Курс
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Образование
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
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <IdentificationIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {student.last_name} {student.first_name} {student.middle_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.email}
                            </div>
                            {student.student_id && (
                              <div className="text-xs text-gray-500">
                                Студ. билет: {student.student_id}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <AcademicCapIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {getDepartmentName(student, 'faculty')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {getDepartmentName(student, 'department')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserGroupIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            <div>
                              {student.group ? (
                                <span>
                                  {student.group.name}
                                  {student.group.specialization && (
                                    <span className="text-gray-500 text-xs ml-1">({student.group.specialization})</span>
                                  )}
                                </span>
                              ) : 'Не указана'}
                            </div>
                            {student.course && (
                              <div className="text-gray-500">{student.course} курс</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div>{educationLevels[student.education_level] || student.education_level || 'Не указан'}</div>
                          <div className="text-gray-500">
                            {educationForms[student.education_form] || student.education_form || 'Не указана'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          student.academic_status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : student.academic_status === 'academic_leave'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {academicStatuses[student.academic_status] || student.academic_status || 'Неизвестен'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/student-portfolio/${student.id}`)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                          title="Посмотреть портфолио студента"
                        >
                          <TrophyIcon className="h-4 w-4 mr-1" />
                          Портфолио
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </>
        )}
      </div>

      {/* Информация о доступных подразделениях */}
      {departments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
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
                  {dept.access_level === 'read' ? (
                    <EyeIcon className="h-3 w-3 inline" />
                  ) : dept.access_level === 'write' ? (
                    <PencilIcon className="h-3 w-3 inline" />
                  ) : (
                    <WrenchScrewdriverIcon className="h-3 w-3 inline" />
                  )}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList; 