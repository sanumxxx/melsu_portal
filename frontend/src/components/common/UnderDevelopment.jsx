import React from 'react';

const UnderDevelopment = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
        {title}
      </h1>
      
      <img 
        src="/under-development.png" 
        alt="Страница в разработке" 
        className="max-w-xs sm:max-w-md w-full h-auto"
      />
    </div>
  );
};

export default UnderDevelopment; 