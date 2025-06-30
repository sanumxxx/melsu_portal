import React from 'react';

const OfficePreviewInfo = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            Умный предварительный просмотр Office файлов
          </h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              <strong>✅ Полноценный HTML просмотр:</strong> DOCX файлы конвертируются через mammoth.js, 
              а XLSX таблицы читаются через SheetJS для отображения в виде интерактивных HTML таблиц.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div>
                <h4 className="font-medium text-blue-800 mb-1">DOCX документы:</h4>
                <ul className="text-xs space-y-1">
                  <li>• Полный HTML рендеринг (mammoth.js)</li>
                  <li>• Заголовки, параграфы, списки</li>
                  <li>• Таблицы Word с форматированием</li>
                  <li>• Жирный, курсив, подчеркивание</li>
                  <li>• Интерактивный текст</li>
                </ul>
                
                <h4 className="font-medium text-blue-800 mb-1 mt-2">XLSX таблицы:</h4>
                <ul className="text-xs space-y-1">
                  <li>• Интерактивные HTML таблицы (SheetJS)</li>
                  <li>• Все листы и данные ячеек</li>
                  <li>• Результаты формул</li>
                  <li>• Стилизованные заголовки</li>
                  <li>• Hover-эффекты и чередование строк</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Технология:</h4>
                <ul className="text-xs space-y-1">
                  <li>• mammoth.js для DOCX → HTML</li>
                  <li>• SheetJS/xlsx для XLSX → HTML</li>
                  <li>• Клиентская обработка в браузере</li>
                  <li>• CSS стилизация и интерактивность</li>
                  <li>• Fallback к обычному preview при ошибках</li>
                </ul>
              </div>
            </div>
            
            <p className="text-xs text-blue-600 mt-3 bg-blue-100 p-2 rounded">
              <strong>Преимущества:</strong> Полноценный HTML просмотр прямо в браузере, интерактивные таблицы Excel 
              с hover-эффектами, быстрая обработка на клиенте, поддержка всех листов Excel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficePreviewInfo; 