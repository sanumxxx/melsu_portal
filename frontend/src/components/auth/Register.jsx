import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CodeInput from '../common/CodeInput';
import api, { getErrorMessage } from '../../services/api';

const Register = ({ onLogin }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1 = email, 2 = code + form
  const [loading, setLoading] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
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
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    birth_date: '',
    gender: ''
  });

  const [verificationCode, setVerificationCode] = useState(Array(6).fill(''));

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Автоматическая проверка кода при вводе 6 символов
  const handleCodeChange = async (codeArray) => {
    setVerificationCode(codeArray);
    
    // Если введены все 6 цифр, проверяем код
    const codeString = codeArray.join('');
    if (codeString.length === 6) {
      setVerifyingCode(true);
      setError('');
      
      try {
        await api.verifyCode(formData.email, codeString);
        setCodeVerified(true);
        setMessage('Код подтвержден! Заполните остальные поля');
      } catch (error) {
        setCodeVerified(false);
        setError('Неверный код подтверждения');
        // Очищаем поле кода при ошибке
        setVerificationCode(Array(6).fill(''));
      } finally {
        setVerifyingCode(false);
      }
    } else {
      setCodeVerified(false);
      setMessage('');
    }
  };

  // Шаг 1: Отправка кода на email
  const handleSendCode = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      setError('Введите email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.sendVerificationCode(formData.email);
      setMessage('Код подтверждения отправлен на ваш email');
      setCurrentStep(2);
    } catch (error) {
      setError(getErrorMessage(error) || 'Ошибка отправки кода');
    } finally {
      setLoading(false);
    }
  };

  // Повторная отправка кода
  const resendCode = async () => {
    if (resendCooldown > 0) {
      setError(`Подождите ${resendCooldown} секунд перед повторной отправкой`);
      return;
    }

    setResendLoading(true);
    setError('');
    try {
      await api.sendVerificationCode(formData.email);
      setMessage('Новый код отправлен на ваш email');
      setResendCooldown(60); // Устанавливаем кулдаун 60 секунд
      // Сбрасываем состояние проверки кода
      setCodeVerified(false);
      setVerificationCode(Array(6).fill(''));
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      // Проверяем, это ли ошибка rate limiting
      if (error.response?.status === 429 || errorMessage.includes('слишком часто')) {
        setError('Слишком частые запросы. Попробуйте снова через минуту.');
        setResendCooldown(60);
      } else {
        setError(errorMessage);
      }
    } finally {
      setResendLoading(false);
    }
  };

  // Шаг 2: Регистрация с кодом
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!codeVerified) {
      setError('Сначала подтвердите код из email');
      return;
    }

    if (!formData.password || !formData.confirmPassword || 
        !formData.first_name || !formData.last_name || !formData.middle_name || !formData.birth_date || !formData.gender) {
      setError('Заполните все обязательные поля');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userData = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name || '',
        birth_date: formData.birth_date,
        gender: formData.gender,
        verification_code: verificationCode.join('')
      };

      const response = await api.register(userData);
      
      // Получаем данные пользователя после регистрации
      try {
        const userInfo = await api.getUserProfile();
        onLogin(userInfo.data);
      } catch (userError) {
        // Если не удалось получить профиль, просто перенаправляем
        onLogin({ email: formData.email, first_name: formData.first_name, last_name: formData.last_name });
      }
    } catch (error) {
      setError(getErrorMessage(error) || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Анимированный задний фон */}
      <div className="square">
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div className="auth-card">
        <h1 className="auth-title">
          {currentStep === 1 ? 'Регистрация' : 'Завершение регистрации'}
        </h1>
        <p className="auth-subtitle">
          {currentStep === 1 ? 'Создайте аккаунт в системе МелГУ' : 'Заполните ваши данные'}
        </p>

        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        {currentStep === 1 && (
          <form onSubmit={handleSendCode}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Введите ваш email"
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Отправка...
                </>
              ) : (
                'Отправить код'
              )}
            </button>

            <div className="auth-link">
              <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
            </div>
          </form>
        )}

        {currentStep === 2 && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Код подтверждения</label>
              <CodeInput
                value={verificationCode}
                onChange={handleCodeChange}
                length={6}
              />
              {verifyingCode && (
                <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '8px' }}>
                  Проверяем код...
                </p>
              )}
              {!verifyingCode && (
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                  Введите 6-значный код из email
                </p>
              )}
              
              {/* Кнопка повторной отправки */}
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={resendLoading || resendCooldown > 0}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendLoading || resendCooldown > 0 ? '#9ca3af' : '#6b7280',
                    textDecoration: resendLoading || resendCooldown > 0 ? 'none' : 'underline',
                    cursor: resendLoading || resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {resendLoading ? (
                    <>
                      <div className="spinner" style={{ width: '14px', height: '14px' }}></div>
                      Отправка...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Отправить новый код (${resendCooldown}с)`
                  ) : (
                    'Отправить новый код'
                  )}
                </button>
              </div>
            </div>

            {/* Блокируем поля до проверки кода */}
            <fieldset disabled={!codeVerified} style={{ border: 'none', padding: 0, margin: 0 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ 
                opacity: codeVerified ? 1 : 0.5,
                transition: 'opacity 0.3s ease'
              }}>
                <div className="form-group">
                  <label htmlFor="first_name">Имя *</label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    placeholder="Ваше имя"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="last_name">Фамилия *</label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    placeholder="Ваша фамилия"
                  />
                </div>
              </div>

              <div className="form-group" style={{ 
                opacity: codeVerified ? 1 : 0.5,
                transition: 'opacity 0.3s ease'
              }}>
                <label htmlFor="middle_name">Отчество *</label>
                <input
                  type="text"
                  id="middle_name"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleChange}
                  required
                  placeholder="Ваше отчество"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ 
                opacity: codeVerified ? 1 : 0.5,
                transition: 'opacity 0.3s ease'
              }}>
                <div className="form-group">
                  <label htmlFor="birth_date">Дата рождения *</label>
                  <input
                    type="date"
                    id="birth_date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleChange}
                    required
                    placeholder="дд.мм.гггг"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gender">Пол *</label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid #ccc', 
                      borderRadius: '6px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">Выберите пол</option>
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ 
                opacity: codeVerified ? 1 : 0.5,
                transition: 'opacity 0.3s ease'
              }}>
                <label htmlFor="password">Пароль *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Минимум 6 символов"
                />
              </div>

              <div className="form-group" style={{ 
                opacity: codeVerified ? 1 : 0.5,
                transition: 'opacity 0.3s ease'
              }}>
                <label htmlFor="confirmPassword">Подтвердите пароль *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Повторите пароль"
                />
              </div>
            </fieldset>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  setCodeVerified(false);
                  setVerificationCode(Array(6).fill(''));
                  setMessage('');
                }}
                className="btn"
                style={{ 
                  flex: 1, 
                  backgroundColor: '#6b7280', 
                  color: 'white',
                  border: 'none'
                }}
              >
                Назад
              </button>
              
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading || !codeVerified}
                style={{ 
                  flex: 1,
                  opacity: (!codeVerified || loading) ? 0.6 : 1
                }}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Регистрация...
                  </>
                ) : (
                  'Зарегистрироваться'
                )}
              </button>
            </div>

            {!codeVerified && verificationCode.join('').length < 6 && (
              <p style={{ 
                fontSize: '14px', 
                color: '#f59e0b', 
                textAlign: 'center', 
                marginTop: '12px' 
              }}>
                Сначала введите полный код подтверждения
              </p>
            )}

            <div className="auth-link">
              <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register; 