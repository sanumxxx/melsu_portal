import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import api, { getMediaUrl } from '../services/api';
import MediaPlayer from './common/MediaPlayer';

const AnnouncementModal = () => {
  const [announcement, setAnnouncement] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkForAnnouncement();
  }, []);

  const checkForAnnouncement = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/announcements/current');
      
      if (response.data.has_unviewed && response.data.announcement) {
        setAnnouncement(response.data.announcement);
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Ошибка загрузки объявления:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async () => {
    if (!announcement) return;

    try {
      await api.post('/api/announcements/mark-viewed', {
        announcement_id: announcement.id
      });
      
      setIsVisible(false);
      setAnnouncement(null);
    } catch (error) {
      console.error('Ошибка отметки объявления как просмотренного:', error);
      // Все равно закрываем модальное окно
      setIsVisible(false);
      setAnnouncement(null);
    }
  };

  const handleClose = () => {
    markAsViewed();
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

  if (!isVisible || !announcement || loading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Фон */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity duration-300"
          onClick={handleClose}
        ></div>

        {/* Центрирование */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Модальное окно */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all duration-300 sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Заголовок */}
          <div className="bg-red-600 px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">
                Объявление
              </h3>
              <button
                onClick={handleClose}
                className="text-red-200 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Содержимое */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            {/* Медиафайл или изображение */}
            {(announcement.has_media || announcement.image_url) && (
              <div className="mb-4">
                {(() => {
                  // Логирование для диагностики
                  console.log('🎭 AnnouncementModal media debug:', {
                    has_media: announcement.has_media,
                    media_url: announcement.media_url,
                    media_type: announcement.media_type,
                    resolved_url: getMediaUrl(announcement.media_url),
                    image_url: announcement.image_url,
                    resolved_image_url: getMediaUrl(announcement.image_url)
                  });
                  
                  return null;
                })()}
                
                {announcement.has_media ? (
                  <MediaPlayer
                    src={getMediaUrl(announcement.media_url)}
                    type={announcement.media_type}
                    thumbnail={getMediaUrl(announcement.media_thumbnail_url)}
                    autoplay={announcement.media_autoplay}
                    loop={announcement.media_loop}
                    muted={announcement.media_muted}
                    controls={announcement.media_type === 'video'}
                    className="w-full max-h-64 rounded-lg"
                    showOverlay={true}
                    lazy={false}
                    onLoad={() => console.log('✅ AnnouncementModal: Media loaded successfully')}
                    onError={(error) => console.error('❌ AnnouncementModal: Media load error:', error)}
                  />
                ) : (
                  <img
                    src={getMediaUrl(announcement.image_url)}
                    alt=""
                    className="w-full h-48 object-cover rounded-lg"
                    onLoad={() => console.log('✅ AnnouncementModal: Image loaded successfully')}
                    onError={(e) => {
                      console.error('❌ AnnouncementModal: Image load error:', {
                        src: e.target.src,
                        original_url: announcement.image_url
                      });
                      e.target.style.display = 'none';
                    }}
                  />
                )}
              </div>
            )}

            {/* Заголовок объявления */}
            <div className="mb-4">
              <h4 className="text-xl font-bold text-gray-900 mb-2">
                {announcement.title}
              </h4>
              
              {/* Метаинформация */}
              <div className="text-sm text-gray-500 mb-3">
                <div>Опубликовано: {formatDate(announcement.created_at)}</div>
                {announcement.created_by_name && (
                  <div>Автор: {announcement.created_by_name}</div>
                )}
              </div>
            </div>

            {/* Описание */}
            {announcement.description && (
              <div className="mb-6">
                <div className="text-gray-700 whitespace-pre-wrap">
                  {announcement.description}
                </div>
              </div>
            )}

                        {/* Информация о целевых ролях */}
            {announcement.target_roles && announcement.target_roles.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2">Объявление для:</div>
                <div className="flex flex-wrap gap-1">
                  {announcement.target_roles.map((role, index) => (
                    <span
                      key={`${role}-${index}`}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Кнопки */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleClose}
              className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
            >
              <CheckIcon className="h-5 w-5 mr-2" />
              Просмотрено
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal; 