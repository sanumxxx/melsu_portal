import React, { useState, useEffect, useRef } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline';

const UserSearch = ({ onSelect, placeholder = "Поиск пользователей...", className = "" }) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);
  
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (query.length >= 2) {
      searchUsers();
    } else {
      setUsers([]);
      setIsOpen(false);
    }
  }, [query]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/requests/users/search', {
        params: { q: query, limit: 10 }
      });
      
      setUsers(response.data);
      setIsOpen(true);
    } catch (err) {
      console.error('Ошибка поиска пользователей:', err);
      setError('Ошибка поиска: ' + getErrorMessage(err));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (user) => {
    setQuery(user.display_name);
    setIsOpen(false);
    onSelect(user);
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (e.target.value.length < 2) {
      setUsers([]);
      setIsOpen(false);
    }
  };

  const handleInputFocus = () => {
    if (users.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Dropdown с результатами */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none"
        >
          {error ? (
            <div className="px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          ) : users.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              {query.length >= 2 ? 'Пользователи не найдены' : 'Введите минимум 2 символа'}
            </div>
          ) : (
            users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelect(user)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center space-x-3"
              >
                <UserIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">
                    {user.display_name}
                  </div>
                  <div className="text-gray-500 truncate">
                    {user.email}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearch; 