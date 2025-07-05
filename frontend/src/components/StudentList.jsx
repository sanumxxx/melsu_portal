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
  TrophyIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShieldCheckIcon
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
  const [expandedStudent, setExpandedStudent] = useState(null);
  
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'academic_leave': return 'bg-yellow-100 text-yellow-800';
      case 'expelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDepartmentName = (student, type) => {
    if (type === 'faculty') {
      if (student.faculty_info && student.faculty_info.name) {
        return student.faculty_info.name;
      }
      return student.faculty || 'Не указан';
    } else if (type === 'department') {
      if (student.department_info && student.department_info.name) {
        return student.department_info.name;
      }
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
      faculty_filter: '',
      department_filter: '',
      course_filter: ''
    });
    setCurrentPage(1);
  };

  const toggleStudentExpansion = (studentId) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  const renderAccessReasons = (reasons) => {
    if (!reasons || reasons.length === 0) return null;
    
    return (
      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center mb-2">
          <ShieldCheckIcon className="w-4 h-4 text-blue-600 mr-2" />
          <span className="text-sm font-medium text-blue-900">Основания доступа:</span>
        </div>
        <ul className="text-sm text-blue-800 space-y-1">
          {reasons.map((reason, index) => (
            <li key={index} className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              {reason}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderStudentCard = (student) => {
    const isExpanded = expandedStudent === student.id;
    
    return (
      <div key={student.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
        <div 
          className="p-6 cursor-pointer"
          onClick={() => toggleStudentExpansion(student.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {`${student.last_name} ${student.first_name} ${student.middle_name || ''}`.trim()}
                  </h3>
                  {student.academic_status && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(student.academic_status)}`}>
                      {academicStatuses[student.academic_status] || student.academic_status}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                  <div className="flex items-center">
                    <IdentificationIcon className="w-4 h-4 mr-1" />
                    {student.student_id || 'Не указан'}
                  </div>
                  <div className="flex items-center">
                    <AcademicCapIcon className="w-4 h-4 mr-1" />
                    {student.course ? `${student.course} курс` : 'Курс не указан'}
                  </div>
                  <div className="flex items-center">
                    <UserGroupIcon className="w-4 h-4 mr-1" />
                    {student.group_number || 'Группа не указана'}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="text-sm text-gray-500">
                  {getDepartmentName(student, 'faculty')}
                </div>
                <div className="text-xs text-gray-400">
                  {getDepartmentName(student, 'department')}
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
                    <InformationCircleIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Основная информация
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center">
                      <EnvelopeIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Email:</span>
                      <span className="ml-2 text-gray-900">{student.email}</span>
                    </div>
                    {student.phone && (
                      <div className="flex items-center">
                        <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="text-gray-600">Телефон:</span>
                        <span className="ml-2 text-gray-900">{student.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <AcademicCapIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Форма обучения:</span>
                      <span className="ml-2 text-gray-900">
                        {educationForms[student.education_form] || student.education_form || 'Не указана'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Уровень образования:</span>
                      <span className="ml-2 text-gray-900">
                        {educationLevels[student.education_level] || student.education_level || 'Не указан'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Академическая информация */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <AcademicCapIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Академическая информация
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-600">Факультет:</span>
                      <div className="mt-1 p-2 bg-gray-50 rounded">
                        {getDepartmentName(student, 'faculty')}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Кафедра:</span>
                      <div className="mt-1 p-2 bg-gray-50 rounded">
                        {getDepartmentName(student, 'department')}
                      </div>
                    </div>
                    {student.group_info && (
                      <div>
                        <span className="text-gray-600">Группа:</span>
                        <div className="mt-1 p-2 bg-gray-50 rounded">
                          <div className="font-medium">{student.group_info.name}</div>
                          {student.group_info.specialization && (
                            <div className="text-xs text-gray-500 mt-1">
                              {student.group_info.specialization}
                            </div>
                          )}
                          {student.group_info.admission_year && (
                            <div className="text-xs text-gray-500">
                              Год поступления: {student.group_info.admission_year}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Основания доступа */}
              {renderAccessReasons(student.access_reasons)}

              {/* Действия */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/portfolio/${student.id}`);
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <TrophyIcon className="w-4 h-4 mr-2" />
                    Портфолио
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${student.id}`);
                    }}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <EyeIcon className="w-4 h-4 mr-2" />
                    Профиль
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <UserGroupIcon className="w-8 h-8 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Список студентов</h1>
            <p className="text-sm text-gray-600">
              Управление доступными студентами ({totalStudents})
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
              placeholder="Поиск по ФИО, email, номеру студенческого билета..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {showFilters && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Факультет
                  </label>
                  <select
                    value={filters.faculty_filter}
                    onChange={(e) => handleFilterChange('faculty_filter', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
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
                    value={filters.department_filter}
                    onChange={(e) => handleFilterChange('department_filter', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
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
                    value={filters.course_filter}
                    onChange={(e) => handleFilterChange('course_filter', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Все курсы</option>
                    {[1, 2, 3, 4, 5, 6].map(course => (
                      <option key={course} value={course}>
                        {course} курс
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <XMarkIcon className="w-4 h-4 mr-2" />
                  Очистить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Список студентов */}
      {students.length === 0 ? (
        <div className="text-center py-12">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Студенты не найдены</h3>
          <p className="mt-1 text-sm text-gray-500">
            Попробуйте изменить параметры поиска или фильтры
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {students.map(renderStudentCard)}
        </div>
      )}

      {/* Пагинация */}
      {students.length > 0 && renderPagination()}
    </div>
  );
};

export default StudentList; 