import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CalendarIcon,
  ChartBarIcon,
  ArrowLeftIcon,
  TableCellsIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import * as XLSX from 'xlsx';

const ReportViewer = () => {
  const [templates, setTemplates] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/report-templates/');
      setTemplates(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки шаблонов:', err);
      setError('Ошибка загрузки шаблонов отчетов');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async (templateId) => {
    try {
      setReportsLoading(true);
      setError('');
      const params = new URLSearchParams();
      params.append('template_id', templateId);
      if (statusFilter) params.append('status', statusFilter);
      params.append('size', '100');
      const response = await api.get(`/api/reports/?${params.toString()}`);
      
      setReports(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки отчетов:', err);
      setError('Ошибка загрузки отчетов');
    } finally {
      setReportsLoading(false);
    }
  };

  const handleTemplateClick = (template) => {
    setSelectedTemplate(template);
    loadReports(template.id);
  };

  const handleBackToTemplates = () => {
    setSelectedTemplate(null);
    setReports([]);
    setStatusFilter('');
    setSearchQuery('');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            Черновик
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
            Отправлен
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
            Рассмотрен
          </span>
        );
      default:
        return null;
    }
  };

  const getAllFields = () => {
    if (!selectedTemplate || !selectedTemplate.fields) return [];
    return selectedTemplate.fields.map(field => field.name);
  };

  const filteredReports = (reports || []).filter(report =>
    report.submitter_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (report.submitter_department && report.submitter_department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatFieldValue = (value) => {
    // Если значение не существует или равно null/undefined
    if (value === null || value === undefined) {
      return '—';
    }
    
    // Для булевых значений
    if (typeof value === 'boolean') {
      return value ? 'Да' : 'Нет';
    }
    
    // Для чисел
    if (typeof value === 'number') {
      return value.toString();
    }
    
    // Для строк
    if (typeof value === 'string') {
      // Если строка пустая, показываем прочерк
      if (value.trim() === '') {
        return '—';
      }
      // Если строка длинная, обрезаем
      if (value.length > 100) {
        return value.substring(0, 100) + '...';
      }
      return value;
    }
    
    // Для массивов
    if (Array.isArray(value)) {
      if (value.length === 0) return '—';
      return value.join(', ');
    }
    
    // Для объектов
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return '[Объект]';
      }
    }
    
    // Для всех остальных типов просто преобразуем в строку
    try {
      return String(value);
    } catch (e) {
      return '—';
    }
  };

  const exportToExcel = () => {
    try {
      const allFields = getAllFields();
      
      // Подготавливаем данные для экспорта
      const exportData = filteredReports.map(report => {
        const row = {
          'ФИО': report.submitter_name,
          'Email': report.submitter_email,
          'Дата подачи': new Date(report.submitted_at), // Используем объект Date для правильной сортировки
          'Должность': report.submitter_position || '—',
          'Подразделение': report.submitter_department || '—',
          'Статус': getStatusText(report.status)
        };
        
        // Добавляем поля отчета
        allFields.forEach(fieldName => {
          const field = selectedTemplate.fields.find(f => f.name === fieldName);
          const fieldLabel = field?.label || fieldName;
          row[fieldLabel] = formatFieldValueForExcel(report.data?.[fieldName]);
        });
        
        return row;
      });

      // Создаем рабочую книгу
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Настраиваем ширину колонок
      const colWidths = [
        { wch: 25 }, // ФИО
        { wch: 30 }, // Email
        { wch: 20 }, // Дата подачи
        { wch: 20 }, // Должность
        { wch: 25 }, // Подразделение
        { wch: 15 }, // Статус
      ];
      
      // Добавляем ширину для полей отчета
      allFields.forEach(() => {
        colWidths.push({ wch: 20 });
      });
      
      ws['!cols'] = colWidths;

      // Форматируем столбец с датами для правильной сортировки
      if (exportData.length > 0) {
        for (let i = 1; i <= exportData.length; i++) {
          const cellRef = XLSX.utils.encode_cell({ r: i, c: 2 }); // столбец C (Дата подачи)
          if (ws[cellRef]) {
            ws[cellRef].z = 'dd.mm.yyyy hh:mm'; // Устанавливаем формат даты
          }
        }
      }

      // Добавляем автофильтр для возможности сортировки
      if (exportData.length > 0) {
        // Определяем диапазон данных для автофильтра
        const totalCols = 6 + allFields.length; // 6 основных колонок + поля отчета
        const range = XLSX.utils.encode_range({
          s: { c: 0, r: 0 }, // начало (A1)
          e: { c: totalCols - 1, r: exportData.length } // конец
        });
        
        // Устанавливаем автофильтр
        ws['!autofilter'] = { ref: range };
        
        // Закрепляем первую строку (заголовки)
        ws['!freeze'] = { xSplit: 0, ySplit: 1 };
      }

      // Добавляем лист в книгу
      const sheetName = selectedTemplate.name || 'Отчеты';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Генерируем имя файла
      const fileName = `${selectedTemplate.name}_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`;

      // Сохраняем файл
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Ошибка экспорта в Excel:', error);
      alert('Произошла ошибка при экспорте в Excel');
    }
  };

  const formatFieldValueForExcel = (value) => {
    // Для Excel нужно возвращать простые значения без HTML и длинных строк
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Да' : 'Нет';
    }
    
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'string') {
      return value.trim() === '' ? '' : value;
    }
    
    if (Array.isArray(value)) {
      return value.length === 0 ? '' : value.join(', ');
    }
    
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return '[Объект]';
      }
    }
    
    try {
      return String(value);
    } catch (e) {
      return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'submitted': return 'Отправлен';
      case 'reviewed': return 'Рассмотрен';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Просмотр отчетов</h1>
              <p className="text-gray-600 mt-1">Выберите тип отчета для просмотра</p>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Типов отчетов: {templates.length}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer border border-gray-200 hover:border-blue-300"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <TableCellsIcon className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Полей: {template.fields?.length || 0}
                      </p>
                    </div>
                  </div>
                  
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-4">
                      {template.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-500">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {new Date(template.created_at).toLocaleDateString('ru-RU')}
                    </div>
                    <div className="flex items-center text-blue-600 text-sm font-medium">
                      Просмотреть отчеты
                      <ChartBarIcon className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет доступных типов отчетов</h3>
            <p className="mt-1 text-sm text-gray-500">
              У вас нет доступа к просмотру отчетов или типы отчетов еще не созданы
            </p>
          </div>
        )}
      </div>
    );
  }

  const allFields = getAllFields();

  return (
    <div className="max-w-full mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button
            onClick={handleBackToTemplates}
            className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Назад к типам отчетов
          </button>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h1>
            <p className="text-gray-600 mt-1">
              {selectedTemplate.description || 'Отчеты данного типа'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center text-sm text-gray-500">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Отчетов: {filteredReports.length}
            </div>
            {filteredReports.length > 0 && (
              <button
                onClick={exportToExcel}
                title="Экспорт в Excel с возможностью сортировки и фильтрации"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Экспорт в Excel
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по автору или подразделению..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              loadReports(selectedTemplate.id);
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">Все статусы</option>
            <option value="draft">Черновики</option>
            <option value="submitted">Отправленные</option>
            <option value="reviewed">Рассмотренные</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {reportsLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <>
          {filteredReports.length > 0 ? (
            <div className="bg-white shadow overflow-x-auto sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                      ФИО
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата подачи
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Должность
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Подразделение
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    {allFields.map((fieldName) => {
                      const field = selectedTemplate.fields.find(f => f.name === fieldName);
                      return (
                        <th key={fieldName} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-32">
                          {field?.label || fieldName}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {report.submitter_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {report.submitter_email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(report.submitted_at).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.submitter_position || '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.submitter_department || '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(report.status)}
                      </td>
                      {allFields.map((fieldName) => (
                        <td key={fieldName} className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={report.data?.[fieldName]?.toString() || ''}>
                            {formatFieldValue(report.data?.[fieldName])}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Нет отчетов</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery || statusFilter 
                  ? 'Попробуйте изменить фильтры поиска'
                  : 'По данному типу отчетов пока нет поданных отчетов'
                }
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportViewer; 