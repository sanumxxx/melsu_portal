import React, { useState, useEffect } from 'react';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShieldCheckIcon,
  CalendarIcon,
  IdentificationIcon,
  EyeIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';

const StudentsList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [myAssignments, setMyAssignments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [expandedStudent, setExpandedStudent] = useState(null);

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

  useEffect(() => {
    fetchAccessibleStudents();
    fetchMyAssignments();
  }, []);

  const fetchAccessibleStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/student-access/students/accessible');
      setStudents(response.data);
    } catch (err) {
      setError('Ошибка загрузки списка студентов');
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAssignments = async () => {
    try {
      const response = await api.get('/api/student-access/departments/my-assignments');
      setMyAssignments(response.data);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    }
  };

  const fetchStudentsByDepartment = async (departmentId) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/student-access/students/by-department/${departmentId}`);
      setStudents(response.data);
      setSelectedDepartment(departmentId);
    } catch (err) {
      setError('Ошибка загрузки студентов подразделения');
      console.error('Error fetching students by department:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProfile = async (studentId) => {
    try {
      setLoadingProfile(true);
      const response = await api.get(`/api/student-access/students/${studentId}/profile`);
      setStudentProfile(response.data);
    } catch (err) {
      setError('Ошибка загрузки профиля студента');
      console.error('Error fetching student profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    fetchStudentProfile(student.id);
  };

  const handleBackToList = () => {
    setSelectedStudent(null);
    setStudentProfile(null);
  };

  const handleShowAllStudents = () => {
    setSelectedDepartment(null);
    fetchAccessibleStudents();
  };

  const toggleStudentExpansion = (studentId) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  const filteredStudents = students.filter(student =>
    `${student.last_name || ''} ${student.first_name || ''} ${student.middle_name || ''}`.toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    (student.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getValueOrNotSpecified = (value) => {
    if (value === null || value === undefined || value === '') {
      return 'Не указано';
    }
    return value;
  };

  const getDepartmentName = (student, type) => {
    if (!student) return 'Не указано';
    
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch (error) {
      return 'Не указано';
    }
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
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
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
                    {student.birth_date && (
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="text-gray-600">Дата рождения:</span>
                        <span className="ml-2 text-gray-900">{formatDate(student.birth_date)}</span>
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
                      handleStudentClick(student);
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <EyeIcon className="w-4 h-4 mr-2" />
                    Профиль
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigate to portfolio
                    }}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <TrophyIcon className="w-4 h-4 mr-2" />
                    Портфолио
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Ошибка загрузки</h3>
        <p className="mt-1 text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={fetchAccessibleStudents}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  // Отображение профиля студента
  if (selectedStudent && studentProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToList}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <ChevronRightIcon className="w-5 h-5 mr-1 rotate-180" />
              Назад к списку
            </button>
            <h2 className="text-2xl font-bold text-gray-900">
              Профиль студента
            </h2>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Основная информация */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <UsersIcon className="w-5 h-5 mr-2 text-blue-600" />
                Основная информация
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ФИО</label>
                  <p className="text-gray-900">
                    {`${studentProfile.last_name || ''} ${studentProfile.first_name || ''} ${studentProfile.middle_name || ''}`.trim()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{studentProfile.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Телефон</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(studentProfile.phone)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата рождения</label>
                  <p className="text-gray-900">{formatDate(studentProfile.birth_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Пол</label>
                  <p className="text-gray-900">{studentProfile.gender === 'male' ? 'Мужской' : studentProfile.gender === 'female' ? 'Женский' : getValueOrNotSpecified(studentProfile.gender)}</p>
                </div>
              </div>
            </div>

            {/* Академическая информация */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <AcademicCapIcon className="w-5 h-5 mr-2 text-blue-600" />
                Академическая информация
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Студенческий билет</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(studentProfile.student_id)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Факультет</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(studentProfile.faculty)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Кафедра</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(studentProfile.department)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Группа</label>
                  <div className="text-gray-900">
                    {studentProfile.group ? (
                      <div>
                        <div className="font-medium">{studentProfile.group.name}</div>
                        {studentProfile.group.specialization && (
                          <div className="text-sm text-gray-600">{studentProfile.group.specialization}</div>
                        )}
                      </div>
                    ) : 'Не указана'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Курс</label>
                  <p className="text-gray-900">{studentProfile.course ? `${studentProfile.course} курс` : 'Не указан'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Семестр</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(studentProfile.semester)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Специализация</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(studentProfile.specialization)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Уровень образования</label>
                  <p className="text-gray-900">{educationLevels[studentProfile.education_level] || getValueOrNotSpecified(studentProfile.education_level)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Форма обучения</label>
                  <p className="text-gray-900">{educationForms[studentProfile.education_form] || getValueOrNotSpecified(studentProfile.education_form)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <UsersIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Студенты (Админ)</h1>
            <p className="text-sm text-gray-600">
              Управление всеми доступными студентами ({filteredStudents.length})
            </p>
          </div>
        </div>
      </div>

      {/* Фильтры по подразделениям */}
      {myAssignments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Фильтр по подразделениям</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleShowAllStudents}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                selectedDepartment === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Все студенты
            </button>
            {myAssignments.map((assignment) => (
              <button
                key={assignment.id}
                onClick={() => fetchStudentsByDepartment(assignment.department_id)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  selectedDepartment === assignment.department_id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {assignment.department_name}
                <span className="ml-1 text-xs opacity-75">
                  ({assignment.department_type === 'faculty' ? 'Факультет' : 'Кафедра'})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Поиск */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по ФИО или email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Список студентов */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-12">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Студенты не найдены</h3>
          <p className="mt-1 text-sm text-gray-500">
            Попробуйте изменить параметры поиска или фильтры
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStudents.map(renderStudentCard)}
        </div>
      )}

      {/* Информация о назначениях */}
      {myAssignments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-blue-900 mb-3">
            Ваши назначения в подразделениях:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-white p-3 rounded-lg border border-blue-200"
              >
                <div className="font-medium text-blue-900">
                  {assignment.department_name}
                </div>
                <div className="text-sm text-blue-700">
                  {assignment.department_type === 'faculty' ? 'Факультет' : 'Кафедра'}
                </div>
                <div className="text-xs text-blue-600">
                  Роль: {assignment.role_name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsList; 