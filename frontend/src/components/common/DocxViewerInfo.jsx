import React from 'react';
import { 
  InformationCircleIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

const DocxViewerInfo = ({ onClose }) => {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <InformationCircleIcon className="h-6 w-6 mr-2 text-blue-500" />
          Просмотр DOCX документов
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Что поддерживается */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-2 flex items-center">
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            Что отображается корректно:
          </h4>
          <ul className="text-green-700 text-sm space-y-1">
            <li>• Основной текст и абзацы</li>
            <li>• Заголовки (H1, H2, H3)</li>
            <li>• Списки (маркированные и нумерованные)</li>
            <li>• Таблицы (структура и данные)</li>
            <li>• Базовое форматирование (жирный, курсив)</li>
            <li>• Цитаты и блоки текста</li>
          </ul>
        </div>

        {/* Что не поддерживается */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-800 mb-2 flex items-center">
            <XCircleIcon className="h-5 w-5 mr-2" />
            Что может отображаться некорректно:
          </h4>
          <ul className="text-red-700 text-sm space-y-1">
            <li>• Колонтитулы и номера страниц</li>
            <li>• Точное позиционирование и отступы</li>
            <li>• Изображения и диаграммы</li>
            <li>• Сложные таблицы с объединенными ячейками</li>
            <li>• Многоколоночная верстка</li>
            <li>• Фоновые изображения и водяные знаки</li>
            <li>• Специальные шрифты</li>
            <li>• Комментарии и исправления</li>
          </ul>
        </div>

        {/* Рекомендации */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            Рекомендации:
          </h4>
          <div className="text-yellow-700 text-sm space-y-2">
            <p>
              <strong>Для точного просмотра:</strong> Скачайте файл и откройте в Microsoft Word 
              или другом совместимом редакторе.
            </p>
            <p>
              <strong>Для быстрого ознакомления:</strong> Используйте встроенный просмотр 
              для чтения основного содержания.
            </p>
          </div>
        </div>

        {/* Альтернативы */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">
            Альтернативные способы просмотра:
          </h4>
          <div className="text-blue-700 text-sm space-y-2">
            <p>1. <strong>Скачать и открыть локально</strong> - наиболее точное отображение</p>
            <p>2. <strong>Конвертировать в PDF</strong> - для сохранения форматирования при просмотре</p>
            <p>3. <strong>Microsoft Office Online</strong> - для файлов в облачном хранилище</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Понятно
          </button>
        )}
      </div>
    </div>
  );
};

export default DocxViewerInfo; 