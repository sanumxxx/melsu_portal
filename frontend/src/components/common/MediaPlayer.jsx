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
  lazy = false
}) => {
  console.log('🎬 MediaPlayer render:', { src, type, thumbnail, autoplay, lazy });

  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isMuted, setIsMuted] = useState(muted);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [retryCount, setRetryCount] = useState(0);
  
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const loadingTimeoutRef = useRef(null);

  // Intersection Observer для ленивой загрузки
  useEffect(() => {
    if (!lazy || isInView) return;

    console.log('🔍 Setting up Intersection Observer for lazy loading');

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          console.log('👀 MediaPlayer came into view, starting load');
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

    console.log('▶️ Video autoplay effect:', { autoplay, isPlaying, isInView });

    const video = videoRef.current;
    
    if (autoplay && isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error('❌ Video autoplay failed:', error);
          setIsPlaying(false);
        });
      }
    } else {
      video.pause();
    }
  }, [isPlaying, autoplay, isInView, type]);

  // Проверка, не загружено ли изображение уже
  useEffect(() => {
    if (!isInView || hasError || !isLoading) return;

    // Для изображений проверяем, может оно уже загружено
    if (type === 'image' || type === 'gif') {
      const img = new Image();
      img.onload = () => {
        console.log('✅ Image pre-loaded successfully:', { src, type });
        setIsLoading(false);
        setHasError(false);
      };
      img.onerror = (error) => {
        console.error('❌ Image pre-load failed:', { src, type, error });
        setIsLoading(false);
        setHasError(true);
      };
      img.src = src;
      
      // Если изображение уже в кэше
      if (img.complete) {
        console.log('✅ Image already cached:', { src, type });
        setIsLoading(false);
        setHasError(false);
        return;
      }
    }

    // Fallback timeout на 5 секунд для других случаев
    loadingTimeoutRef.current = setTimeout(() => {
      if (isLoading) {
        console.error('⏰ MediaPlayer: Loading timeout reached for:', { src, type });
        setIsLoading(false);
        setHasError(true);
      }
    }, 5000);

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isInView, isLoading, hasError, src, type]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    console.log('⏯️ Play/Pause triggered:', { isPlaying });
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch((error) => {
        console.error('❌ Video play failed:', error);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const handleMuteToggle = () => {
    if (!videoRef.current) return;
    
    console.log('🔇 Mute toggle:', { isMuted });
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleLoad = () => {
    console.log('✅ Media loaded successfully:', { src, type, retryCount });
    
    // Очищаем timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    setIsLoading(false);
    setHasError(false);
    setRetryCount(0); // Сбрасываем счетчик retry при успешной загрузке
    if (onLoad) onLoad();
  };

  const handleError = (error) => {
    console.error('❌ Media load error:', { src, type, error, retryCount });
    
    // Очищаем timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    // Пробуем повторить загрузку максимум 2 раза
    if (retryCount < 2) {
      console.log('🔄 Retrying media load:', { src, type, retryCount: retryCount + 1 });
      setRetryCount(prev => prev + 1);
      setIsLoading(true);
      setHasError(false);
      
      // Небольшая задержка перед повтором
      setTimeout(() => {
        // Trigger reload by setting a small state change
        const imgElements = document.querySelectorAll(`img[src="${src}"]`);
        imgElements.forEach(img => {
          img.src = img.src; // Force reload
        });
      }, 1000);
      
      return;
    }
    
    setIsLoading(false);
    setHasError(true);
    if (onError) onError(error);
  };

  const handleVideoLoad = () => {
    console.log('📹 Video loaded:', { src });
    
    // Очищаем timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      setIsLoading(false);
      setHasError(false);
    }
  };

  // Определение стилей контейнера
  const containerStyle = {
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    maxWidth: '100%',
    maxHeight: '100%'
  };

  // Проверка наличия src
  if (!src) {
    console.error('❌ MediaPlayer: No src provided');
    return (
      <div 
        ref={containerRef}
        className={`flex items-center justify-center bg-gray-100 text-gray-500 rounded-lg ${className}`}
        style={containerStyle}
      >
        <div className="text-center p-4">
          <EyeSlashIcon className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Медиафайл не найден</p>
        </div>
      </div>
    );
  }

  // Ошибка загрузки
  if (hasError) {
    return (
      <div 
        ref={containerRef}
        className={`flex flex-col items-center justify-center bg-gray-100 text-gray-500 rounded-lg ${className}`}
        style={containerStyle}
      >
        <div className="text-center p-4">
          <EyeSlashIcon className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Не удалось загрузить медиафайл</p>
          <p className="text-xs text-gray-400 mt-1 break-all">{src}</p>
          {retryCount > 1 && (
            <p className="text-xs text-red-400 mt-1">Попыток: {retryCount}</p>
          )}
          <button
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
            onClick={() => {
              setIsLoading(true);
              setHasError(false);
              setRetryCount(0);
            }}
          >
            Повторить попытку
          </button>
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
        onClick={() => {
          console.log('🔄 Manual reset loading state for:', { src, type });
          setIsLoading(false);
          setHasError(true);
        }}
        title="Нажмите, чтобы остановить загрузку"
      >
        <div className="flex flex-col items-center cursor-pointer">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="text-xs text-gray-500 mt-2">Загрузка...</p>
          <p className="text-xs text-gray-400 mt-1">Нажмите для отмены</p>
        </div>
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
      {(type === 'image' || type === 'gif') && !isLoading && !hasError && (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="eager"
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