import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../services/api';
import Input from '../common/Input';
import Button from '../common/Button';
import Select from '../common/Select';

const RegistrationStep = ({ onPrev, formData, setFormData, verificationCode, onSuccess }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Очищаем ошибку для поля при вводе
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    
    // Валидация
    const newErrors = {};
    if (!formData.first_name) newErrors.first_name = 'Имя обязательно';
    if (!formData.last_name) newErrors.last_name = 'Фамилия обязательна';
    if (!formData.birth_date) newErrors.birth_date = 'Дата рождения обязательна';
    if (!formData.gender) newErrors.gender = 'Пол обязателен';
    if (!formData.password) newErrors.password = 'Пароль обязателен';
    if (formData.password.length < 6) newErrors.password = 'Пароль должен быть минимум 6 символов';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // Регистрируем пользователя (токены сохраняются автоматически)
      const response = await api.register({
        email: formData.email,
        verification_code: verificationCode,
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name || null,
        birth_date: formData.birth_date,
        gender: formData.gender,
        password: formData.password
      });

      // Получаем информацию о пользователе для показа ролей
      try {
        const userResponse = await api.getCurrentUser();
        const user = userResponse.data;
        
        toast.success(`Добро пожаловать в портал, ${user.first_name}!`);
        
        // Обновляем состояние аутентификации
        if (onSuccess) {
          onSuccess(user);
        }
        
        navigate('/profile');
      } catch (userError) {
        toast.success('Регистрация завершена успешно!');
        
        // Обновляем состояние аутентификации
        if (onSuccess) {
          onSuccess();
        }
        
        navigate('/profile');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8">
      {/* Анимированный задний фон */}
      <div className="square absolute inset-0 z-0 pointer-events-none flex">
        <span className="flex-1 left-50"></span>
        <span className="flex-1 left-50"></span>
        <span className="flex-1 left-50"></span>
      </div>

      <div className="z-10 bg-white rounded-3xl p-6 sm:p-8 shadow-xl w-full max-w-md border border-gray-200 max-h-[90vh] sm:max-h-[85vh] overflow-y-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Ваши данные</h2>
          <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
            Заполните информацию для завершения регистрации
          </p>
        </div>

        <form onSubmit={handleCompleteRegistration} className="space-y-3 sm:space-y-4">
          <Input
            placeholder="Имя"
            value={formData.first_name}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
            error={errors.first_name}
            required
          />
          
          <Input
            placeholder="Фамилия"
            value={formData.last_name}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
            error={errors.last_name}
            required
          />
          
          <Input
            placeholder="Отчество (необязательно)"
            value={formData.middle_name || ''}
            onChange={(e) => handleInputChange('middle_name', e.target.value)}
            error={errors.middle_name}
          />

          <Input
            type="date"
            placeholder="Дата рождения"
            value={formData.birth_date || ''}
            onChange={(e) => handleInputChange('birth_date', e.target.value)}
            error={errors.birth_date}
            required
          />

          <Select
            options={[
              { value: 'male', label: 'Мужской' },
              { value: 'female', label: 'Женский' },
              { value: 'other', label: 'Другой' }
            ]}
            value={formData.gender || ''}
            onChange={(value) => handleInputChange('gender', value)}
            placeholder="Выберите пол"
            error={errors.gender}
            required
          />

          <Input
            type="password"
            placeholder="Пароль"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            error={errors.password}
            required
            minLength="6"
          />
          
          <Input
            type="password"
            placeholder="Подтвердите пароль"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
            required
          />
          
          <div className="space-y-3 pt-4">
            <Button type="submit" loading={loading} className="w-full">
              Завершить регистрацию
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onPrev}
              className="w-full"
            >
              Назад
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrationStep; 