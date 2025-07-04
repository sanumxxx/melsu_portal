import React, { useState, useEffect } from 'react';
import { CheckBadgeIcon, LinkIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

const TelegramConnect = () => {
  const [telegramStatus, setTelegramStatus] = useState({ connected: false, loading: true });
  const [telegramLink, setTelegramLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetchTelegramStatus();
  }, []);

  const fetchTelegramStatus = async () => {
    try {
      const response = await api.get('/api/telegram/status');
      setTelegramStatus({ ...response.data, loading: false });
    } catch (error) {
      console.error('Ошибка загрузки статуса Telegram:', error);
      setTelegramStatus({ connected: false, loading: false });
    }
  };

  const generateTelegramLink = async () => {
    setGeneratingLink(true);
    try {
      const response = await api.post('/api/telegram/generate-link');
      setTelegramLink(response.data.telegram_link);
      
      // Открываем ссылку в новом окне
      window.open(response.data.telegram_link, '_blank');
      
      // Периодически проверяем статус подключения
      const checkInterval = setInterval(async () => {
        try {
          const statusResponse = await api.get('/api/telegram/status');
          if (statusResponse.data.connected) {
            setTelegramStatus({ ...statusResponse.data, loading: false });
            setTelegramLink('');
            clearInterval(checkInterval);
            alert('✅ Telegram успешно подключен!');
          }
        } catch (error) {
          console.error('Ошибка проверки статуса:', error);
        }
      }, 3000);
      
      // Останавливаем проверку через 10 минут
      setTimeout(() => {
        clearInterval(checkInterval);
        setTelegramLink('');
      }, 600000);
      
    } catch (error) {
      console.error('Ошибка генерации ссылки:', error);
      alert('Ошибка генерации ссылки для подключения');
    } finally {
      setGeneratingLink(false);
    }
  };

  const disconnectTelegram = async () => {
    if (!confirm('Вы уверены, что хотите отключить Telegram?')) {
      return;
    }
    
    setDisconnecting(true);
    try {
      await api.delete('/api/telegram/disconnect');
      setTelegramStatus({ connected: false, loading: false });
      alert('✅ Telegram успешно отключен!');
    } catch (error) {
      console.error('Ошибка отключения Telegram:', error);
      alert('Ошибка отключения Telegram');
    } finally {
      setDisconnecting(false);
    }
  };

  const getTelegramUrl = () => {
    if (telegramStatus.telegram_username) {
      return `https://t.me/${telegramStatus.telegram_username}`;
    }
    return null;
  };

  if (telegramStatus.loading) {
    return (
      <div className="social-network-card animate-pulse">
        <div className="h-16 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="social-network-card">
      <div className="flex flex-col gap-4">
        {/* Заголовок с иконкой */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Telegram</h4>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                  telegramStatus.connected 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  {telegramStatus.connected ? (
                    <>
                      <CheckBadgeIcon className="w-3 h-3 mr-1" />
                      Подключен
                    </>
                  ) : (
                    'Не подключен'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Информация о пользователе */}
        {telegramStatus.connected && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                <UserIcon className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">
                  Telegram ID: {telegramStatus.telegram_id}
                </span>
              </div>
              {telegramStatus.telegram_username && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-blue-600">@</span>
                  <span className="font-medium text-blue-600">
                    {telegramStatus.telegram_username}
                  </span>
                </div>
              )}
              {telegramStatus.connected_at && (
                <div className="text-xs text-gray-500">
                  Подключен: {new Date(telegramStatus.connected_at).toLocaleString('ru-RU')}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Процесс подключения */}
        {telegramLink && (
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-2">Для завершения подключения:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Откройте Telegram (ссылка уже открыта в новом окне)</li>
                <li>Нажмите "Start" или "Начать"</li>
                <li>Дождитесь подтверждения подключения</li>
              </ol>
              <button
                onClick={() => window.open(telegramLink, '_blank')}
                className="mt-2 text-blue-600 hover:text-blue-800 text-xs underline"
              >
                Открыть ссылку снова
              </button>
            </div>
          </div>
        )}
        
        {/* Действия */}
        <div className="flex flex-col sm:flex-row gap-2">
          {telegramStatus.connected ? (
            <>
              {getTelegramUrl() && (
                <a 
                  href={getTelegramUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-button primary flex-1 justify-center"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Открыть профиль
                </a>
              )}
              <button
                onClick={disconnectTelegram}
                disabled={disconnecting}
                className="social-button danger flex-1 justify-center"
                title="Отключить Telegram"
              >
                {disconnecting ? (
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <XMarkIcon className="w-4 h-4 mr-2" />
                )}
                Отключить
              </button>
            </>
          ) : (
            <button
              onClick={generateTelegramLink}
              disabled={generatingLink}
              className="social-button primary w-full justify-center"
            >
              {generatingLink ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Генерация ссылки...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  Подключить Telegram
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramConnect; 