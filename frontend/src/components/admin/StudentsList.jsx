import React, { useState, useEffect } from 'react';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon
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

  useEffect(() => {
    fetchAccessibleStudents();
    fetchMyAssignments();
  }, []);

  const fetchAccessibleStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/students/accessible');
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
      const response = await api.get('/api/departments/my-assignments');
      setMyAssignments(response.data);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    }
  };

  const fetchStudentsByDepartment = async (departmentId) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/students/by-department/${departmentId}`);
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
      const response = await api.get(`/api/students/${studentId}/profile`);
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

  const filteredStudents = students.filter(student =>
    `${student.last_name || ''} ${student.first_name || ''} ${student.middle_name || ''}`.toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    (student.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getValueOrNotSpecified = (value) => {
    return value || (
      <span className="flex items-center text-orange-600 text-sm">
        <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
        Не указано
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchAccessibleStudents}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
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
              </div>
            </div>

            {/* Академическая информация */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <AcademicCapIcon className="w-5 h-5 mr-2 text-green-600" />
                Академическая информация
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Студенческий билет</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(studentProfile.student_id)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Группа</label>
                  <p className="text-gray-900">
                    {studentProfile.group ? (
                      <span>
                        {studentProfile.group.name}
                        {studentProfile.group.specialization && (
                          <span className="text-gray-500 text-sm ml-2">
                            ({studentProfile.group.specialization})
                          </span>
                        )}
                      </span>
                    ) : getValueOrNotSpecified(null)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Курс</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(studentProfile.course)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Семестр</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(studentProfile.semester)}</p>
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
                  <label className="block text-sm font-medium text-gray-700">Специальность</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(studentProfile.specialization)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Форма обучения</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(studentProfile.education_form)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Тип финансирования</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(studentProfile.funding_type)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата поступления</label>
                  <p className="text-gray-900">{formatDate(studentProfile.enrollment_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Средний балл</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(studentProfile.gpa)}</p>
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Студенты</h2>
      </div>

      {/* Фильтры по подразделениям */}
      {myAssignments.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Фильтр по подразделениям
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleShowAllStudents}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedDepartment === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Все студенты
            </button>
            {myAssignments.map(assignment => (
              <button
                key={assignment.id}
                onClick={() => fetchStudentsByDepartment(assignment.department_id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedDepartment === assignment.department_id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {assignment.department_name}
                <span className="ml-2 text-xs opacity-75">
                  ({assignment.role_name})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Поиск */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Поиск по ФИО или email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Список студентов */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Найдено студентов: {filteredStudents.length}
          </h3>
        </div>
        
        {filteredStudents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <UsersIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Студенты не найдены</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredStudents.map(student => (
              <div
                key={student.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleStudentClick(student)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {student.first_name?.charAt(0) || '?'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-lg font-medium text-gray-900">
                          {`${student.last_name || ''} ${student.first_name || ''} ${student.middle_name || ''}`.trim()}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-500">{student.email}</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentsList; 