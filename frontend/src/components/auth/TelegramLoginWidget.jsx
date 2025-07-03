import React, { useEffect, useRef } from 'react';

const TelegramLoginWidget = ({ onAuth, botName = "melsu_portal_auth_bot" }) => {
  const telegramRef = useRef(null);

  useEffect(() => {
    // Создаем глобальную функцию для колбэка
    window.onTelegramAuth = (user) => {
      console.log('Telegram auth success:', user);
      if (onAuth) {
        onAuth(user);
      }
    };

    // Загружаем скрипт Telegram Login Widget
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'medium');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-lang', 'ru');
    script.async = true;

    if (telegramRef.current) {
      // Очищаем контейнер
      telegramRef.current.innerHTML = '';
      telegramRef.current.appendChild(script);
    }

    return () => {
      // Очищаем глобальную функцию
      if (window.onTelegramAuth) {
        delete window.onTelegramAuth;
      }
    };
  }, [onAuth, botName]);

  return (
    <div 
      ref={telegramRef}
      className="telegram-login-widget"
      style={{ minHeight: '38px' }}
    />
  );
};

export default TelegramLoginWidget; 