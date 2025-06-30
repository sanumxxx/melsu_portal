import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../services/api';
import Input from '../common/Input';
import Button from '../common/Button';

const EmailStep = ({ onNext, formData, setFormData }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Очищаем ошибку для поля при вводе
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      setErrors({ email: 'Email обязателен' });
      return;
    }
    
    if (!validateEmail(formData.email)) {
      setErrors({ email: 'Неверный формат email' });
      return;
    }

    setLoading(true);
    try {
      await api.sendVerificationCode(formData.email);
      toast.success('Код верификации отправлен на ваш email');
      onNext();
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

      <div className="z-10 bg-white rounded-3xl p-6 sm:p-8 shadow-xl w-full max-w-md border border-gray-200">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Регистрация</h2>
          <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
            Введите ваш email для получения кода верификации
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="example@university.edu"
            error={errors.email}
            required
          />
          
          <Button type="submit" loading={loading} className="w-full">
            Отправить код
          </Button>

          <div className="text-center">
            <a
              href="/login"
              className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              У меня уже есть аккаунт
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailStep; 