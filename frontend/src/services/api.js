// Простая авторизация для портала МелГУ

const API_BASE_URL = "http://localhost:8000";
class ApiService {
  constructor() {
    this.accessToken = null; // Будем получать динамически
  }

  // Метод для получения актуального токена
  getCurrentToken() {
    const token = localStorage.getItem('token');
    console.log('🔍 getCurrentToken: Retrieved from localStorage:', token ? 'Present' : 'Not found');
    
    // Проверяем валидность токена
    if (token && !this.isTokenValid(token)) {
      console.warn('⚠️ getCurrentToken: Token expired, clearing token');
      this.clearToken();
      return null;
    }
    
    this.accessToken = token; // Обновляем внутренний токен
    console.log('✅ getCurrentToken: Valid token ready for use');
    return token;
  }

  // Проверка валидности токена
  isTokenValid(token) {
    if (!token) return false;
    
    try {
      // Простая проверка структуры JWT токена
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Декодируем payload без верификации подписи (для проверки времени)
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // Проверяем не истек ли токен
      return payload.exp && payload.exp > now;
    } catch (error) {
      console.warn('Token validation error:', error);
      return false;
    }
  }

  // Методы авторизации
  
  /**
   * Вход в систему
   */
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Login error:', errorData);
      throw {
        response: {
          data: {
            detail: errorData.detail || 'Ошибка входа'
          }
        }
      };
    }

    const data = await response.json();
    console.log('Login successful:', data);
    this.setToken(data.access_token);
    
    return { data: { token: data.access_token } };
  }

  /**
   * Регистрация пользователя
   */
  async register(userData) {
    console.log('Registering user with data:', userData);
    
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Registration error:', errorData);
      throw {
        response: {
          data: {
            detail: errorData.detail || 'Ошибка регистрации'
          }
        }
      };
    }

    const data = await response.json();
    console.log('Registration successful:', data);
    this.setToken(data.access_token);
    
    return { data: { token: data.access_token } };
  }

  /**
   * Отправка кода верификации на email
   */
  async sendVerificationCode(email) {
    const response = await fetch(`${API_BASE_URL}/auth/send-verification-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw {
        response: {
          data: {
            detail: errorData.detail || 'Ошибка отправки кода'
          }
        }
      };
    }

    return await response.json();
  }

  /**
   * Проверка кода верификации
   */
  async verifyCode(email, code) {
    const response = await fetch(`${API_BASE_URL}/auth/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw {
        response: {
          data: {
            detail: errorData.detail || 'Неверный код'
          }
        }
      };
    }

    return await response.json();
  }

  /**
   * Получает профиль пользователя через /api/profile/basic
   */
  async getUserProfile() {
    const token = this.getCurrentToken(); // Получаем актуальный токен
    console.log('🔐 getUserProfile: Token status:', token ? 'Valid' : 'Invalid/Missing');
    
    if (!token) {
      console.log('❌ getUserProfile: No valid token found');
      throw new Error('No valid token available');
    }
    
    console.log('📞 getUserProfile: Making request to', `${API_BASE_URL}/api/profile/basic`);
    
    const response = await fetch(`${API_BASE_URL}/api/profile/basic`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('📡 getUserProfile: Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ getUserProfile: Error response:', errorText);
      
      if (response.status === 401) {
        console.log('🚪 getUserProfile: Token expired, logging out');
        this.logout();
        throw new Error('Сессия истекла, войдите снова');
      }
      throw new Error(`Ошибка получения профиля: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ getUserProfile: Success', data);
    return { data };
  }

  /**
   * Получает информацию о пользователе (алиас для getUserProfile)
   */
  async getUserInfo() {
    return this.getUserProfile();
  }

  /**
   * Получает текущего пользователя через /auth/me
   */
  async getCurrentUser() {
    const token = this.getCurrentToken(); // Получаем актуальный токен
    
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        throw new Error('Сессия истекла, войдите снова');
      }
      throw new Error('Ошибка получения данных пользователя');
    }

    const data = await response.json();
    return { data };
  }

  // Вспомогательные методы

  setToken(accessToken) {
    this.accessToken = accessToken;
    if (accessToken) {
      localStorage.setItem('token', accessToken);
    }
  }

  clearToken() {
    this.accessToken = null;
    localStorage.removeItem('token');
  }

  isAuthenticated() {
    const token = this.getCurrentToken(); // Проверяем актуальный токен
    return !!token && this.isTokenValid(token);
  }

  logout() {
    console.log('🚪 logout: Clearing token and redirecting if needed');
    this.clearToken();
    // Перенаправляем на страницу входа если мы не находимся на ней
    if (window.location.pathname !== '/login' && window.location.pathname !== '/' && window.location.pathname !== '/register') {
      console.log('🔄 logout: Redirecting to login from', window.location.pathname);
      window.location.href = '/login';
    }
  }

  /**
   * Выполняет аутентифицированный запрос к API
   */
  async makeAuthenticatedRequest(url, options = {}) {
    const token = this.getCurrentToken(); // Получаем актуальный токен
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const config = {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const response = await fetch(url, config);

    if (response.status === 401) {
      // Токен недействителен, очищаем
      this.logout();
      throw new Error('Сессия истекла, войдите снова');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Ошибка запроса');
    }

    return await response.json();
  }

  // Универсальные HTTP методы

  /**
   * GET запрос
   */
  async get(endpoint, options = {}) {
    const { params, responseType, ...fetchOptions } = options;
    let url = `${API_BASE_URL}${endpoint}`;
    
    // Добавляем параметры запроса если есть
    if (params) {
      const searchParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          searchParams.append(key, params[key]);
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const token = this.getCurrentToken(); // Получаем актуальный токен
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      ...fetchOptions.headers
    };

    // Добавляем Content-Type только если это не blob запрос
    if (responseType !== 'blob') {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      ...fetchOptions
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('Сессия истекла, войдите снова');
    }

    if (!response.ok) {
      // Для blob ответов не пытаемся парсить как JSON
      if (responseType === 'blob') {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Ошибка запроса');
    }

    // Возвращаем данные в зависимости от типа ответа
    if (responseType === 'blob') {
      const data = await response.blob();
      return { data };
    } else {
      const data = await response.json();
      return { data };
    }
  }

  /**
   * POST запрос
   */
  async post(endpoint, data = {}, options = {}) {
    // Определяем, передается ли FormData
    const isFormData = data instanceof FormData;
    
    const token = this.getCurrentToken(); // Получаем актуальный токен
    
    // Для FormData не устанавливаем Content-Type и не используем JSON.stringify
    const headers = {
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };
    
    // Добавляем Content-Type только если это НЕ FormData
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isFormData ? data : JSON.stringify(data),
      ...options
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('Сессия истекла, войдите снова');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Ошибка запроса');
    }

    const responseData = await response.json();
    return { data: responseData };
  }

  /**
   * PUT запрос
   */
  async put(endpoint, data = {}, options = {}) {
    const token = this.getCurrentToken(); // Получаем актуальный токен
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('Сессия истекла, войдите снова');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Ошибка запроса');
    }

    const responseData = await response.json();
    return { data: responseData };
  }

  /**
   * DELETE запрос
   */
  async delete(endpoint, options = {}) {
    const token = this.getCurrentToken(); // Получаем актуальный токен
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('Сессия истекла, войдите снова');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Ошибка запроса');
    }

    const responseData = await response.json();
    return { data: responseData };
  }

  // Portal API методы

  async getDashboard() {
    return this.makeAuthenticatedRequest(`${API_BASE_URL}/dashboard`);
  }

  async getProfile() {
    return this.makeAuthenticatedRequest(`${API_BASE_URL}/profile`);
  }

  async updateProfile(profileData) {
    return this.makeAuthenticatedRequest(`${API_BASE_URL}/api/profile/extended`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async changePassword(passwordData) {
    return this.makeAuthenticatedRequest(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify(passwordData)
    });
  }

  async getExtendedProfile() {
    return this.makeAuthenticatedRequest(`${API_BASE_URL}/api/profile/basic`);
  }

  async updateExtendedProfile(profileData) {
    return this.makeAuthenticatedRequest(`${API_BASE_URL}/api/profile/extended`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async getSchedule() {
    return this.makeAuthenticatedRequest(`${API_BASE_URL}/schedule`);
  }

  async getGrades() {
    return this.makeAuthenticatedRequest(`${API_BASE_URL}/grades`);
  }

  async getAnnouncements() {
    return this.makeAuthenticatedRequest(`${API_BASE_URL}/announcements`);
  }

  // Проверка здоровья сервисов
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return null;
    }
  }

  // Админские методы
  async makeUserAdmin(userId) {
    return this.makeAuthenticatedRequest(`${API_BASE_URL}/admin/make-admin/${userId}`, {
      method: 'POST'
    });
  }

  async getAllUsers() {
    const result = await this.makeAuthenticatedRequest(`${API_BASE_URL}/admin/users`);
    return { data: result.users || [] };
  }

  async getUsersByRole(role) {
    const result = await this.makeAuthenticatedRequest(`${API_BASE_URL}/admin/users/by-role/${role}`);
    return { data: result.users || [] };
  }

  async updateUserRoles(userId, roles) {
    return this.makeAuthenticatedRequest(`${API_BASE_URL}/admin/users/${userId}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roles })
    });
  }

  // Методы портфолио
  
  /**
   * Получение списка достижений портфолио
   */
  async getPortfolioAchievements(category = null) {
    const params = category ? { category } : {};
    return this.get('/api/portfolio/achievements', { params });
  }

  /**
   * Создание нового достижения
   */
  async createAchievement(achievementData) {
    return this.post('/api/portfolio/achievements', achievementData);
  }

  /**
   * Получение конкретного достижения
   */
  async getAchievement(achievementId) {
    return this.get(`/api/portfolio/achievements/${achievementId}`);
  }

  /**
   * Обновление достижения
   */
  async updateAchievement(achievementId, achievementData) {
    return this.put(`/api/portfolio/achievements/${achievementId}`, achievementData);
  }

  /**
   * Удаление достижения
   */
  async deleteAchievement(achievementId) {
    return this.delete(`/api/portfolio/achievements/${achievementId}`);
  }

  /**
   * Загрузка файла к достижению
   */
  async uploadPortfolioFile(achievementId, file) {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.post(`/api/portfolio/achievements/${achievementId}/files`, formData);
  }

  /**
   * Удаление файла из портфолио
   */
  async deletePortfolioFile(fileId) {
    return this.delete(`/api/portfolio/files/${fileId}`);
  }

  /**
   * Получение статистики портфолио
   */
  async getPortfolioStats() {
    return this.get('/api/portfolio/stats');
  }
}

