import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  ArrowLeftIcon,
  DocumentIcon, 
  CalendarIcon, 
  TrophyIcon,
  AcademicCapIcon,
  StarIcon,
  PaperClipIcon,
  EyeIcon,
  UserIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  IdentificationIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

const StudentPortfolio = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  
  const [achievements, setAchievements] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [error, setError] = useState('');

  // Категории достижений
  const categories = [
    { id: 'all', name: 'Все', icon: StarIcon, color: 'text-gray-500' },
    { id: 'academic', name: 'Академические', icon: AcademicCapIcon, color: 'text-blue-500' },
    { id: 'sports', name: 'Спортивные', icon: TrophyIcon, color: 'text-green-500' },
    { id: 'creative', name: 'Творческие', icon: StarIcon, color: 'text-purple-500' },
    { id: 'volunteer', name: 'Волонтерские', icon: StarIcon, color: 'text-red-500' },
    { id: 'professional', name: 'Профессиональные', icon: DocumentIcon, color: 'text-indigo-500' }
  ];

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

  useEffect(() => {
    if (studentId) {
      loadData();
    }
  }, [studentId, selectedCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Загружаем данные параллельно
      const [infoResponse, statsResponse, achievementsResponse] = await Promise.all([
        api.get(`/api/portfolio/student/${studentId}/info`),
        api.get(`/api/portfolio/student/${studentId}/stats`),
        api.get(`/api/portfolio/student/${studentId}/achievements`, {
          params: selectedCategory !== 'all' ? { category: selectedCategory } : {}
        })
      ]);
      
      setStudentInfo(infoResponse.data);
      setStats(statsResponse.data);
      setAchievements(achievementsResponse.data);
      
    } catch (error) {
      console.error('Ошибка загрузки данных портфолио:', error);
      if (error.response?.status === 403) {
        setError('У вас нет доступа к портфолио этого студента');
      } else if (error.response?.status === 404) {
        setError('Студент не найден');
      } else {
        setError('Ошибка загрузки портфолио студента');
      }
      toast.error('Не удалось загрузить портфолио студента');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = (categoryId) => {
    return categories.find(cat => cat.id === categoryId) || categories[0];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указана';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const downloadFile = async (achievementId, fileId, filename) => {
    try {
      // Используем стандартный endpoint для загрузки файлов
      const response = await api.get(`/uploads/portfolio/${filename}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка скачивания файла:', error);
      toast.error('Не удалось скачать файл');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Кнопка "Назад" */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Назад к списку студентов
        </button>
      </div>

      {/* Информация о студенте */}
      {studentInfo && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-8 h-8 text-red-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {studentInfo.last_name} {studentInfo.first_name} {studentInfo.middle_name}
              </h1>
              <p className="text-gray-600">{studentInfo.email}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {studentInfo.profile?.student_id && (
                  <div className="flex items-center text-sm text-gray-700">
                    <IdentificationIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span>{studentInfo.profile.student_id}</span>
                  </div>
                )}
                
                {studentInfo.profile?.faculty && (
                  <div className="flex items-center text-sm text-gray-700">
                    <AcademicCapIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span>
                      {typeof studentInfo.profile.faculty === 'object' && studentInfo.profile.faculty?.name 
                        ? studentInfo.profile.faculty.name 
                        : studentInfo.profile.faculty
                      }
                    </span>
                  </div>
                )}
                
                {studentInfo.profile?.department && (
                  <div className="flex items-center text-sm text-gray-700">
                    <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span>
                      {typeof studentInfo.profile.department === 'object' && studentInfo.profile.department?.name 
                        ? studentInfo.profile.department.name 
                        : studentInfo.profile.department
                      }
                    </span>
                  </div>
                )}
                
                {studentInfo.profile?.group && (
                  <div className="flex items-center text-sm text-gray-700">
                    <UserGroupIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span>
                      {studentInfo.profile.group.name}
                      {studentInfo.profile.course && ` (${studentInfo.profile.course} курс)`}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {studentInfo.profile?.education_level && (
                  <div className="text-sm">
                    <span className="text-gray-500">Уровень образования:</span>
                    <br />
                    <span className="font-medium">
                      {educationLevels[studentInfo.profile.education_level] || studentInfo.profile.education_level}
                    </span>
                  </div>
                )}
                
                {studentInfo.profile?.education_form && (
                  <div className="text-sm">
                    <span className="text-gray-500">Форма обучения:</span>
                    <br />
                    <span className="font-medium">
                      {educationForms[studentInfo.profile.education_form] || studentInfo.profile.education_form}
                    </span>
                  </div>
                )}
                
                {studentInfo.profile?.academic_status && (
                  <div className="text-sm">
                    <span className="text-gray-500">Статус:</span>
                    <br />
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      studentInfo.profile.academic_status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : studentInfo.profile.academic_status === 'academic_leave'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {academicStatuses[studentInfo.profile.academic_status] || studentInfo.profile.academic_status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Статистика */}
      {stats && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Статистика портфолио</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.total_achievements}</div>
              <div className="text-sm text-gray-500">Всего достижений</div>
            </div>
            
            {categories.slice(1).map((category) => {
              const count = stats.achievements_by_category[category.id] || 0;
              const IconComponent = category.icon;
              return (
                <div key={category.id} className="text-center">
                  <div className={`text-2xl font-bold ${category.color}`}>{count}</div>
                  <div className="text-xs text-gray-500 flex items-center justify-center">
                    <IconComponent className="h-3 w-3 mr-1" />
                    {category.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Портфолио */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        {/* Заголовок с фильтрами */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Портфолио достижений</h2>
            
            {/* Фильтр по категориям */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const IconComponent = category.icon;
                const isActive = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`inline-flex items-center px-3 py-2 rounded-full text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    <IconComponent className={`h-3 w-3 mr-1 ${isActive ? category.color : 'text-gray-500'}`} />
                    {category.name}
                    {stats && stats.achievements_by_category[category.id] > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-white rounded-full">
                        {category.id === 'all' ? stats.total_achievements : stats.achievements_by_category[category.id]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Список достижений */}
        <div className="p-6">
          {achievements.length === 0 ? (
            <div className="text-center py-12">
              <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {selectedCategory === 'all' ? 'Нет достижений' : 'Нет достижений в этой категории'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Достижения студента будут отображаться здесь
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {achievements.map((achievement) => {
                const categoryInfo = getCategoryInfo(achievement.category);
                const IconComponent = categoryInfo.icon;
                
                return (
                  <div key={achievement.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <IconComponent className={`h-5 w-5 mr-2 ${categoryInfo.color}`} />
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            achievement.category === 'academic' ? 'bg-blue-100 text-blue-800' :
                            achievement.category === 'sports' ? 'bg-green-100 text-green-800' :
                            achievement.category === 'creative' ? 'bg-purple-100 text-purple-800' :
                            achievement.category === 'volunteer' ? 'bg-red-100 text-red-800' :
                            achievement.category === 'professional' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {categoryInfo.name}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{achievement.title}</h3>
                        
                        {achievement.description && (
                          <p className="text-gray-700 mb-3">{achievement.description}</p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {formatDate(achievement.achievement_date)}
                          </div>
                          {achievement.organization && (
                            <div className="flex items-center">
                              <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                              {achievement.organization}
                            </div>
                          )}
                        </div>
                        
                        {/* Файлы */}
                        {achievement.files && achievement.files.length > 0 && (
                          <div className="mt-3">
                            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                              <PaperClipIcon className="h-4 w-4 mr-1" />
                              Прикрепленные файлы:
                            </h4>
                            <div className="space-y-1">
                              {achievement.files.map((file) => (
                                <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                  <div className="flex items-center min-w-0 flex-1">
                                    <DocumentIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                                    <span className="text-sm text-gray-700 truncate">
                                      {file.original_filename}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({Math.round(file.file_size / 1024)} KB)
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => downloadFile(achievement.id, file.id, file.filename)}
                                    className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Скачать файл"
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPortfolio; 