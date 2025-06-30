import React, { useState, useEffect } from 'react';
import FilePreview from 'reactjs-file-preview';
import OfficePreview from './OfficePreview';
import OfficePreviewInfo from './OfficePreviewInfo';
import { 
  DocumentIcon, 
  ArrowDownTrayIcon, 
  EyeIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import api, { getErrorMessage } from '../../services/api';
import { Alert } from './Alert';
import Button from './Button';

const RequestFilesDisplay = ({ 
  requestId, 
  canDelete = false,
  className = "" 
}) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (requestId) {
      loadFiles();
    }
  }, [requestId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/api/requests/${requestId}/files`);
      setFiles(response.data);
    } catch (err) {
      console.error('Ошибка загрузки файлов:', err);
      setError('Ошибка загрузки файлов: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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
    } else if (contentType.includes('word') || contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
              return '';
      } else if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
        return '';
    } else if (contentType.startsWith('text/')) {
      return '📄';
    }
    return '📎';
  };

  const handleDownload = async (file) => {
    try {
      const response = await api.get(`/api/files/${file.id}/download`, {
        responseType: 'blob',
      });
      
      // Создаем URL для скачивания
      const url = window.URL.createObjectURL(response.data);
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

  const handleDelete = async (file) => {
    if (!window.confirm(`Вы уверены, что хотите удалить файл "${file.filename}"?`)) {
      return;
    }

    try {
      setDeleting(file.id);
      await api.delete(`/api/files/${file.id}`);
      
      await loadFiles(); // Перезагружаем список файлов
    } catch (err) {
      console.error('Ошибка удаления файла:', err);
      setError('Ошибка удаления файла: ' + getErrorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  const getPreviewData = async (file) => {
    try {
      // Для Office файлов (DOCX, XLSX) используем HTML просмотр
      if (file.content_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          file.content_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.content_type.includes('word') ||
          file.content_type.includes('excel') ||
          file.content_type.includes('spreadsheet')) {
        
        // Получаем blob для HTML обработки через OfficePreview
        const response = await api.get(`/api/files/${file.id}/preview`, {
          responseType: 'blob',
        });
        console.log('✅ Blob файл получен для HTML просмотра Office файла');
        return { type: 'blob', data: response.data };
      } else {
        // Для остальных файлов используем URL просмотр
        const response = await api.get(`/api/files/${file.id}/preview`, {
          responseType: 'blob',
        });
        return { type: 'url', data: window.URL.createObjectURL(response.data) };
      }
    } catch (err) {
      console.error('Ошибка загрузки файла для предварительного просмотра:', err);
      return null;
    }
  };

  const canPreview = (file) => {
    return (
      file.content_type.startsWith('image/') ||
      file.content_type === 'application/pdf' ||
      file.content_type.startsWith('text/') ||
      file.content_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.content_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.content_type.includes('word') ||
      file.content_type.includes('excel') ||
      file.content_type.includes('spreadsheet')
    );
  };

  // Группируем файлы по полям
  const groupedFiles = files.reduce((acc, file) => {
    const fieldName = file.field_name || 'Без поля';
    if (!acc[fieldName]) {
      acc[fieldName] = [];
    }
    acc[fieldName].push(file);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Загрузка файлов...</span>
      </div>
    );
  }

  if (error) {
    return <Alert variant="error" message={error} />;
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
    <div className={`space-y-4 ${className}`}>
      {Object.entries(groupedFiles).map(([fieldName, fieldFiles]) => (
        <div key={fieldName} className="space-y-3">
          <h5 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">
            {fieldName} ({fieldFiles.length} {fieldFiles.length === 1 ? 'файл' : 'файлов'})
          </h5>
          
          <div className="space-y-2">
            {fieldFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="text-lg">
                    {getFileIcon(file.content_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h6 className="text-sm font-medium text-gray-900 truncate">
                      {file.filename}
                    </h6>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>

                {/* Действия */}
                <div className="flex items-center space-x-2 ml-2">
                  {canPreview(file) && (
                    <button
                      onClick={async () => {
                        setShowPreview(file);
                        setLoadingPreview(true);
                        setPreviewUrl(null);
                        setPreviewBlob(null);
                        
                        const previewData = await getPreviewData(file);
                        if (previewData) {
                          if (previewData.type === 'blob') {
                            setPreviewBlob(previewData.data);
                            setPreviewUrl(null);
                          } else {
                            setPreviewUrl(previewData.data);
                            setPreviewBlob(null);
                          }
                        }
                        setLoadingPreview(false);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Предварительный просмотр"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                    title="Скачать файл"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </button>

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(file)}
                      disabled={deleting === file.id}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Удалить файл"
                    >
                      {deleting === file.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                      ) : (
                        <XMarkIcon className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Модальное окно предварительного просмотра */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-full w-full h-full flex flex-col">
            {/* Заголовок модального окна */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {showPreview.filename}
              </h3>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handleDownload(showPreview)}
                  variant="outline"
                  size="sm"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Скачать
                </Button>
                <button
                  onClick={() => {
                    setShowPreview(null);
                    setPreviewUrl(null);
                    setPreviewBlob(null);
                    setLoadingPreview(false);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Контент предварительного просмотра */}
            <div className="flex-1 p-4 overflow-auto">
              {loadingPreview ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">Загрузка...</span>
                </div>
              ) : previewBlob ? (
                <OfficePreview 
                  blob={previewBlob} 
                  file={showPreview}
                  className="h-full" 
                  onDownload={() => handleDownload(showPreview)}
                />
              ) : previewUrl ? (
                // Для всех не-Office файлов используем FilePreview
                <FilePreview
                  preview={previewUrl}
                  fileType={showPreview.content_type.startsWith('image/') ? 'image' : 
                            showPreview.content_type === 'application/pdf' ? 'pdf' : 'text'}
                  placeHolderImage="/placeholder-file.png"
                  errorImage="/error-file.png"
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  Ошибка загрузки предварительного просмотра
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestFilesDisplay; 