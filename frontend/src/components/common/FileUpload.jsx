import React, { useState, useRef } from 'react';
import { CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api, { getErrorMessage } from '../../services/api';
import { Alert } from './Alert';
import Button from './Button';

const FileUpload = ({ requestId, onFilesUploaded, disabled = false }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
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
      setSelectedFiles(prev => [...prev, ...validFiles]);
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

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await api.post(`/api/requests/${requestId}/files/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      setSelectedFiles([]);
      if (onFilesUploaded) {
        onFilesUploaded(response.data);
      }

    } catch (err) {
      console.error('Ошибка загрузки файлов:', err);
      setError('Ошибка загрузки файлов: ' + getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop зона */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
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
          multiple
          onChange={handleChange}
          disabled={disabled || uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept={ALLOWED_TYPES.join(',')}
        />
        
        <CloudArrowUpIcon className="h-10 w-10 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          {dragActive ? 'Отпустите файлы здесь' : 'Перетащите файлы сюда'}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          или{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            выберите файлы
          </button>
        </p>
        <p className="text-xs text-gray-400">
          Поддерживаемые форматы: изображения, PDF, Word, Excel, текстовые файлы
          <br />
          Максимальный размер: 10MB на файл
        </p>
      </div>

      {/* Список выбранных файлов */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Выбранные файлы ({selectedFiles.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
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
    </div>
  );
};

export default FileUpload; 