import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { ArrowDownTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const OfficePreview = ({ blob, file, className = "", onDownload }) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFullDocument, setShowFullDocument] = useState(false);

  // Определяем тип файла
  const getFileType = () => {
    if (!file) return { type: 'документ', isExcel: false };
    
    const filename = file.filename || file.name || '';
    const contentType = file.content_type || file.type || '';
    
    if (contentType.includes('spreadsheet') || 
        contentType.includes('excel') || 
        filename.toLowerCase().includes('.xlsx') || 
        filename.toLowerCase().includes('.xls')) {
      return { type: 'таблицу Excel', isExcel: true };
    }
    
    return { type: 'документ Word', isExcel: false };
  };

  const fileInfo = getFileType();

  useEffect(() => {
    if (!blob) return;

    const convertFile = async () => {
      try {
        setLoading(true);
        setError(null);

        const arrayBuffer = await blob.arrayBuffer();

        if (fileInfo.isExcel) {
          // Конвертация Excel файлов через xlsx библиотеку
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Конвертируем в HTML таблицу
          const htmlTable = XLSX.utils.sheet_to_html(worksheet, {
            id: 'excel-table',
            editable: false
          });
          
          // Оборачиваем в контейнер с информацией о листе
          const excelHtml = `
            <div class="excel-preview">
              <div class="sheet-info">
                <h3>Лист: ${sheetName}</h3>
                <p>Всего листов в файле: ${workbook.SheetNames.length}</p>
                ${workbook.SheetNames.length > 1 ? 
                  `<p>Доступные листы: ${workbook.SheetNames.join(', ')}</p>` : 
                  ''
                }
              </div>
              ${htmlTable}
            </div>
          `;
          
          setHtmlContent(excelHtml);
        } else {
          // Конвертация Word файлов через mammoth
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setHtmlContent(result.value);
          
          if (result.messages.length > 0) {
            console.warn('Предупреждения при конвертации Office файла:', result.messages);
          }
        }
      } catch (err) {
        console.error('Ошибка конвертации Office файла:', err);
        setError(`Не удалось отобразить ${fileInfo.type}`);
      } finally {
        setLoading(false);
      }
    };

    convertFile();
  }, [blob, fileInfo.type, fileInfo.isExcel]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Обработка {fileInfo.type}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 text-red-500 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <p className="font-medium">{error}</p>
          <p className="text-sm text-gray-500 mt-2">
            {fileInfo.isExcel ? 
              'Для просмотра Excel файлов скачайте файл и откройте в Microsoft Excel' :
              'Попробуйте скачать файл для просмотра в Word'
            }
          </p>
          {onDownload && (
            <button
              onClick={onDownload}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Скачать файл
            </button>
          )}
        </div>
      </div>
    );
  }



  return (
    <div className={`office-preview ${className}`}>
      {/* Предупреждение о ограничениях */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-800">
              {fileInfo.isExcel ? 'Excel просмотр' : 'Word просмотр'}
            </p>
            <p className="text-blue-700 mt-1">
              {fileInfo.isExcel ? 
                'Отображается структура и данные таблицы. Формулы показаны как результаты, макросы и сложное форматирование могут не отображаться.' :
                'Отображается основной текст. Колонтитулы, точное позиционирование, сложное форматирование и изображения могут не отображаться корректно.'
              }
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                >
                  <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                  Скачать оригинал
                </button>
              )}
              <button
                onClick={() => setShowFullDocument(!showFullDocument)}
                className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-xs font-medium rounded hover:bg-gray-700 transition-colors"
              >
                {showFullDocument ? 'Свернуть' : 'Развернуть документ'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Документ */}
      <div 
        className={`prose prose-sm max-w-none p-4 bg-white border rounded-lg transition-all duration-200 ${
          showFullDocument ? 'max-h-none' : 'max-h-96 overflow-hidden'
        }`}
        style={{
          fontFamily: 'Times New Roman, serif',
          lineHeight: '1.6',
          color: '#333'
        }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {/* Градиент внизу когда документ свернут */}
      {!showFullDocument && htmlContent.length > 1000 && (
        <div className="relative -mt-20 h-20 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
      )}
      
      <style jsx>{`
        .office-preview .prose h1,
        .office-preview .excel-preview h3 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 1rem 0;
          color: #1f2937;
        }
        
        .office-preview .prose h2 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 0.875rem 0;
          color: #374151;
        }
        
        .office-preview .prose h3 {
          font-size: 1.125rem;
          font-weight: bold;
          margin: 0.75rem 0;
          color: #4b5563;
        }
        
        .office-preview .prose p {
          margin: 0.5rem 0;
          text-align: justify;
        }
        
        .office-preview .prose ul, 
        .office-preview .prose ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        
        .office-preview .prose li {
          margin: 0.25rem 0;
        }
        
        .office-preview .prose table,
        .office-preview .excel-preview table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
          font-size: 0.875rem;
        }
        
        .office-preview .prose td, 
        .office-preview .prose th,
        .office-preview .excel-preview td,
        .office-preview .excel-preview th {
          border: 1px solid #d1d5db;
          padding: 0.5rem;
          text-align: left;
        }
        
        .office-preview .prose th,
        .office-preview .excel-preview th {
          background-color: #f0f9ff;
          font-weight: 600;
          color: #1e40af;
        }
        
        .office-preview .excel-preview .sheet-info {
          background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%);
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          border: 1px solid #bae6fd;
        }
        
        .office-preview .excel-preview .sheet-info h3 {
          color: #1e40af;
          margin: 0 0 0.5rem 0;
          font-size: 1.125rem;
        }
        
        .office-preview .excel-preview .sheet-info p {
          color: #0369a1;
          margin: 0.25rem 0;
          font-size: 0.875rem;
        }
        
        .office-preview .prose blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #6b7280;
        }
        
        .office-preview .prose strong {
          font-weight: 600;
          color: #1f2937;
        }
        
        .office-preview .prose em {
          font-style: italic;
        }
        
        .office-preview .excel-preview table tr:nth-child(even) {
          background-color: #f8fafc;
        }
        
        .office-preview .excel-preview table tr:hover {
          background-color: #f1f5f9;
        }
      `}</style>
    </div>
  );
};

export default OfficePreview; 