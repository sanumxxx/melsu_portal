import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiService, { getErrorMessage } from '../../services/api';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiService.login(formData.email, formData.password);
      
      // Получаем информацию о пользователе
      const userInfo = await apiService.getUserProfile();
      
      onLogin(userInfo.data);
    } catch (error) {
      console.error('Login failed:', error);
      setError(getErrorMessage(error) || 'Ошибка входа в систему');
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
        <h1 className="auth-title">Вход в систему</h1>
        <p className="auth-subtitle">Добро пожаловать в университетский портал</p>
        
        <form onSubmit={handleSubmit}>
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
          
          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Введите пароль"
            />
          </div>

          {error && <div className="error">{error}</div>}
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Вход...
              </>
            ) : (
              'Войти'
            )}
          </button>
        </form>
        
        <div className="auth-link">
          <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login; 