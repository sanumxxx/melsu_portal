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
  ExclamationTriangleIcon,
  LinkIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import PixelCard from './common/PixelCard';
import TelegramLoginWidget from './auth/TelegramLoginWidget';
import VKAuthButton from './auth/VKAuthButton';
import TelegramConnect from './TelegramConnect';
import ChangePassword from './ChangePassword';

const Profile = ({ user }) => {
  const [profileData, setProfileData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [socialConnections, setSocialConnections] = useState({
    vk_connected: false,
    telegram_connected: false,
    vk_id: null,
    telegram_id: null
  });
  const [socialLoading, setSocialLoading] = useState(false);
  const [connectingVk, setConnectingVk] = useState(false);
  const [connectingTelegram, setConnectingTelegram] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchAssignments();
    fetchSocialStatus();
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

  const fetchSocialStatus = async () => {
    try {
      const response = await api.get('/api/oauth/status');
      setSocialConnections(response.data);
    } catch (error) {
      console.error('Ошибка загрузки статуса социальных сетей:', error);
    }
  };

  const handleVkSuccess = async (vkData) => {
    setConnectingVk(true);
    try {
      // Отправляем данные на backend
      await api.post('/api/oauth/vk/connect', {
        access_token: vkData.tokenData.access_token,
        user_id: vkData.tokenData.user_id,
        expires_in: vkData.tokenData.expires_in
      });
      
      await fetchSocialStatus();
      alert('ВКонтакте успешно подключен!');
    } catch (error) {
      console.error('Ошибка подключения ВКонтакте:', error);
      alert(error.response?.data?.detail || 'Ошибка подключения ВКонтакте');
    } finally {
      setConnectingVk(false);
    }
  };

  const handleVkError = (error) => {
    console.error('VK Auth Error:', error);
    alert('Ошибка авторизации ВКонтакте');
    setConnectingVk(false);
  };

  const handleTelegramAuth = async (user) => {
    setConnectingTelegram(true);
    try {
      await api.post('/api/oauth/telegram/connect', user);
      await fetchSocialStatus();
      alert('Telegram успешно подключен!');
    } catch (error) {
      console.error('Ошибка подключения Telegram:', error);
      alert(error.response?.data?.detail || 'Ошибка подключения Telegram');
    } finally {
      setConnectingTelegram(false);
    }
  };

  const disconnectVk = () => {
    showConfirm('Вы уверены, что хотите отключить ВКонтакте?', async () => {
      setSocialLoading(true);
      try {
        await api.delete('/api/oauth/vk/disconnect');
        await fetchSocialStatus();
        alert('ВКонтакте успешно отключен!');
      } catch (error) {
        console.error('Ошибка отключения ВКонтакте:', error);
        alert(error.response?.data?.detail || 'Ошибка отключения ВКонтакте');
      } finally {
        setSocialLoading(false);
      }
    });
  };

  const disconnectTelegram = () => {
    showConfirm('Вы уверены, что хотите отключить Telegram?', async () => {
      setSocialLoading(true);
      try {
        await api.delete('/api/oauth/telegram/disconnect');
        await fetchSocialStatus();
        alert('Telegram успешно отключен!');
      } catch (error) {
        console.error('Ошибка отключения Telegram:', error);
        alert(error.response?.data?.detail || 'Ошибка отключения Telegram');
      } finally {
        setSocialLoading(false);
      }
    });
  };

  const getVkUrl = (vkUserInfo) => {
    if (!vkUserInfo) return null;
    if (vkUserInfo.id) return `https://vk.com/id${vkUserInfo.id}`;
    if (vkUserInfo.domain) return `https://vk.com/${vkUserInfo.domain}`;
    return null;
  };

  const getTelegramUrl = (telegramUserInfo) => {
    if (!telegramUserInfo) return null;
    if (telegramUserInfo.username) return `https://t.me/${telegramUserInfo.username}`;
    return null;
  };

  const showConfirm = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmDialog(false);
    setConfirmAction(null);
    setConfirmMessage('');
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
    setConfirmMessage('');
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
                  <p className="text-gray-900">
                    {profileData.faculty_info ? (
                      <span>
                        {profileData.faculty_info.name}
                        {profileData.faculty_info.short_name && (
                          <span className="text-gray-500 text-sm ml-2">({profileData.faculty_info.short_name})</span>
                        )}
                      </span>
                    ) : (profileData.faculty || 'Не указано')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Кафедра</label>
                  <p className="text-gray-900">
                    {profileData.department_info ? (
                      <span>
                        {profileData.department_info.name}
                        {profileData.department_info.short_name && (
                          <span className="text-gray-500 text-sm ml-2">({profileData.department_info.short_name})</span>
                        )}
                      </span>
                    ) : (profileData.department || 'Не указано')}
                  </p>
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

        {/* Безопасность */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Безопасность
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-900">••••••••</p>
                  <p className="text-xs text-gray-500">Последнее изменение: давно</p>
                </div>
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Изменить
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Социальные сети */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-6 flex items-center">
            <LinkIcon className="w-6 h-6 text-red-600 mr-2" />
            Социальные сети
          </h3>
          
          <div className="space-y-4">
            {/* ВКонтакте */}
            <div className="social-network-card">
              <div className="flex flex-col gap-4">
                {/* Заголовок с иконкой */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21.579 6.855c.14-.465 0-.806-.662-.806h-2.193c-.558 0-.813.295-.953.62 0 0-1.115 2.72-2.693 4.487-.511.512-.744.674-1.023.674-.14 0-.341-.162-.341-.627V6.855c0-.558-.161-.806-.625-.806H9.642c-.348 0-.558.258-.558.504 0 .528.79.65.871 2.138v3.228c0 .708-.127.836-.407.836-.744 0-2.551-2.729-3.624-5.853-.209-.607-.42-.852-.979-.852H2.752c-.627 0-.752.295-.752.62 0 .58.744 3.46 3.461 7.271 1.812 2.601 4.363 4.011 6.687 4.011 1.393 0 1.565-.314 1.565-.853v-1.966c0-.627.132-.752.574-.752.325 0 .882.162 2.182 1.408 1.486 1.486 1.732 2.153 2.567 2.153h2.193c.627 0 .94-.314.759-.931-.196-.615-.899-1.514-1.829-2.576-.512-.604-1.277-1.254-1.51-1.579-.325-.418-.233-.604 0-.976.001-.001 2.672-3.761 2.951-5.040z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">ВКонтакте</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          socialConnections.vk_connected 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {socialConnections.vk_connected ? (
                            <>
                              <CheckBadgeIcon className="w-3 h-3 mr-1" />
                              Подключен
                            </>
                          ) : (
                            'Не подключен'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Информация о пользователе */}
                {socialConnections.vk_connected && socialConnections.vk_user_info && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center gap-2 text-sm">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-900">
                        {socialConnections.vk_user_info.first_name} {socialConnections.vk_user_info.last_name}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Действия */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {socialConnections.vk_connected ? (
                    <>
                      {getVkUrl(socialConnections.vk_user_info) && (
                        <a 
                          href={getVkUrl(socialConnections.vk_user_info)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="social-button primary flex-1 justify-center"
                        >
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Открыть профиль
                        </a>
                      )}
                      <button
                        onClick={disconnectVk}
                        disabled={socialLoading}
                        className="social-button danger flex-1 justify-center"
                        title="Отключить ВКонтакте"
                      >
                        <XMarkIcon className="w-4 h-4 mr-2" />
                        Отключить
                      </button>
                    </>
                  ) : (
                    <div className="w-full flex justify-center">
                      <VKAuthButton
                        onSuccess={handleVkSuccess}
                        onError={handleVkError}
                        disabled={connectingVk}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Telegram */}
            <TelegramConnect />
          </div>
        </div>
      </div>

      {/* Диалог подтверждения */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                Подтверждение действия
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  {confirmMessage}
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  Да
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-24 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно смены пароля */}
      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
};

export default Profile; 