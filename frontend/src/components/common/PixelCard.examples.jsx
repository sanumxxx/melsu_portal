/**
 * ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ PIXELCARD КОМПОНЕНТА
 * 
 * Этот файл содержит различные примеры того, как можно использовать PixelCard
 * в ваших проектах. Скопируйте нужный пример и адаптируйте под свои нужды.
 */

import React from 'react';
import PixelCard from './PixelCard';

// ПРИМЕР 1: Простая карточка с hover эффектом
export const SimpleHoverCard = () => (
  <PixelCard variant="blue">
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h3>Наведите мышкой</h3>
      <p>Пиксели появятся при наведении</p>
    </div>
  </PixelCard>
);

// ПРИМЕР 2: Скрытие секретного текста
export const SecretTextCard = () => (
  <PixelCard variant="black">
    <div className="pixel-card-content">
      Секретный текст! Кликните чтобы показать/скрыть
    </div>
  </PixelCard>
);

// ПРИМЕР 3: Скрытие email или личной информации
export const EmailHiddenCard = ({ email }) => (
  <div>
    <label>Email:</label>
    <PixelCard variant="black">
      <div className="pixel-card-content">
        {email}
      </div>
    </PixelCard>
  </div>
);

// ПРИМЕР 4: Кастомные цвета и настройки
export const CustomCard = () => (
  <PixelCard 
    variant="custom" 
    gap={4} 
    speed={70} 
    colors="#ff6b6b,#ffa500,#ffff00"
  >
    <div style={{ padding: '15px', color: 'white' }}>
      Кастомная карточка с оранжевыми пикселями
    </div>
  </PixelCard>
);

// ПРИМЕР 5: Кнопка с пиксельным эффектом
export const PixelButton = ({ onClick, children }) => (
  <PixelCard variant="pink" className="cursor-pointer">
    <button 
      onClick={onClick}
      style={{ 
        background: 'none', 
        border: 'none', 
        color: 'white', 
        fontSize: '16px',
        padding: '10px 20px'
      }}
    >
      {children}
    </button>
  </PixelCard>
);

// ПРИМЕР 6: Карточка профиля с эффектом
export const ProfileCard = ({ user }) => (
  <PixelCard variant="blue" className="profile-card">
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <img 
        src={user.avatar} 
        alt={user.name}
        style={{ width: '80px', height: '80px', borderRadius: '50%' }}
      />
      <h3 style={{ margin: '10px 0' }}>{user.name}</h3>
      <p style={{ color: '#666' }}>{user.role}</p>
    </div>
  </PixelCard>
);

// ПРИМЕР 7: Уведомление с исчезающим эффектом
export const NotificationCard = ({ message, type = 'default' }) => (
  <PixelCard variant={type} className="notification">
    <div style={{ 
      padding: '15px', 
      backgroundColor: type === 'red' ? '#ff4444' : '#4444ff',
      color: 'white',
      borderRadius: '8px'
    }}>
      {message}
    </div>
  </PixelCard>
);

// ПРИМЕР 8: Галерея изображений
export const ImageGalleryCard = ({ image }) => (
  <PixelCard variant="default" className="gallery-item">
    <img 
      src={image.src} 
      alt={image.alt}
      style={{ width: '100%', height: '200px', objectFit: 'cover' }}
    />
    <div style={{ 
      position: 'absolute', 
      bottom: 0, 
      left: 0, 
      right: 0,
      background: 'rgba(0,0,0,0.7)',
      color: 'white',
      padding: '10px'
    }}>
      {image.title}
    </div>
  </PixelCard>
);

// ПРИМЕР 9: Интерактивная форма
export const InteractiveForm = () => (
  <div>
    <h3>Регистрация</h3>
    <PixelCard variant="black">
      <div className="pixel-card-content">
        <form style={{ padding: '20px' }}>
          <input type="email" placeholder="Email" style={{ width: '100%', marginBottom: '10px' }} />
          <input type="password" placeholder="Пароль" style={{ width: '100%', marginBottom: '10px' }} />
          <button type="submit">Зарегистрироваться</button>
        </form>
      </div>
    </PixelCard>
    <small>Кликните чтобы показать форму</small>
  </div>
);

// ПРИМЕР 10: Статистика с эффектами
export const StatsCard = ({ title, value, color = 'blue' }) => (
  <PixelCard variant={color}>
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderRadius: '8px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>{title}</h4>
      <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#666' }}>
        {value}
      </div>
    </div>
  </PixelCard>
);

/**
 * ИСПОЛЬЗОВАНИЕ В КОМПОНЕНТАХ:
 * 
 * import { SecretTextCard, EmailHiddenCard } from './PixelCard.examples';
 * 
 * function MyComponent() {
 *   return (
 *     <div>
 *       <SecretTextCard />
 *       <EmailHiddenCard email="user@example.com" />
 *     </div>
 *   );
 * }
 */ 