const api = new ApiService();
export default api;

// Функция для извлечения текста ошибки
export const getErrorMessage = (error) => {
  // Если это простая строка
  if (typeof error === 'string') {
    return error;
  }
  
  // Если есть message (обычная JavaScript ошибка)
  if (error && error.message) {
    return error.message;
  }
  
  // Если есть структура response.data.detail (ошибки API)
  if (error && error.response && error.response.data && error.response.data.detail) {
    const detail = error.response.data.detail;
    
    // Если detail это строка, возвращаем как есть
    if (typeof detail === 'string') {
      return detail;
    }
    
    // Если detail это массив (ошибки валидации FastAPI/Pydantic)
    if (Array.isArray(detail)) {
      // Извлекаем сообщения из всех ошибок валидации
      const messages = detail.map(err => {
        if (err.msg) {
          // Добавляем поле, если есть loc
          const field = err.loc && err.loc.length > 0 ? err.loc[err.loc.length - 1] : '';
          return field ? `${field}: ${err.msg}` : err.msg;
        }
        return 'Ошибка валидации';
      });
      
      return messages.join(', ');
    }
    
    // Если detail это объект с msg
    if (detail.msg) {
      return detail.msg;
    }
  }
  
  // Fallback для любых других случаев
  return 'Произошла неизвестная ошибка';
};

// Вспомогательная функция для проверки авторизации
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

// Функция для получения токена
export const getToken = () => {
  return localStorage.getItem('token');
};

// Вспомогательная функция для формирования правильных URL медиафайлов
export const getMediaUrl = (mediaUrl) => {
  if (!mediaUrl) return null;
  
  // Если URL уже абсолютный, возвращаем как есть
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    return mediaUrl;
  }
  
  // Если относительный, добавляем базовый URL
  return `${API_BASE_URL}${mediaUrl}`;
};

// Экспорт API базового URL
export { API_BASE_URL }; 