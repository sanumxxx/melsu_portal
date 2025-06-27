import React from 'react';
import { useNavigate } from 'react-router-dom';
import UnderDevelopment from './common/UnderDevelopment';

const Grades = ({ user }) => {
  const navigate = useNavigate();

  // Определяем какую версию ведомостей показать
  // Приоритет: преподаватель > студент
  if (user?.roles?.includes('teacher')) {
    return <UnderDevelopment title="Ведомости" />;
  } else if (user?.roles?.includes('student')) {
    return <UnderDevelopment title="Ведомости" />;
  } else {
    // Fallback на профиль если нет соответствующих ролей
    navigate('/profile');
    return null;
  }
};

export default Grades; 