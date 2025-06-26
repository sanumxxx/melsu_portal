import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  DocumentIcon, 
  CalendarIcon, 
  TrophyIcon,
  AcademicCapIcon,
  StarIcon,
  PencilIcon,
  TrashIcon,
  PaperClipIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const Portfolio = () => {
  const [achievements, setAchievements] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newAchievement, setNewAchievement] = useState({
    title: '',
    description: '',
    category: 'academic',
    date: '',
    organization: '',
    files: []
  });

  // Категории достижений
  const categories = [
    { id: 'all', name: 'Все', icon: StarIcon, color: 'text-gray-500' },
    { id: 'academic', name: 'Академические', icon: AcademicCapIcon, color: 'text-blue-500' },
    { id: 'sports', name: 'Спортивные', icon: TrophyIcon, color: 'text-green-500' },
    { id: 'creative', name: 'Творческие', icon: StarIcon, color: 'text-purple-500' },
    { id: 'volunteer', name: 'Волонтерские', icon: StarIcon, color: 'text-red-500' },
    { id: 'professional', name: 'Профессиональные', icon: DocumentIcon, color: 'text-indigo-500' }
  ];

  // Пример данных
  useEffect(() => {
    setAchievements([
      {
        id: 1,
        title: 'Победа в олимпиаде по математике',
        description: 'Занял 1-е место в региональной олимпиаде по математике',
        category: 'academic',
        date: '2024-03-15',
        organization: 'Министерство образования РБ',
        files: ['diploma.pdf', 'certificate.jpg']
      },
      {
        id: 2,
        title: 'Участие в конференции "IT-будущее"',
        description: 'Выступил с докладом о машинном обучении',
        category: 'professional',
        date: '2024-02-10',
        organization: 'МелГУ',
        files: ['presentation.pptx']
      }
    ]);
  }, []);

  const handleAddAchievement = (e) => {
    e.preventDefault();
    const achievement = {
      id: achievements.length + 1,
      ...newAchievement,
      files: newAchievement.files.map(file => file.name)
    };
    setAchievements([...achievements, achievement]);
    setNewAchievement({
      title: '',
      description: '',
      category: 'academic',
      date: '',
      organization: '',
      files: []
    });
    setShowAddForm(false);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setNewAchievement(prev => ({
      ...prev,
      files: [...prev.files, ...files]
    }));
  };

  const removeFile = (index) => {
    setNewAchievement(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(achievement => achievement.category === selectedCategory);

  const getCategoryInfo = (categoryId) => {
    return categories.find(cat => cat.id === categoryId) || categories[0];
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        {/* Заголовок */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Мое портфолио</h1>
              <p className="text-sm text-gray-600 mt-1">
                Добавляйте свои достижения и участие в мероприятиях
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Добавить достижение
            </button>
          </div>
        </div>

        {/* Фильтры по категориям */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <category.icon className={`h-4 w-4 mr-2 ${category.color}`} />
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Список достижений */}
        <div className="p-6">
          {filteredAchievements.length === 0 ? (
            <div className="text-center py-12">
              <TrophyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedCategory === 'all' 
                  ? 'Пока нет достижений' 
                  : `Нет достижений в категории "${getCategoryInfo(selectedCategory).name}"`
                }
              </h3>
              <p className="text-gray-500 mb-4">
                Добавьте свои достижения и участие в мероприятиях
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Добавить первое достижение
              </button>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredAchievements.map((achievement) => {
                const categoryInfo = getCategoryInfo(achievement.category);
                return (
                  <div key={achievement.id} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <categoryInfo.icon className={`h-5 w-5 mr-2 ${categoryInfo.color}`} />
                          <span className={`text-sm font-medium ${categoryInfo.color}`}>
                            {categoryInfo.name}
                          </span>
                          <span className="mx-2 text-gray-400">•</span>
                          <span className="text-sm text-gray-500 flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {new Date(achievement.date).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {achievement.title}
                        </h3>
                        
                        <p className="text-gray-700 mb-3">
                          {achievement.description}
                        </p>
                        
                        <div className="text-sm text-gray-600 mb-3">
                          <strong>Организация:</strong> {achievement.organization}
                        </div>

                        {achievement.files && achievement.files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {achievement.files.map((file, index) => (
                              <div key={index} className="inline-flex items-center px-3 py-1 bg-white border border-gray-200 rounded-md text-sm">
                                <PaperClipIcon className="h-4 w-4 mr-1 text-gray-400" />
                                {file}
                                <button className="ml-2 text-gray-400 hover:text-gray-600">
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно добавления достижения */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
            <form onSubmit={handleAddAchievement}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Добавить достижение
                </h3>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название достижения *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAchievement.title}
                    onChange={(e) => setNewAchievement(prev => ({...prev, title: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Например: Победа в олимпиаде по математике"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание
                  </label>
                  <textarea
                    value={newAchievement.description}
                    onChange={(e) => setNewAchievement(prev => ({...prev, description: e.target.value}))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Подробное описание достижения..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Категория *
                    </label>
                    <select
                      required
                      value={newAchievement.category}
                      onChange={(e) => setNewAchievement(prev => ({...prev, category: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      {categories.slice(1).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Дата *
                    </label>
                    <input
                      type="date"
                      required
                      value={newAchievement.date}
                      onChange={(e) => setNewAchievement(prev => ({...prev, date: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Организация
                  </label>
                  <input
                    type="text"
                    value={newAchievement.organization}
                    onChange={(e) => setNewAchievement(prev => ({...prev, organization: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Например: МелГУ, Министерство образования РБ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Прикрепить файлы
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  {newAchievement.files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {newAchievement.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio; 