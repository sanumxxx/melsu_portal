import React, { useState, useEffect } from 'react';
import api from '../services/api';

const TestRoles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/roles');
      console.log('Loaded roles:', response.data);
      setRoles(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки ролей:', err);
      setError('Ошибка загрузки ролей: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Загрузка ролей...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Тест API ролей</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Доступные роли ({roles.length})
          </h3>
          
          {roles.length === 0 ? (
            <p className="text-gray-500">Роли не найдены</p>
          ) : (
            <div className="space-y-3">
              {roles.map((role) => (
                <div key={role.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {role.display_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Техническое имя: {role.name}
                      </p>
                      {role.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {role.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        role.is_system 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {role.is_system ? 'Системная' : 'Пользовательская'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        role.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {role.is_active ? 'Активна' : 'Неактивна'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={loadRoles}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Перезагрузить роли
        </button>
      </div>
    </div>
  );
};

export default TestRoles; 