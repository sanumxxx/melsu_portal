import React, { useEffect, useRef } from 'react';

const VKAuthButton = ({ onSuccess, onError, disabled = false }) => {
  const containerRef = useRef(null);
  const vkidRef = useRef(null);

  useEffect(() => {
    // Загружаем VK ID SDK если еще не загружен
    if (!window.VKIDSDK) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js';
      script.onload = () => {
        initVKID();
      };
      document.head.appendChild(script);
    } else {
      initVKID();
    }

    return () => {
      // Очищаем VK ID при размонтировании
      if (vkidRef.current) {
        try {
          vkidRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying VK ID:', e);
        }
      }
    };
  }, []);

  const initVKID = () => {
    if (!window.VKIDSDK || !containerRef.current) return;

    const VKID = window.VKIDSDK;

    try {
      // Инициализируем VK ID конфигурацию только если еще не инициализирована
      if (!window.vkidConfigInitialized) {
        VKID.Config.init({
          app: 53853965, // ID вашего приложения
          redirectUrl: `${window.location.origin}`,
          responseMode: VKID.ConfigResponseMode.Callback,
          source: VKID.ConfigSource.LOWCODE,
          scope: '', // Заполните нужными доступами по необходимости
        });
        window.vkidConfigInitialized = true;
      }

      // Создаем OAuth кнопку
      const oAuth = new VKID.OAuthList();
      vkidRef.current = oAuth;

      oAuth.render({
        container: containerRef.current,
        oauthList: ['vkid']
      })
      .on(VKID.WidgetEvents.ERROR, (error) => {
        console.error('VK ID Error:', error);
        if (onError) {
          onError(error);
        }
      })
      .on(VKID.OAuthListInternalEvents.LOGIN_SUCCESS, async (payload) => {
        try {
          const code = payload.code;
          const deviceId = payload.device_id;

          // Обмениваем код на токен
          const tokenData = await VKID.Auth.exchangeCode(code, deviceId);
          
          if (onSuccess) {
            onSuccess({
              code,
              deviceId,
              tokenData,
              payload
            });
          }
        } catch (error) {
          console.error('VK ID Exchange Error:', error);
          if (onError) {
            onError(error);
          }
        }
      });

    } catch (error) {
      console.error('VK ID Init Error:', error);
      if (onError) {
        onError(error);
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`vk-auth-button ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      style={{ minHeight: '40px' }}
    />
  );
};

export default VKAuthButton; 