import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

const UserSelect = ({ 
  value = [], 
  onChange, 
  multiple = false, 
  placeholder = "Начните вводить имя или email...",
  className = "",
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [initializing, setInitializing] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Функция для загрузки пользователей по email
  const loadUsersByEmails = async (emails) => {
    if (!emails || emails.length === 0) return [];
    
    try {
      setInitializing(true);
      const userPromises = emails.map(async (email) => {
        try {
          // Попробуем найти пользователя через поиск
          const response = await api.get(`/api/auth/search?q=${encodeURIComponent(email)}&limit=1`);
          const foundUser = response.data.find(u => u.email === email);
          if (foundUser) {
            return foundUser;
          }
          // Если пользователь не найден, создаем объект с минимальной информацией
          return {
            email: email,
            full_name: email,
            first_name: '',
            last_name: '',
            middle_name: '',
            id: null
          };
        } catch (error) {
          console.error(`Ошибка загрузки пользователя ${email}:`, error);
          return {
            email: email,
            full_name: email,
            first_name: '',
            last_name: '',
            middle_name: '',
            id: null
          };
        }
      });
      
      const loadedUsers = await Promise.all(userPromises);
      return loadedUsers;
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      return [];
    } finally {
      setInitializing(false);
    }
  };

  // Инициализация выбранных пользователей
  useEffect(() => {
    const initializeUsers = async () => {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          setSelectedUsers([]);
        } else if (typeof value[0] === 'string') {
          // value содержит массив email'ов
          const loadedUsers = await loadUsersByEmails(value);
          setSelectedUsers(loadedUsers);
        } else {
          // value уже содержит объекты пользователей
          setSelectedUsers(value);
        }
      } else if (value) {
        if (typeof value === 'string') {
          // value содержит один email
          const loadedUsers = await loadUsersByEmails([value]);
          setSelectedUsers(loadedUsers);
        } else {
          // value содержит объект пользователя
          setSelectedUsers([value]);
        }
      } else {
        setSelectedUsers([]);
      }
    };

    initializeUsers();
  }, [value]);

  // Поиск пользователей с задержкой
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        await searchUsers(searchTerm);
      } else {
        setUsers([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Закрытие dropdown при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchUsers = async (query) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/auth/search?q=${encodeURIComponent(query)}&limit=10`);
      setUsers(response.data);
    } catch (error) {
      console.error('Ошибка поиска пользователей:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    let newSelection;
    
    if (multiple) {
      const isAlreadySelected = selectedUsers.some(u => u.email === user.email);
      if (isAlreadySelected) {
        newSelection = selectedUsers.filter(u => u.email !== user.email);
      } else {
        newSelection = [...selectedUsers, user];
      }
    } else {
      newSelection = [user];
      setIsOpen(false);
    }

    setSelectedUsers(newSelection);
    setSearchTerm('');
    
    // Передаем значения в родительский компонент
    if (multiple) {
      onChange(newSelection.map(u => u.email));
    } else {
      onChange(newSelection.length > 0 ? newSelection[0].email : '');
    }
  };

  const handleRemoveUser = (userToRemove) => {
    const newSelection = selectedUsers.filter(u => u.email !== userToRemove.email);
    setSelectedUsers(newSelection);
    
    if (multiple) {
      onChange(newSelection.map(u => u.email));
    } else {
      onChange('');
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const isUserSelected = (user) => {
    return selectedUsers.some(u => u.email === user.email);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Индикатор загрузки инициализации */}
      {initializing && (
        <div className="mb-2 text-sm text-gray-500">
          Загрузка пользователей...
        </div>
      )}

      {/* Выбранные пользователи */}
      {selectedUsers.length > 0 && !initializing && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <div
              key={user.email}
              className="inline-flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full"
            >
              <UserIcon className="w-4 h-4 mr-1" />
              {user.full_name && user.full_name !== user.email 
                ? user.full_name 
                : (user.first_name && user.last_name 
                  ? `${user.last_name} ${user.first_name}` 
                  : user.email)}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveUser(user)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Поле ввода */}
      <div className="relative">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            disabled={disabled || initializing}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Dropdown с результатами */}
        {isOpen && !disabled && !initializing && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {loading && (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Поиск...
              </div>
            )}

            {!loading && searchTerm.length < 2 && (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Введите минимум 2 символа для поиска
              </div>
            )}

            {!loading && searchTerm.length >= 2 && users.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Пользователи не найдены
              </div>
            )}

            {!loading && users.length > 0 && (
              <div className="py-1">
                {users.map((user) => {
                  const isSelected = isUserSelected(user);
                  return (
                    <button
                      key={user.email}
                      type="button"
                      onClick={() => handleUserSelect(user)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
                        isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <UserIcon className="w-4 h-4 mr-3 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {user.full_name || `${user.first_name} ${user.last_name}`}
                          </div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                          {user.roles && user.roles.length > 0 && (
                            <div className="text-xs text-gray-400">
                              Роли: {user.roles.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="text-blue-600 text-xs font-medium">
                          Выбран
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Подсказка */}
      {multiple && selectedUsers.length === 0 && !initializing && (
        <p className="mt-1 text-xs text-gray-500">
          Можно выбрать несколько пользователей
        </p>
      )}
    </div>
  );
};

export default UserSelect; 