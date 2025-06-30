import React, { useState, useEffect } from 'react';
import FilePreview from 'reactjs-file-preview';
import { 
  DocumentIcon, 
  ArrowDownTrayIcon, 
  EyeIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import api, { getErrorMessage } from '../../services/api';
import { Alert } from './Alert';
import Button from './Button';

const RequestFilePreview = ({ 
  file, 
  canDelete = false, 
  onFileDeleted,
  className = "" 
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (contentType) => {
    if (contentType.startsWith('image/')) {
      return '🖼️';
    } else if (contentType === 'application/pdf') {
      return '📄';
    } else if (contentType.includes('word')) {
              return '';
      } else if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
        return '';
    } else if (contentType.startsWith('text/')) {
      return '📄';
    }
    return '📎';
  };

  const handleDownload = async () => {
    try {
      const response = await api.get(`/api/files/${file.id}/download`, {
        responseType: 'blob',
      });
      
      // Создаем URL для скачивания
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Ошибка скачивания файла:', err);
      setError('Ошибка скачивания файла: ' + getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Вы уверены, что хотите удалить файл "${file.filename}"?`)) {
      return;
    }

    try {
      setDeleting(true);
      await api.delete(`/api/files/${file.id}`);
      
      if (onFileDeleted) {
        onFileDeleted(file.id);
      }
    } catch (err) {
      console.error('Ошибка удаления файла:', err);
      setError('Ошибка удаления файла: ' + getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const getPreviewUrl = () => {
    return `${api.defaults.baseURL}/api/files/${file.id}/preview`;
  };

  const canPreview = () => {
    return (
      file.content_type.startsWith('image/') ||
      file.content_type === 'application/pdf' ||
      file.content_type.startsWith('text/')
    );
  };

  return (
    <div className={`border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Информация о файле */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="text-2xl">
            {getFileIcon(file.content_type)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {file.filename}
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>

        {/* Действия */}
        <div className="flex items-center space-x-2 ml-2">
          {canPreview() && (
            <button
              onClick={() => setShowPreview(true)}
              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
              title="Предварительный просмотр"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
          )}
          
          <button
            onClick={handleDownload}
            className="p-1 text-gray-400 hover:text-green-500 transition-colors"
            title="Скачать файл"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </button>

          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              title="Удалить файл"
            >
              {deleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
              ) : (
                <XMarkIcon className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="mt-3">
          <Alert variant="error" message={error} />
        </div>
      )}

      {/* Модальное окно предварительного просмотра */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-full w-full h-full flex flex-col">
            {/* Заголовок модального окна */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {file.filename}
              </h3>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  size="sm"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Скачать
                </Button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Контент предварительного просмотра */}
            <div className="flex-1 p-4 overflow-auto">
              <FilePreview
                preview={getPreviewUrl()}
                fileType={file.content_type.startsWith('image/') ? 'image' : 
                          file.content_type === 'application/pdf' ? 'pdf' : 'text'}
                placeHolderImage="/placeholder-file.png"
                errorImage="/error-file.png"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Компонент для списка файлов
const FileList = ({ 
  requestId, 
  canDelete = false, 
  onFilesChanged,
  className = "" 
}) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFiles();
  }, [requestId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/api/requests/${requestId}/files`);
      setFiles(response.data);
      
      if (onFilesChanged) {
        onFilesChanged(response.data);
      }
    } catch (err) {
      console.error('Ошибка загрузки файлов:', err);
      setError('Ошибка загрузки файлов: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFileDeleted = (fileId) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
    if (onFilesChanged) {
      onFilesChanged(files.filter(file => file.id !== fileId));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Загрузка файлов...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" message={error} />
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <DocumentIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Файлы не прикреплены</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {files.map((file) => (
        <RequestFilePreview
          key={file.id}
          file={file}
          canDelete={canDelete}
          onFileDeleted={handleFileDeleted}
        />
      ))}
    </div>
  );
};

export { RequestFilePreview, FileList };
export default RequestFilePreview; 