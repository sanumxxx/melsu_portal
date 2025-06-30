import React, { useState, useRef, useEffect } from 'react';
import { CloudArrowUpIcon, XMarkIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import FilePreview from 'reactjs-file-preview';
import OfficePreview from './OfficePreview';
import OfficePreviewInfo from './OfficePreviewInfo';
import api, { getErrorMessage } from '../../services/api';
import { Alert } from './Alert';
import Button from './Button';

const FieldFileUpload = ({ 
  requestId, 
  fieldName, 
  onFilesChanged, 
  disabled = false,
  multiple = true 
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showPreview, setShowPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  useEffect(() => {
    if (requestId && fieldName) {
      loadFiles();
    }
  }, [requestId, fieldName]);

  const loadFiles = async () => {
    try {
      const response = await api.get(`/api/requests/${requestId}/fields/${fieldName}/files`);
      setUploadedFiles(response.data);
      if (onFilesChanged) {
        onFilesChanged(response.data);
      }
    } catch (err) {
      console.error('Ошибка загрузки файлов:', err);
      // Не показываем ошибку, если файлов просто нет
    }
  };

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return `Файл ${file.name} слишком большой. Максимальный размер: 10MB`;
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Файл ${file.name} имеет неподдерживаемый формат`;
    }
    
    return null;
  };

  const handleFiles = (files) => {
    const fileArray = Array.from(files);
    const validFiles = [];
    let hasErrors = false;

    // Валидация файлов
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        setError(error);
        hasErrors = true;
        break;
      }
      validFiles.push(file);
    }

    if (!hasErrors) {
      setError(null);
      if (multiple) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
      } else {
        setSelectedFiles(validFiles.slice(0, 1)); // Только один файл
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (disabled) return;
    
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    console.log('🔄 Начинаем загрузку файлов:', {
      requestId,
      fieldName,
      filesCount: selectedFiles.length,
      files: selectedFiles.map(f => ({ name: f.name, size: f.size }))
    });

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      selectedFiles.forEach((file, index) => {
        console.log(`📎 Добавляем файл ${index + 1}:`, {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        });
        formData.append('files', file);
      });

      // Выводим содержимое FormData
      console.log('📋 FormData содержит:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? 
          `File(${value.name}, ${value.size} bytes)` : value
        );
      }

      const uploadUrl = `/api/requests/${requestId}/fields/${fieldName}/files/upload`;
      console.log('📤 Отправляем файлы на URL:', uploadUrl);
      console.log('📋 RequestId:', requestId, 'FieldName:', fieldName);

      const response = await api.post(uploadUrl, formData);
      // Не устанавливаем Content-Type вручную - браузер сам добавит boundary

      console.log('✅ Файлы успешно загружены:', response.data);
      setSelectedFiles([]);
      await loadFiles(); // Перезагружаем список файлов

    } catch (err) {
      console.error('❌ Ошибка загрузки файлов:', err);
      console.error('Тип ошибки:', typeof err);
      console.error('Есть ли response:', !!err.response);
      console.error('Статус:', err.response?.status);
      console.error('Детали ошибки:', err.response?.data);
      console.error('Полный ответ:', err.response);
      console.error('Исходное сообщение:', err.message);
      console.error('Полный объект ошибки:', JSON.stringify(err, null, 2));
      
      let errorMessage = 'Неизвестная ошибка';
      if (err.response?.data?.detail) {
        errorMessage = Array.isArray(err.response.data.detail) 
          ? err.response.data.detail.map(e => e.msg || e).join(', ')
          : err.response.data.detail;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message && err.message !== '[object Object]') {
        errorMessage = err.message;
      } else if (err.response?.status) {
        errorMessage = `HTTP ${err.response.status}`;
      }
      
      setError('Ошибка загрузки файлов: ' + errorMessage);
    } finally {
      setUploading(false);
    }
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

  const handleDeleteFile = async (fileId) => {
    try {
      await api.delete(`/api/files/${fileId}`);
      await loadFiles(); // Перезагружаем список файлов
    } catch (err) {
      console.error('Ошибка удаления файла:', err);
      setError('Ошибка удаления файла: ' + getErrorMessage(err));
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

  const canPreview = (contentType) => {
    return (
      contentType.startsWith('image/') ||
      contentType === 'application/pdf' ||
      contentType.startsWith('text/') ||
      contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      contentType.includes('word') ||
      contentType.includes('excel') ||
      contentType.includes('spreadsheet')
    );
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

  return (
    <div className="space-y-4">
      {/* Drag & Drop зона */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : disabled
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDrag}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          onChange={handleChange}
          disabled={disabled || uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept={ALLOWED_TYPES.join(',')}
        />
        
        <CloudArrowUpIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700 mb-1">
          {dragActive ? 'Отпустите файлы здесь' : `Перетащите ${multiple ? 'файлы' : 'файл'} сюда`}
        </p>
        <p className="text-xs text-gray-500 mb-2">
          или{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            выберите {multiple ? 'файлы' : 'файл'}
          </button>
        </p>
        <p className="text-xs text-gray-400">
          Максимальный размер: 10MB
        </p>
      </div>

      {/* Загруженные файлы */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-gray-700">
            Загруженные файлы ({uploadedFiles.length})
          </h5>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="text-lg">
                    {getFileIcon(file.content_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {canPreview(file.content_type) && (
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
                  {!disabled && (
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Удалить файл"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Список выбранных файлов */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-gray-700">
            Выбранные файлы ({selectedFiles.length})
          </h5>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg border border-yellow-200"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                  className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Кнопка загрузки */}
      {selectedFiles.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={uploadFiles}
            disabled={uploading || disabled}
            variant="primary"
            size="sm"
          >
            {uploading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Загрузка...
              </div>
            ) : (
              `Загрузить файлы (${selectedFiles.length})`
            )}
          </Button>
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <Alert variant="error" message={error} />
      )}

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

export default FieldFileUpload; 