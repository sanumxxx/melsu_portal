import React from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

const Schedule = () => {
  // Получаем текущую дату в формате "дд.мм.гггг"
  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-6">
      {/* Заголовок страницы */}
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Расписание</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">Учебное расписание</p>
      </div>

      {/* Основная карточка */}
      <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <CalendarDaysIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Уважаемые студенты и преподаватели!
          </h2>
          
          <p className="text-lg sm:text-xl text-gray-700 leading-relaxed">
            Сегодня <span className="font-semibold text-blue-600">{getCurrentDate()}</span>, 
            какое расписание? Пора отдыхать! 😴
          </p>
        </div>
      </div>
    </div>
  );
};

export default Schedule; 