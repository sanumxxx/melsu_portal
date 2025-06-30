import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CheckCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

const Reports = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Состояние для списка отчетов
  const [reports, setReports] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  
  // Состояние для создания/редактирования отчета
  const [selectedReportTemplate, setSelectedReportTemplate] = useState(null);
  const [currentReport, setCurrentReport] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Модальные окна
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (id) {
      // Если есть ID в URL, загружаем существующий отчет для редактирования
      loadExistingReport(id);
    } else {
      // Иначе загружаем список отчетов
      loadData();
    }
  }, [id, selectedTemplate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Загружаем шаблоны и отчеты
      const [templatesRes, reportsRes] = await Promise.all([
        api.get('/api/report-templates/'),
        api.get(`/api/reports/${selectedTemplate ? `?template_id=${selectedTemplate}` : ''}`)
      ]);

      setTemplates(templatesRes.data || []);
      setReports(reportsRes.data || []);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingReport = async (reportId) => {
    try {
      setLoading(true);
      setError('');
      setIsEditing(true);
      
      // Загружаем данные отчета
      const reportResponse = await api.get(`/api/reports/${reportId}`);
      const report = reportResponse.data;
      
      if (report.status?.toUpperCase() !== 'DRAFT') {
        setError('Можно редактировать только черновики отчетов');
        setLoading(false);
        return;
      }
      
      setCurrentReport(report);
      
      // Загружаем шаблон
      const templateResponse = await api.get(`/api/report-templates/${report.template_id}`);
      const template = templateResponse.data;
      setSelectedReportTemplate(template);
      
      // Устанавливаем данные формы из отчета
      setFormData(report.data || {});
      
    } catch (err) {
      console.error('Ошибка загрузки отчета:', err);
      setError('Не удалось загрузить отчет для редактирования');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = () => {
    // Переходим к выбору шаблона
    setSelectedReportTemplate('select');
    setCurrentReport(null);
    setFormData({});
    setError('');
    setSuccess(false);
  };

  const handleTemplateSelect = async (template) => {
    try {
      setLoading(true);
      setError('');
      
      // Создаем черновик отчета в БД
      const response = await api.post('/api/reports/', {
        template_id: template.id,
        data: {},
        notes: '',
        status: 'draft'
      });
      
      setCurrentReport(response.data);
      setSelectedReportTemplate(template);
      setSuccess(false);
      setError('');
      
      // Инициализируем данные формы
      const initialData = {};
      (template.fields || []).forEach(field => {
        initialData[field.name] = field.type === 'checkbox' ? false : '';
      });
      setFormData(initialData);
      
    } catch (err) {
      console.error('Ошибка создания черновика отчета:', err);
      setError('Не удалось создать отчет');
      setLoading(false);
    }
  };

  const handleBackToReports = () => {
    if (isEditing) {
      // В режиме редактирования возвращаемся к списку отчетов
      navigate('/reports');
    } else {
      // В режиме создания возвращаемся к списку отчетов
      setSelectedReportTemplate(null);
      setCurrentReport(null);
      setFormData({});
      setSuccess(false);
      setError('');
      loadData();
    }
  };

  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSaveDraft = async () => {
    if (!currentReport) {
      setError('Отчет не найден');
      return;
    }

    try {
      setError('');
      
      // Обновляем данные черновика
      await api.put(`/api/reports/${currentReport.id}`, {
        data: formData,
        status: 'draft'
      });
      
      setSuccess('Черновик сохранен');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Ошибка сохранения черновика:', err);
      setError('Не удалось сохранить черновик');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentReport) {
      setError('Отчет не найден');
      return;
    }
    
    // Валидация обязательных полей
    const requiredFields = (selectedReportTemplate.fields || []).filter(field => field.required);
    const missingFields = requiredFields.filter(field => !formData[field.name]?.toString().trim());
    
    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(field => field.label).join(', ');
      setError(`Заполните обязательные поля: ${fieldNames}`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      // Сначала обновляем данные отчета
      await api.put(`/api/reports/${currentReport.id}`, {
        data: formData,
        status: 'submitted'
      });
      
      setSuccess('Отчет успешно отправлен!');
      
      // Через 2 секунды возвращаемся к списку отчетов
      setTimeout(() => {
        handleBackToReports();
      }, 2000);
      
    } catch (err) {
      console.error('Ошибка отправки отчета:', err);
      setError('Не удалось отправить отчет');
    } finally {
      setSubmitting(false);
    }
  };

  const viewReport = async (reportId) => {
    try {
      const response = await api.get(`/api/reports/${reportId}`);
      setSelectedReport(response.data);
      setShowViewModal(true);
    } catch (err) {
      console.error('Ошибка загрузки отчета:', err);
      setError('Ошибка загрузки отчета');
    }
  };

  const deleteReport = async (reportId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот отчет?')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/api/reports/${reportId}`);
      await loadData();
    } catch (err) {
      console.error('Ошибка удаления отчета:', err);
      setError('Ошибка удаления отчета');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field.name] || '';

    const commonProps = {
      className: "w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500",
      required: field.required,
      placeholder: field.placeholder || '',
      disabled: submitting
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            rows={3}
            {...commonProps}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            {...commonProps}
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            {...commonProps}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            {...commonProps}
          />
        );

      case 'phone':
        return (
          <input
            type="tel"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            {...commonProps}
          />
        );

      case 'url':
        return (
          <input
            type="url"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            {...commonProps}
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            {...commonProps}
          >
            <option value="">Выберите...</option>
            {(field.options || []).map((option, index) => (
              <option key={index} value={option.value || option.label || option}>
                {option.label || option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {(field.options || []).map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value || option.label || option}
                  checked={value === (option.value || option.label || option)}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  required={field.required}
                  disabled={submitting}
                />
                <span className="ml-2 text-sm text-gray-700">
                  {option.label || option}
                </span>
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              disabled={submitting}
            />
            <span className="ml-2 text-sm text-gray-700">
              {field.placeholder || 'Да'}
            </span>
          </div>
        );
      
      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            {...commonProps}
          />
        );
    }
  };

  const filteredReports = (reports || []).filter(report =>
    report.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.submitter_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (report.submitter_department && report.submitter_department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading && !selectedReportTemplate) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // Если выбираем шаблон
  if (selectedReportTemplate === 'select') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={handleBackToReports}
            className="flex items-center text-red-600 hover:text-red-800 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Назад к отчетам
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Выберите тип отчета</h1>
          <p className="text-gray-600 mt-1">Выберите шаблон для создания отчета</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(templates || []).filter(t => t.is_active).map((template) => (
            <div
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className="bg-white p-6 rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-md cursor-pointer transition-all"
            >
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <DocumentTextIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                </div>
              </div>
              {template.description && (
                <p className="text-gray-600 text-sm mb-4">{template.description}</p>
              )}
              <div className="text-xs text-gray-500">
                Полей: {(template.fields || []).length}
              </div>
            </div>
          ))}
        </div>

        {(templates || []).filter(t => t.is_active).length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет доступных шаблонов</h3>
            <p className="mt-1 text-sm text-gray-500">
              Обратитесь к администратору для создания шаблонов отчетов
            </p>
          </div>
        )}
      </div>
    );
  }

  // Если заполняем отчет
  if (selectedReportTemplate && selectedReportTemplate !== 'select') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={handleBackToReports}
            className="flex items-center text-red-600 hover:text-red-800 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            {isEditing ? 'Назад к отчетам' : 'Назад к выбору шаблона'}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Редактирование отчета' : 'Создание отчета'}: {selectedReportTemplate.name}
          </h1>
          {selectedReportTemplate.description && (
            <p className="text-gray-600 mt-1">{selectedReportTemplate.description}</p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-700">{success}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            {(selectedReportTemplate.fields || []).map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label || field.name}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.description && (
                  <p className="text-xs text-gray-500 mb-2">{field.description}</p>
                )}
                {renderField(field)}
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Сохранить черновик
            </button>
            
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? 'Отправка...' : 'Отправить отчет'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Основной список отчетов
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Заголовок */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Мои отчеты</h1>
            <p className="text-gray-600 mt-1">Создание и просмотр отчетов</p>
          </div>
          <button
            onClick={handleCreateReport}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Подать отчет
          </button>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск отчетов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
          />
        </div>

        <div>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">Все шаблоны</option>
            {(templates || []).map(template => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Сообщение об ошибке */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Список отчетов */}
      {filteredReports.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredReports.map((report) => (
              <li key={report.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <DocumentTextIcon className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {report.template_name}
                        </div>
                        {report.status === 'draft' && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Черновик
                          </span>
                        )}
                        {report.status === 'submitted' && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Отправлен
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <UserIcon className="h-4 w-4 mr-1" />
                        {report.submitter_name}
                        {report.submitter_department && (
                          <>
                            <BuildingOfficeIcon className="h-4 w-4 ml-3 mr-1" />
                            {report.submitter_department}
                          </>
                        )}
                        {report.submitter_position && (
                          <span className="ml-2">
                            ({report.submitter_position})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-xs text-gray-400 mt-1">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {new Date(report.submitted_at).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {report.has_notes && (
                          <span className="ml-3 text-blue-600">
                            📝 Есть примечания
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => viewReport(report.id)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Просмотреть"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    {report.status === 'draft' && (
                      <button
                        onClick={() => navigate(`/reports/edit/${report.id}`)}
                        className="text-green-600 hover:text-green-900"
                        title="Редактировать"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteReport(report.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Удалить"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Нет отчетов</h3>
          <p className="mt-1 text-sm text-gray-500">
            Создайте первый отчет, нажав "Подать отчет"
          </p>
        </div>
      )}

      {/* Модальное окно просмотра отчета */}
      {showViewModal && selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowViewModal(false)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Отчет: {selectedReport.template_name}
                    </h3>
                    
                    {/* Информация о пользователе */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Информация о отправителе</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">ФИО:</span> {selectedReport.submitter_name}
                        </div>
                        <div>
                          <span className="font-medium">Email:</span> {selectedReport.submitter_email}
                        </div>
                        {selectedReport.submitter_department && (
                          <div>
                            <span className="font-medium">Подразделение:</span> {selectedReport.submitter_department}
                          </div>
                        )}
                        {selectedReport.submitter_position && (
                          <div>
                            <span className="font-medium">Должность:</span> {selectedReport.submitter_position}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Дата подачи:</span> {new Date(selectedReport.submitted_at).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </div>

                    {/* Данные отчета */}
                    <div className="space-y-4 mb-6">
                      {Object.entries(selectedReport.data || {}).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {key}
                          </label>
                          <div className="p-2 bg-gray-50 rounded border">
                            {typeof value === 'boolean' ? (value ? 'Да' : 'Нет') : (value || 'Не указано')}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Примечания */}
                    {selectedReport.notes && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Примечания
                        </label>
                        <div className="p-2 bg-gray-50 rounded border">
                          {selectedReport.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports; 