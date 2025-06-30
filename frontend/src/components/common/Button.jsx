import React from 'react';

const Button = ({ 
  type = 'button',
  variant = 'primary', 
  size = 'default',
  loading = false, 
  disabled = false, 
  children,
  className = '', 
  onClick,
  ...props 
}) => {
  const baseClasses = 'font-medium rounded-lg transition-colors flex items-center justify-center cursor-pointer select-none';
  
  // Размеры с минимальным размером касания для мобильных
  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    default: 'px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[48px]'
  };

  const variants = {
    primary: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700',
    outline: 'border border-gray-300 hover:bg-gray-50 active:bg-gray-100 text-gray-700',
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white',
  };

  const classes = `
    ${baseClasses}
    ${sizes[size] || sizes.default}
    ${variants[variant] || variants.primary}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  // Обработчик клика с поддержкой touch events
  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    
    if (onClick) {
      onClick(e);
    }
  };

  // Обработчик touch для мобильных устройств
  const handleTouchStart = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      disabled={disabled || loading}
      className={classes}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
      {...props}
    >
      {loading ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Загрузка...
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default Button; 