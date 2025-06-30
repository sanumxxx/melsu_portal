import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../services/api';
import Button from '../common/Button';
import CodeInput from '../common/CodeInput';

const CodeStep = ({ onNext, onPrev, formData }) => {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [errors, setErrors] = useState({});

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    const codeString = code.join('');
    if (codeString.length !== 6) {
      setErrors({ code: 'Введите полный код верификации' });
      return;
    }

    setLoading(true);
    try {
      await api.verifyCode(formData.email, codeString);
      toast.success('Код подтвержден');
      onNext(codeString);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setErrors({ code: 'Неверный код верификации' });
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    try {
      await api.sendVerificationCode(formData.email);
      toast.success('Новый код отправлен на email');
    } catch (error) {
      toast.error(getErrorMessage(error));
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
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Подтверждение</h2>
          <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
            Введите код из письма. Мы отправили его на {formData.email}
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-4 sm:space-y-6">
          <CodeInput
            value={code}
            onChange={setCode}
          />
          
          {errors.code && (
            <p className="text-red-600 text-sm text-center bg-red-50 px-3 py-2 rounded-md">
              {errors.code}
            </p>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={resendCode}
              className="text-gray-600 hover:text-gray-800 underline transition-colors"
            >
              Отправить новый код
            </button>
          </div>
          
          <div className="space-y-3">
            <Button type="submit" loading={loading} className="w-full">
              Подтвердить
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

export default CodeStep; 