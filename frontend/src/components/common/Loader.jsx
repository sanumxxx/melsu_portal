import React from 'react';

const Loader = ({ size = 'md', className = '', text = 'Загрузка...', fullScreen = false }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const spinner = (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizes[size]}`}></div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center">
          {spinner}
          {text && <p className="mt-4 text-gray-600">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center p-6 ${className}`}>
      <div className="text-center">
        {spinner}
        {text && <p className="mt-2 text-gray-600 text-sm">{text}</p>}
      </div>
    </div>
  );
};

export { Loader };
export default Loader; 