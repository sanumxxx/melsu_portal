import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  EyeIcon,
  SpeakerWaveIcon,
  XMarkIcon,
  PlayIcon,
  FilmIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';
import MediaPlayer, { MediaPreview, useMediaType, validateMediaFile } from '../common/MediaPlayer';

const AnnouncementManager = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '', // Старое поле для совместимости
    target_roles: [],
    is_active: true,
    // Новые поля для медиафайлов
    has_media: false,
    media_type: null,
    media_url: null,
    media_filename: null,
    media_size: null,
    media_duration: null,
    media_thumbnail_url: null,
    media_width: null,
    media_height: null,
    media_autoplay: true,
    media_loop: true,
    media_muted: true
  });

  const [availableRoles, setAvailableRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setRolesLoading(true);
      const response = await api.get('/api/announcements/available-roles');
      setAvailableRoles(response.data);
    } catch (error) {
      console.error('Ошибка загрузки ролей:', error);
      toast.error('Не удалось загрузить список ролей');
      // Устанавливаем пустой массив если API недоступен
      setAvailableRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/announcements/');
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Ошибка загрузки объявлений:', error);
      toast.error('Не удалось загрузить объявления');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Заголовок обязателен');
      return;
    }

    try {
      const submitData = {
        ...formData,
        target_roles: formData.target_roles.length > 0 ? formData.target_roles : null
      };

      if (editingAnnouncement) {
        await api.put(`/api/announcements/${editingAnnouncement.id}`, submitData);
        toast.success('Объявление обновлено');
      } else {
        await api.post('/api/announcements/', submitData);
        toast.success('Объявление создано');
      }

      await loadAnnouncements();
      closeModal();
    } catch (error) {
      console.error('Ошибка сохранения объявления:', error);
      toast.error('Не удалось сохранить объявление');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить это объявление?')) {
      return;
    }

    try {
      await api.delete(`/api/announcements/${id}`);
      toast.success('Объявление удалено');
      await loadAnnouncements();
    } catch (error) {
      console.error('Ошибка удаления объявления:', error);
      toast.error('Не удалось удалить объявление');
    }
  };

  const handleMediaUpload = async (file) => {
    if (!file) return;

    // Валидация файла
    const errors = validateMediaFile(file, 100 * 1024 * 1024); // 100MB
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      // Используем новый эндпоинт для медиафайлов
      const response = await api.post('/api/announcements/upload-media', uploadFormData);

      const mediaData = response.data;
      const mediaUrl = mediaData.file_url;
      const mediaType = useMediaType(file.name) || mediaData.media_type;

      // Обновляем формData с информацией о медиафайле
      setFormData(prev => ({
        ...prev,
        has_media: true,
        media_type: mediaType,
        media_url: mediaUrl,
        media_filename: mediaData.filename,
        media_size: mediaData.size,
        media_duration: mediaData.media_duration || null,
        media_width: mediaData.media_width || null,
        media_height: mediaData.media_height || null,
        // Сбрасываем старое поле изображения
        image_url: null
      }));

      // Устанавливаем данные для предпросмотра
      setMediaPreview({
        src: `http://localhost:8000${mediaUrl}`,
        type: mediaType,
        filename: mediaData.filename,
        size: mediaData.size,
        duration: mediaData.media_duration,
        width: mediaData.media_width,
        height: mediaData.media_height
      });

      toast.success(`${mediaType === 'video' ? 'Видео' : mediaType === 'gif' ? 'GIF' : 'Изображение'} загружено`);
    } catch (error) {
      console.error('Ошибка загрузки медиафайла:', error);
      const errorMessage = error.response?.data?.detail || 'Не удалось загрузить медиафайл';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      handleMediaUpload(file);
    }
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setFormData(prev => ({
      ...prev,
      has_media: false,
      media_type: null,
      media_url: null,
      media_filename: null,
      media_size: null,
      media_duration: null,
      media_thumbnail_url: null,
      media_width: null,
      media_height: null
    }));
  };

  const openModal = (announcement = null) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        description: announcement.description || '',
        image_url: announcement.image_url || '',
        target_roles: announcement.target_roles || [],
        is_active: announcement.is_active,
        // Медиафайлы
        has_media: announcement.has_media || false,
        media_type: announcement.media_type || null,
        media_url: announcement.media_url || null,
        media_filename: announcement.media_filename || null,
        media_size: announcement.media_size || null,
        media_duration: announcement.media_duration || null,
        media_thumbnail_url: announcement.media_thumbnail_url || null,
        media_width: announcement.media_width || null,
        media_height: announcement.media_height || null,
        media_autoplay: announcement.media_autoplay !== undefined ? announcement.media_autoplay : true,
        media_loop: announcement.media_loop !== undefined ? announcement.media_loop : true,
        media_muted: announcement.media_muted !== undefined ? announcement.media_muted : true
      });
      
      // Настраиваем предпросмотр медиафайла
      if (announcement.has_media && announcement.media_url) {
        const mediaUrl = announcement.media_url.startsWith('http') 
          ? announcement.media_url 
          : `http://localhost:8000${announcement.media_url}`;
        
        setMediaPreview({
          src: mediaUrl,
          type: announcement.media_type,
          filename: announcement.media_filename,
          size: announcement.media_size,
          duration: announcement.media_duration,
          width: announcement.media_width,
          height: announcement.media_height,
          thumbnail: announcement.media_thumbnail_url
        });
      } else if (announcement.image_url) {
        // Поддержка старых объявлений с image_url
        const imageUrl = announcement.image_url.startsWith('http') 
          ? announcement.image_url 
          : `http://localhost:8000${announcement.image_url}`;
        
        setMediaPreview({
          src: imageUrl,
          type: 'image',
          filename: 'image',
          size: null
        });
      } else {
        setMediaPreview(null);
      }
    } else {
      setEditingAnnouncement(null);
      setFormData({
        title: '',
        description: '',
        image_url: '',
        target_roles: [],
        is_active: true,
        has_media: false,
        media_type: null,
        media_url: null,
        media_filename: null,
        media_size: null,
        media_duration: null,
        media_thumbnail_url: null,
        media_width: null,
        media_height: null,
        media_autoplay: true,
        media_loop: true,
        media_muted: true
      });
      setMediaPreview(null);
    }
    setMediaFile(null);
    setUploading(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAnnouncement(null);
    setMediaFile(null);
    setMediaPreview(null);
    setUploading(false);
    setFormData({
      title: '',
      description: '',
      image_url: '',
      target_roles: [],
      is_active: true,
      has_media: false,
      media_type: null,
      media_url: null,
      media_filename: null,
      media_size: null,
      media_duration: null,
      media_thumbnail_url: null,
      media_width: null,
      media_height: null,
      media_autoplay: true,
      media_loop: true,
      media_muted: true
    });
  };

  const toggleRole = (role) => {
    setFormData(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role]
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Управление объявлениями</h1>
          <p className="text-gray-600 mt-1">Создание и управление объявлениями для пользователей</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Создать объявление
        </button>
      </div>

      {/* Список объявлений */}
      <div className="bg-white shadow rounded-lg">
        {announcements.length === 0 ? (
          <div className="text-center py-12">
            <SpeakerWaveIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет объявлений</h3>
            <p className="mt-1 text-sm text-gray-500">Создайте первое объявление для пользователей</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Объявление
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Целевые роли
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Просмотры
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Создано
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {announcements.map((announcement) => (
                  <tr key={announcement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        {/* Медиафайл или старое изображение */}
                        {(announcement.has_media || announcement.image_url) && (
                          <div className="h-12 w-12 rounded-lg overflow-hidden mr-4 flex-shrink-0 bg-gray-100 relative">
                            {announcement.has_media ? (
                              <>
                                <MediaPlayer
                                  src={announcement.media_url.startsWith('http') ? announcement.media_url : `http://localhost:8000${announcement.media_url}`}
                                  type={announcement.media_type}
                                  thumbnail={announcement.media_thumbnail_url}
                                  autoplay={false}
                                  controls={false}
                                  className="w-full h-full"
                                  showOverlay={false}
                                />
                                {/* Индикатор типа медиа */}
                                <div className="absolute top-0 right-0 bg-black bg-opacity-60 text-white text-xs px-1 rounded-bl">
                                  {announcement.media_type === 'video' && <FilmIcon className="w-3 h-3" />}
                                  {announcement.media_type === 'gif' && <PlayIcon className="w-3 h-3" />}
                                  {announcement.media_type === 'image' && <PhotoIcon className="w-3 h-3" />}
                                </div>
                              </>
                            ) : (
                              <img
                                src={announcement.image_url.startsWith('http') ? announcement.image_url : `http://localhost:8000${announcement.image_url}`}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {announcement.title}
                            </p>
                            {announcement.has_media && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                {announcement.media_type?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          {announcement.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {announcement.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {!announcement.target_roles || announcement.target_roles.length === 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Все пользователи
                          </span>
                        ) : (
                          announcement.target_roles.map(role => {
                            const roleInfo = availableRoles.find(r => r.value === role);
                            return (
                              <span
                                key={role}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {roleInfo?.label || role}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        announcement.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {announcement.is_active ? 'Активно' : 'Неактивно'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <EyeIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">{announcement.views_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        {formatDate(announcement.created_at)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {announcement.created_by_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openModal(announcement)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модальное окно создания/редактирования */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingAnnouncement ? 'Редактировать объявление' : 'Создать объявление'}
                    </h3>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Заголовок */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Заголовок *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Введите заголовок объявления"
                        required
                      />
                    </div>

                    {/* Описание */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Описание
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Введите описание объявления"
                      />
                    </div>

                    {/* Медиафайлы */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Медиафайл (изображение, GIF, видео)
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center w-full">
                          {mediaPreview ? (
                            <div className="relative">
                              <div className="mx-auto" style={{ maxWidth: '300px', maxHeight: '200px' }}>
                                <MediaPlayer
                                  src={mediaPreview.src}
                                  type={mediaPreview.type}
                                  thumbnail={mediaPreview.thumbnail}
                                  autoplay={false}
                                  controls={true}
                                  className="rounded-lg border border-gray-200"
                                />
                              </div>
                              <div className="mt-2 text-xs text-gray-500 space-y-1">
                                <div><strong>Файл:</strong> {mediaPreview.filename}</div>
                                {mediaPreview.size && (
                                  <div><strong>Размер:</strong> {(mediaPreview.size / 1024 / 1024).toFixed(1)} МБ</div>
                                )}
                                {mediaPreview.duration && (
                                  <div><strong>Длительность:</strong> {mediaPreview.duration}с</div>
                                )}
                                {mediaPreview.width && mediaPreview.height && (
                                  <div><strong>Разрешение:</strong> {mediaPreview.width}×{mediaPreview.height}</div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={clearMedia}
                                className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <FilmIcon className="mx-auto h-12 w-12 text-gray-400" />
                              <div className="flex text-sm text-gray-600">
                                <label className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500">
                                  <span>Загрузить медиафайл</span>
                                  <input
                                    type="file"
                                    className="sr-only"
                                    accept="image/*,video/*"
                                    onChange={handleMediaChange}
                                    disabled={uploading}
                                  />
                                </label>
                              </div>
                              <p className="text-xs text-gray-500">
                                JPEG, PNG, GIF (до 50МБ), MP4, WebM, MOV (до 100МБ)
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      {uploading && (
                        <div className="mt-2 text-sm text-gray-500">Загрузка медиафайла...</div>
                      )}
                    </div>

                    {/* Настройки медиафайлов */}
                    {formData.has_media && formData.media_type === 'video' && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Настройки видео</h4>
                        <div className="space-y-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.media_autoplay}
                              onChange={(e) => setFormData(prev => ({ ...prev, media_autoplay: e.target.checked }))}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Автопроигрывание при показе объявления
                            </span>
                          </label>
                          
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.media_loop}
                              onChange={(e) => setFormData(prev => ({ ...prev, media_loop: e.target.checked }))}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Зацикливание видео
                            </span>
                          </label>
                          
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.media_muted}
                              onChange={(e) => setFormData(prev => ({ ...prev, media_muted: e.target.checked }))}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Отключить звук по умолчанию
                            </span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Целевые роли */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Показывать для ролей (если не выбрано - показывать всем)
                      </label>
                      {rolesLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                          <span className="ml-2 text-sm text-gray-500">Загрузка ролей...</span>
                        </div>
                      ) : availableRoles.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500">Роли не загружены</p>
                          <button
                            type="button"
                            onClick={loadRoles}
                            className="mt-2 text-sm text-red-600 hover:text-red-700"
                          >
                            Попробовать снова
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {availableRoles.map(role => (
                            <label key={role.value} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.target_roles.includes(role.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData(prev => ({
                                      ...prev,
                                      target_roles: [...prev.target_roles, role.value]
                                    }));
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      target_roles: prev.target_roles.filter(r => r !== role.value)
                                    }));
                                  }
                                }}
                                className="h-4 w-4 text-red-600 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                {role.label}
                                {role.description && (
                                  <span className="text-gray-500"> - {role.description}</span>
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Статус */}
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Активно</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {editingAnnouncement ? 'Сохранить' : 'Создать'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementManager; 