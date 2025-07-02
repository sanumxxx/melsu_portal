import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../services/api';
import Button from '../common/Button';
import CodeInput from '../common/CodeInput';

const CodeStep = ({ onNext, onPrev, formData }) => {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [errors, setErrors] = useState({});
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Таймер обратного отсчета для повторной отправки
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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
    if (resendCooldown > 0) {
      toast.error(`Подождите ${resendCooldown} секунд перед повторной отправкой`);
      return;
    }

    setResendLoading(true);
    try {
      await api.sendVerificationCode(formData.email);
      toast.success('Новый код отправлен на email');
      setResendCooldown(60); // Устанавливаем кулдаун 60 секунд
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      // Проверяем, это ли ошибка rate limiting
      if (error.response?.status === 429 || errorMessage.includes('слишком часто')) {
        toast.error('Слишком частые запросы. Попробуйте снова через минуту.');
        setResendCooldown(60);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setResendLoading(false);
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
              disabled={resendLoading || resendCooldown > 0}
              className={`transition-colors ${
                resendLoading || resendCooldown > 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-800 underline'
              }`}
            >
              {resendLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Отправка...
                </span>
              ) : resendCooldown > 0 ? (
                `Отправить новый код (${resendCooldown}с)`
              ) : (
                'Отправить новый код'
              )}
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