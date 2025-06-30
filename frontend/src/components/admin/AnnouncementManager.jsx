import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  EyeIcon,
  SpeakerWaveIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AnnouncementManager = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    target_roles: [],
    is_active: true
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

  const handleImageUpload = async (file) => {
    if (!file) return;

    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      // Не устанавливаем Content-Type вручную - браузер сам добавит boundary
      const response = await api.post('/api/announcements/upload-image', uploadFormData);

      const imageUrl = response.data.file_url;
      setFormData(prev => ({ ...prev, image_url: imageUrl }));
      // Устанавливаем полный URL для предварительного просмотра
      setImagePreview(`http://localhost:8000${imageUrl}`);
      toast.success('Изображение загружено');
    } catch (error) {
      console.error('Ошибка загрузки изображения:', error);
      toast.error('Не удалось загрузить изображение');
    } finally {
      setUploading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Убираем FileReader - будем использовать URL с сервера после загрузки
      handleImageUpload(file);
    }
  };

  const openModal = (announcement = null) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        description: announcement.description || '',
        image_url: announcement.image_url || '',
        target_roles: announcement.target_roles || [],
        is_active: announcement.is_active
      });
      // Исправляем URL изображения для предварительного просмотра
      const imageUrl = announcement.image_url || '';
      if (imageUrl && !imageUrl.startsWith('http')) {
        setImagePreview(`http://localhost:8000${imageUrl}`);
      } else {
        setImagePreview(imageUrl);
      }
    } else {
      setEditingAnnouncement(null);
      setFormData({
        title: '',
        description: '',
        image_url: '',
        target_roles: [],
        is_active: true
      });
      setImagePreview('');
    }
    setImageFile(null);
    setUploading(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAnnouncement(null);
    setImageFile(null);
    setImagePreview('');
    setUploading(false);
    setFormData({
      title: '',
      description: '',
      image_url: '',
      target_roles: [],
      is_active: true
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
                        {announcement.image_url && (
                          <img
                            src={announcement.image_url.startsWith('http') ? announcement.image_url : `http://localhost:8000${announcement.image_url}`}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover mr-4 flex-shrink-0"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {announcement.title}
                          </p>
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

                    {/* Изображение */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Изображение
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          {imagePreview ? (
                            <div className="relative">
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="mx-auto h-32 w-auto rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setImagePreview('');
                                  setFormData(prev => ({ ...prev, image_url: '' }));
                                }}
                                className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                              <div className="flex text-sm text-gray-600">
                                <label className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500">
                                  <span>Загрузить файл</span>
                                  <input
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    disabled={uploading}
                                  />
                                </label>
                              </div>
                              <p className="text-xs text-gray-500">PNG, JPG, GIF до 5MB</p>
                            </>
                          )}
                        </div>
                      </div>
                      {uploading && (
                        <div className="mt-2 text-sm text-gray-500">Загрузка изображения...</div>
                      )}
                    </div>

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