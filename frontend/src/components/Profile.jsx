import React, { useState, useEffect } from 'react';
import { 
  UserIcon, 
  CalendarIcon, 
  EnvelopeIcon, 
  CheckBadgeIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  MapPinIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  PhoneIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import PixelCard from './common/PixelCard';

const Profile = ({ user }) => {
  const [profileData, setProfileData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchAssignments();
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/profile/basic');
      setProfileData(response.data);
    } catch (err) {
      setError('Ошибка загрузки профиля');
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      setLoadingAssignments(true);
      
      let userId = null;
      if (user?.id) {
        userId = user.id;
      } else if (user?.user?.id) {
        userId = user.user.id;
      } else if (user?.profile?.id) {
        userId = user.profile.id;
      }
      
      if (!userId) {
        setAssignments([]);
        return;
      }
      
      const response = await api.get(`/api/assignments/users/${userId}`);
      
      let assignmentsData = [];
      if (Array.isArray(response.data)) {
        assignmentsData = response.data;
      } else if (response.data && Array.isArray(response.data.assignments)) {
        assignmentsData = response.data.assignments;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        assignmentsData = response.data.data;
      }
      
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
    } catch (error) {
      console.error('Ошибка загрузки назначений:', error);
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const getRoleText = (userRoles) => {
    if (!userRoles || userRoles.length === 0) return 'Роли не назначены';
    return userRoles.map(role => getRoleDisplayName(role)).join(', ');
  };

  const getRoleDisplayName = (roleName) => {
    const roleDisplayNames = {
      'admin': 'Администратор',
      'teacher': 'Преподаватель',
      'employee': 'Сотрудник',
      'student': 'Студент',
      'schoolchild': 'Школьник'
    };
    return roleDisplayNames[roleName] || roleName;
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString('ru-RU') : renderNotSpecified();
  };

  const renderNotSpecified = () => {
    return (
      <span className="flex items-center text-orange-600">
        <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
        Не указано
      </span>
    );
  };

  const getValueOrNotSpecified = (value) => {
    return value || renderNotSpecified();
  };

  const getFullName = () => {
    return `${profileData.last_name || ''} ${profileData.first_name || ''} ${profileData.middle_name || ''}`.trim() || 'Не указано';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
      {/* Заголовок */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Профиль</h1>
        <p className="text-gray-600 mt-2">Личная информация и назначения</p>
      </div>

      {/* Основная информация */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" />
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{getFullName()}</h2>
            <p className="text-gray-600">{profileData.email || 'Email не указан'}</p>
            <p className="text-sm text-gray-500">{getRoleText(profileData.roles)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
          <div>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{Array.isArray(assignments) ? assignments.length : 0}</div>
            <div className="text-xs sm:text-sm text-gray-500">Назначений</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{profileData.is_verified ? 'Да' : 'Нет'}</div>
            <div className="text-xs sm:text-sm text-gray-500">Email подтвержден</div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className={`text-xl sm:text-2xl font-bold ${profileData.is_active ? 'text-green-600' : 'text-gray-400'}`}>
              {profileData.is_active ? 'Активен' : 'Неактивен'}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">Статус</div>
          </div>
        </div>
      </div>

      {/* Назначения */}
      {loadingAssignments ? (
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BuildingOfficeIcon className="w-5 h-5 text-red-600 mr-2" />
            Назначения в подразделения
          </h3>
          
          {!Array.isArray(assignments) || assignments.length === 0 ? (
            <p className="text-gray-500">Нет назначений в подразделения</p>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
                    <div>
                      <h4 className="font-medium text-gray-900">{assignment.department.name}</h4>
                      <p className="text-gray-600">{assignment.role.display_name}</p>
                      <p className="text-sm text-gray-500">Занятость: {assignment.workload_percentage}%</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {assignment.is_primary && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Основное</span>
                      )}
                      <span className={`px-2 py-1 text-xs rounded ${
                        assignment.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {assignment.is_active ? 'Активно' : 'Неактивно'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Детальная информация */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Личные данные */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <UserIcon className="w-5 h-5 text-red-600 mr-2" />
            Личные данные
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Имя</label>
              <p className="text-gray-900">{getValueOrNotSpecified(profileData.first_name)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Фамилия</label>
              <p className="text-gray-900">{getValueOrNotSpecified(profileData.last_name)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Отчество</label>
              <p className="text-gray-900">{getValueOrNotSpecified(profileData.middle_name)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Дата рождения</label>
              <p className="text-gray-900">{formatDate(profileData.birth_date)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Пол</label>
              <p className="text-gray-900">
                {profileData.gender === 'male' ? 'Мужской' : 
                 profileData.gender === 'female' ? 'Женский' : renderNotSpecified()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Телефон</label>
              {profileData.phone ? (
                <PixelCard variant="black" className="inline-block min-w-24">
                  <p className="pixel-card-content text-gray-900">{profileData.phone}</p>
                </PixelCard>
              ) : (
                <p className="text-gray-900">{renderNotSpecified()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Документы */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <IdentificationIcon className="w-5 h-5 text-red-600 mr-2" />
            Документы
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Серия паспорта</label>
              {profileData.passport_series ? (
                <PixelCard variant="black" className="inline-block min-w-24">
                  <p className="pixel-card-content text-gray-900">{profileData.passport_series}</p>
                </PixelCard>
              ) : (
                <p className="text-gray-900">{renderNotSpecified()}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Номер паспорта</label>
              {profileData.passport_number ? (
                <PixelCard variant="black" className="inline-block min-w-24">
                  <p className="pixel-card-content text-gray-900">{profileData.passport_number}</p>
                </PixelCard>
              ) : (
                <p className="text-gray-900">{renderNotSpecified()}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Дата выдачи паспорта</label>
              <p className="text-gray-900">{formatDate(profileData.passport_issued_date)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Кем выдан</label>
              <p className="text-gray-900">{getValueOrNotSpecified(profileData.passport_issued_by)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">СНИЛС</label>
              {profileData.snils ? (
                <PixelCard variant="black" className="inline-block min-w-24">
                  <p className="pixel-card-content text-gray-900">{profileData.snils}</p>
                </PixelCard>
              ) : (
                <p className="text-gray-900">{renderNotSpecified()}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ИНН</label>
              {profileData.inn ? (
                <PixelCard variant="black" className="inline-block min-w-24">
                  <p className="pixel-card-content text-gray-900">{profileData.inn}</p>
                </PixelCard>
              ) : (
                <p className="text-gray-900">{renderNotSpecified()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Адресная информация */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPinIcon className="w-5 h-5 text-red-600 mr-2" />
            Адресная информация
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Адрес регистрации</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm text-gray-700">Регион</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(profileData.registration_region)}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Город</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(profileData.registration_city)}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Адрес</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(profileData.registration_address)}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Адрес проживания</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm text-gray-700">Регион</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(profileData.residence_region)}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Город</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(profileData.residence_city)}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Адрес</label>
                  <p className="text-gray-900">{getValueOrNotSpecified(profileData.residence_address)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Профессиональная/Академическая информация */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            {(profileData.roles?.includes('student') || profileData.roles?.includes('schoolchild')) ? (
              <AcademicCapIcon className="w-5 h-5 text-red-600 mr-2" />
            ) : (
              <BriefcaseIcon className="w-5 h-5 text-red-600 mr-2" />
            )}
            {(profileData.roles?.includes('student') || profileData.roles?.includes('schoolchild')) 
              ? 'Академическая информация' 
              : 'Профессиональная информация'}
          </h3>
          
          <div className="space-y-3">
            {/* Для студентов */}
            {(profileData.roles?.includes('student') || profileData.roles?.includes('schoolchild')) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Студенческий билет</label>
                  {profileData.student_id ? (
                    <PixelCard variant="black" className="inline-block min-w-24">
                      <p className="pixel-card-content text-gray-900">{profileData.student_id}</p>
                    </PixelCard>
                  ) : (
                    <p className="text-gray-900">Не указано</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Группа</label>
                  <p className="text-gray-900">
                    {profileData.group ? (
                      <span>
                        {profileData.group.name}
                        {profileData.group.specialization && (
                          <span className="text-gray-500 text-sm ml-2">({profileData.group.specialization})</span>
                        )}
                      </span>
                    ) : 'Не указано'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Курс</label>
                  <p className="text-gray-900">{profileData.course || 'Не указано'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Факультет</label>
                  <p className="text-gray-900">{profileData.faculty || 'Не указано'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Кафедра</label>
                  <p className="text-gray-900">{profileData.department || 'Не указано'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Специальность</label>
                  <p className="text-gray-900">{profileData.specialization || 'Не указано'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Форма обучения</label>
                  <p className="text-gray-900">{profileData.education_form || 'Не указано'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата поступления</label>
                  <p className="text-gray-900">{formatDate(profileData.enrollment_date)}</p>
                </div>
              </>
            )}

            {/* Для сотрудников */}
            {(profileData.roles?.includes('teacher') || profileData.roles?.includes('employee') || profileData.roles?.includes('admin')) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Табельный номер</label>
                  {profileData.employee_id ? (
                    <PixelCard variant="black" className="inline-block min-w-24">
                      <p className="pixel-card-content text-gray-900">{profileData.employee_id}</p>
                    </PixelCard>
                  ) : (
                    <p className="text-gray-900">Не указано</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата трудоустройства</label>
                  <p className="text-gray-900">{formatDate(profileData.hire_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Общий стаж работы</label>
                  <p className="text-gray-900">{profileData.work_experience ? `${profileData.work_experience} лет` : 'Не указано'}</p>
                </div>
                {profileData.roles?.includes('teacher') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Педагогический стаж</label>
                      <p className="text-gray-900">{profileData.pedagogical_experience ? `${profileData.pedagogical_experience} лет` : 'Не указано'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ученая степень</label>
                      <p className="text-gray-900">{profileData.education_degree || 'Не указано'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ученое звание</label>
                      <p className="text-gray-900">{profileData.education_title || 'Не указано'}</p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 