import React, { useState, useRef, useEffect } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

const MediaPlayer = ({ 
  src, 
  type, 
  thumbnail, 
  alt = "Медиафайл",
  autoplay = true,
  loop = true,
  muted = true,
  controls = false,
  width,
  height,
  className = "",
  onLoad,
  onError,
  showOverlay = true,
  lazy = true
}) => {
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isMuted, setIsMuted] = useState(muted);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Intersection Observer для ленивой загрузки
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  // Автопроигрывание видео
  useEffect(() => {
    if (!videoRef.current || type !== 'video' || !isInView) return;

    const video = videoRef.current;
    
    if (autoplay && isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setIsPlaying(false);
        });
      }
    } else {
      video.pause();
    }
  }, [isPlaying, autoplay, isInView, type]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const handleMuteToggle = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    if (onError) onError();
  };

  const handleVideoLoad = () => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      setIsLoading(false);
    }
  };

  // Определение стилей контейнера
  const containerStyle = {
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    maxWidth: '100%',
    maxHeight: '100%'
  };

  // Ошибка загрузки
  if (hasError) {
    return (
      <div 
        ref={containerRef}
        className={`flex items-center justify-center bg-gray-100 text-gray-500 rounded-lg ${className}`}
        style={containerStyle}
      >
        <div className="text-center p-4">
          <EyeSlashIcon className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Не удалось загрузить медиафайл</p>
        </div>
      </div>
    );
  }

  // Загрузка
  if (isLoading && isInView) {
    return (
      <div 
        ref={containerRef}
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={containerStyle}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Ленивая загрузка - показываем плейсхолдер
  if (!isInView) {
    return (
      <div 
        ref={containerRef}
        className={`bg-gray-200 rounded-lg ${className}`}
        style={containerStyle}
      >
        {thumbnail && (
          <img 
            src={thumbnail} 
            alt={alt}
            className="w-full h-full object-cover rounded-lg opacity-50"
          />
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative group rounded-lg overflow-hidden ${className}`}
      style={containerStyle}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Изображения и GIF */}
      {(type === 'image' || type === 'gif') && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className="w-full h-full object-cover"
          loading={lazy ? "lazy" : "eager"}
        />
      )}

      {/* Видео */}
      {type === 'video' && (
        <video
          ref={videoRef}
          src={src}
          poster={thumbnail}
          onLoadedData={handleVideoLoad}
          onError={handleError}
          loop={loop}
          muted={isMuted}
          controls={controls}
          className="w-full h-full object-cover"
          playsInline
          preload={lazy ? "metadata" : "auto"}
        />
      )}

      {/* Overlay с контролами для видео */}
      {type === 'video' && showOverlay && (showControls || !isPlaying) && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center transition-opacity duration-200">
          <div className="flex items-center space-x-4">
            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              className="p-3 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
              aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
            >
              {isPlaying ? (
                <PauseIcon className="w-6 h-6" />
              ) : (
                <PlayIcon className="w-6 h-6" />
              )}
            </button>

            {/* Mute/Unmute */}
            <button
              onClick={handleMuteToggle}
              className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
              aria-label={isMuted ? "Включить звук" : "Выключить звук"}
            >
              {isMuted ? (
                <SpeakerXMarkIcon className="w-5 h-5" />
              ) : (
                <SpeakerWaveIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Индикатор типа файла */}
      {showOverlay && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
          {type.toUpperCase()}
        </div>
      )}

      {/* Полноэкранная кнопка */}
      {type === 'video' && showControls && (
        <button
          onClick={() => {
            if (videoRef.current?.requestFullscreen) {
              videoRef.current.requestFullscreen();
            }
          }}
          className="absolute bottom-2 right-2 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
          aria-label="Полный экран"
        >
          <ArrowsPointingOutIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Компонент для предпросмотра в админке
export const MediaPreview = ({ media, className = "" }) => {
  if (!media || !media.has_media) {
    return null;
  }

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Медиафайл:</h4>
      <MediaPlayer
        src={media.media_url}
        type={media.media_type}
        thumbnail={media.media_thumbnail_url}
        autoplay={false}
        controls={true}
        width={200}
        height={150}
        className="border border-gray-200 rounded"
      />
      <div className="mt-2 text-xs text-gray-500 space-y-1">
        <div><strong>Тип:</strong> {media.media_type?.toUpperCase()}</div>
        <div><strong>Файл:</strong> {media.media_filename}</div>
        {media.media_size && (
          <div><strong>Размер:</strong> {(media.media_size / 1024 / 1024).toFixed(1)} МБ</div>
        )}
        {media.media_duration && (
          <div><strong>Длительность:</strong> {media.media_duration}с</div>
        )}
        <div>
          <strong>Настройки:</strong> 
          {media.media_autoplay && " Автопроигрывание"}
          {media.media_loop && " Зацикливание"}
          {media.media_muted && " Без звука"}
        </div>
      </div>
    </div>
  );
};

// Утилитарная функция для определения типа файла по расширению
export const getMediaType = (filename) => {
  if (!filename) return null;
  
  const extension = filename.toLowerCase().split('.').pop();
  
  const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'bmp'];
  const gifExtensions = ['gif'];
  const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
  
  if (imageExtensions.includes(extension)) return 'image';
  if (gifExtensions.includes(extension)) return 'gif';
  if (videoExtensions.includes(extension)) return 'video';
  
  return null;
};

// Валидация медиафайла
export const validateMediaFile = (file, maxSize = 50 * 1024 * 1024) => { // 50MB по умолчанию
  const errors = [];
  
  if (!file) return errors;
  
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/mov'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('Неподдерживаемый тип файла. Разрешены: JPEG, PNG, GIF, WebP, MP4, WebM, MOV');
  }
  
  if (file.size > maxSize) {
    errors.push(`Файл слишком большой. Максимальный размер: ${maxSize / 1024 / 1024}МБ`);
  }
  
  return errors;
};

export default MediaPlayer; 