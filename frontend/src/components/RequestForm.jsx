import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import api, { getErrorMessage } from '../services/api';
import Input from './common/Input';
import Button from './common/Button';
import Select from './common/Select';
import TextArea from './common/TextArea';
import { Card, CardHeader, CardContent, CardTitle } from './common/Card';
import { Loader } from './common/Loader';
import { Alert } from './common/Alert';
import FieldFileUpload from './common/FieldFileUpload';
import MaskedInput from './common/MaskedInput';
import {
  DocumentTextIcon
} from '@heroicons/react/24/outline';

// Компонент для динамических select полей
const DynamicSelect = ({ value, onChange, fieldTypeName, loadOptions, placeholder, disabled }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true);
      try {
        const fetchedOptions = await loadOptions(fieldTypeName);
        setOptions(fetchedOptions);
      } catch (err) {
        console.error('Ошибка загрузки опций:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [fieldTypeName, loadOptions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2 px-3 border border-gray-300 rounded-md bg-gray-50">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
        <span className="text-sm text-gray-500">Загрузка...</span>
      </div>
    );
  }

  return (
    <Select
      value={value}
      onChange={onChange}
      options={options.map(option => ({ 
        value: option.value, 
        label: option.label 
      }))}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
};

const RequestForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [currentRequest, setCurrentRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState({}); // Для хранения опций динамических полей

  useEffect(() => {
    if (id) {
      // Если есть ID в URL, загружаем существующую заявку
      loadExistingRequest(id);
    } else {
      // Иначе загружаем шаблоны для создания новой заявки
      loadTemplates();
    }
  }, [id]);

  // Убираем useEffect для загрузки полей, так как это теперь происходит в handleTemplateSelect

  const loadExistingRequest = async (requestId) => {
    try {
      setLoading(true);
      setError(null);
      setIsEditing(true);
      
      // Загружаем данные заявки
      const requestResponse = await api.get(`/api/requests/${requestId}`);
      const request = requestResponse.data;
      
      // Проверяем, можно ли редактировать заявку
      const editableStatuses = ['DRAFT', 'SUBMITTED', 'IN_REVIEW'];
      if (!editableStatuses.includes(request.status?.toUpperCase())) {
        setError('Эту заявку нельзя редактировать. Можно редактировать только черновики, поданные заявки и заявки на рассмотрении.');
        setLoading(false);
        return;
      }
      
      setCurrentRequest(request);
      
      // Загружаем шаблон
      const templateResponse = await api.get(`/api/request-templates/${request.template_id}`);
      const template = templateResponse.data;
      setSelectedTemplate(template);
      
      // Загружаем поля шаблона
      const fieldsResponse = await api.get(`/api/fields/templates/${template.id}/fields/public`);
      setFields(fieldsResponse.data);
      
      // Устанавливаем данные формы из заявки
      setFormData(request.form_data || {});
      
    } catch (err) {
      console.error('Ошибка загрузки заявки:', err);
      setError('Не удалось загрузить заявку для редактирования: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/request-templates/active');
      // Показываем только активные шаблоны
      const activeTemplates = response.data.filter(template => template.is_active);
      setTemplates(activeTemplates);
    } catch (err) {
      console.error('Ошибка загрузки шаблонов:', err);
      setError('Не удалось загрузить список шаблонов: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateFields = async (template = selectedTemplate) => {
    if (!template) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/fields/templates/${template.id}/fields/public`);
      // API уже возвращает только видимые поля
      setFields(response.data);
      
      // Инициализируем данные формы
      const initialData = currentRequest?.form_data || {};
      response.data.forEach(field => {
        if (!(field.name in initialData)) {
          initialData[field.name] = field.default_value || '';
        }
      });
      setFormData(initialData);
    } catch (err) {
      console.error('Ошибка загрузки полей:', err);
      setError('Не удалось загрузить поля формы: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = async (template) => {
    try {
      setLoading(true);
      setError(null);
      
      // Создаем черновик заявки в БД
      const response = await api.post('/api/requests', {
        template_id: template.id,
        title: `${template.name} - ${new Date().toLocaleDateString('ru-RU')}`,
        description: `Заявка по шаблону "${template.name}"`,
        form_data: {}
      });
      
      setCurrentRequest(response.data);
      setSelectedTemplate(template);
      setSuccess(false);
      setError(null);
      
      // Загружаем поля для формы
      await loadTemplateFields(template);
      
    } catch (err) {
      console.error('Ошибка создания черновика:', err);
      setError('Не удалось создать заявку: ' + getErrorMessage(err));
      setLoading(false);
    }
  };

  const handleBackToTemplates = () => {
    if (isEditing) {
      // В режиме редактирования возвращаемся к "Мои заявки"
      navigate('/requests/my');
    } else {
      // В режиме создания возвращаемся к списку шаблонов
      setSelectedTemplate(null);
      setCurrentRequest(null);
      setFields([]);
      setFormData({});
      setSuccess(false);
      setError(null);
    }
  };



  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Функция для проверки условного отображения поля
  const isFieldVisible = (field) => {
    // Если нет условий, поле всегда видимо
    if (!field.conditional_field_id || !field.conditional_value) {
      return true;
    }

    // Находим поле от которого зависит видимость
    const conditionalField = fields.find(f => f.id === field.conditional_field_id);
    if (!conditionalField) return true;

    const conditionalValue = formData[conditionalField.name] || '';
    const expectedValue = field.conditional_value;
    const operator = field.conditional_operator || 'equals';

    switch (operator) {
      case 'equals':
        return conditionalValue === expectedValue;
      case 'not_equals':
        return conditionalValue !== expectedValue;
      case 'contains':
        return conditionalValue.includes(expectedValue);
      case 'not_empty':
        return conditionalValue.trim() !== '';
      case 'empty':
        return conditionalValue.trim() === '';
      default:
        return true;
    }
  };

  const handleSaveDraft = async () => {
    if (!currentRequest) {
      setError('Заявка не найдена');
      return;
    }

    try {
      setError(null);
      
      // Обновляем данные черновика
      await api.put(`/api/requests/${currentRequest.id}`, {
        title: `${selectedTemplate.name} - ${new Date().toLocaleDateString('ru-RU')}`,
        description: `Заявка по шаблону "${selectedTemplate.name}"`,
        form_data: formData
      });
      
      setSuccess('Черновик сохранен');
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      console.error('Ошибка сохранения черновика:', err);
      setError('Не удалось сохранить черновик: ' + getErrorMessage(err));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentRequest) {
      setError('Заявка не найдена');
      return;
    }
    
    // Валидация обязательных полей (только видимых)
    const visibleFields = fields.filter(isFieldVisible);
    const requiredFields = visibleFields.filter(field => field.is_required);
    const missingFields = requiredFields.filter(field => !formData[field.name]?.trim());
    
    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(field => field.label).join(', ');
      setError(`Заполните обязательные поля: ${fieldNames}`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // Сначала обновляем данные черновика
      await api.put(`/api/requests/${currentRequest.id}`, {
        title: `${selectedTemplate.name} - ${new Date().toLocaleDateString('ru-RU')}`,
        description: `Заявка по шаблону "${selectedTemplate.name}"`,
        form_data: formData
      });
      
      // Затем отправляем заявку на рассмотрение
      await api.post(`/api/requests/${currentRequest.id}/submit`);
      
      setSuccess(true);
      setFormData({});
      
      // Заявка отправлена на рассмотрение
      setError(null);
      setSuccess('Заявка успешно отправлена на рассмотрение!');
      
    } catch (err) {
      console.error('Ошибка отправки заявки:', err);
      setError('Не удалось отправить заявку: ' + getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Функция для загрузки динамических опций
  const loadDynamicOptions = async (fieldTypeName) => {
    if (dynamicOptions[fieldTypeName]) {
      return dynamicOptions[fieldTypeName]; // Кешируем результат
    }

    try {
      let endpoint = '';
      switch (fieldTypeName) {
        case 'department_select':
          endpoint = '/api/fields/field-options/departments';
          break;
        case 'faculty_select':
          endpoint = '/api/fields/field-options/faculties';
          break;
        case 'group_select':
          endpoint = '/api/fields/field-options/groups';
          break;
        default:
          return [];
      }

      const response = await api.get(endpoint);
      const options = response.data.options || [];
      
      setDynamicOptions(prev => ({
        ...prev,
        [fieldTypeName]: options
      }));
      
      return options;
    } catch (err) {
      console.error(`Ошибка загрузки опций для ${fieldTypeName}:`, err);
      return [];
    }
  };

  const renderField = (field) => {
    const fieldType = field.field_type;
    const value = formData[field.name] || '';

    switch (fieldType.input_type) {
      case 'text':
      case 'email':
      case 'number':
      case 'date':
        return (
          <Input
            type={fieldType.input_type}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.is_required}
            disabled={submitting}
          />
        );

      case 'tel':
        return (
          <MaskedInput
            mask="+x (xxx) xxx-xx-xx"
            value={value}
            onChange={(cleanValue) => handleFieldChange(field.name, cleanValue)}
            placeholder={field.placeholder || "+7 (999) 123-45-67"}
            required={field.is_required}
            disabled={submitting}
          />
        );

      case 'group_select':
        // Селект для выбора группы
        return (
          <DynamicSelect
            value={value}
            onChange={(newValue) => handleFieldChange(field.name, newValue)}
            fieldTypeName="group_select"
            loadOptions={loadDynamicOptions}
            placeholder={field.placeholder || 'Выберите группу'}
            disabled={submitting}
          />
        );

      case 'textarea':
        return (
          <TextArea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows="4"
            required={field.is_required}
            disabled={submitting}
          />
        );

      case 'select':
        // Проверяем тип поля для динамических селектов
        if (fieldType.name === 'faculty_select') {
          return (
            <DynamicSelect
              value={value}
              onChange={(newValue) => handleFieldChange(field.name, newValue)}
              fieldTypeName="faculty_select"
              loadOptions={loadDynamicOptions}
              placeholder={field.placeholder || 'Выберите факультет'}
              disabled={submitting}
            />
          );
        }
        
        if (fieldType.name === 'department_select') {
          return (
            <DynamicSelect
              value={value}
              onChange={(newValue) => handleFieldChange(field.name, newValue)}
              fieldTypeName="department_select"
              loadOptions={loadDynamicOptions}
              placeholder={field.placeholder || 'Выберите кафедру'}
              disabled={submitting}
            />
          );
        }
        
        // Обычный селект
        return (
          <Select
            value={value}
            onChange={(newValue) => handleFieldChange(field.name, newValue)}
            options={field.options?.map(option => ({ 
              value: option.value, 
              label: option.label 
            })) || []}
            placeholder={field.placeholder || 'Выберите вариант'}
            disabled={submitting}
          />
        );


      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={submitting}
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => {
              const currentValues = Array.isArray(value) ? value : [];
              const isChecked = currentValues.includes(option.value);
              
              return (
                <label key={index} className="flex items-center">
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={isChecked}
                    onChange={(e) => {
                      const newValues = isChecked
                        ? currentValues.filter(v => v !== option.value)
                        : [...currentValues, option.value];
                      handleFieldChange(field.name, newValues);
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={submitting}
                  />
                  <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              );
            })}
          </div>
        );

      case 'file':
        const isMultiple = field.validation_rules?.multiple !== false;
        return (
          <FieldFileUpload
            requestId={currentRequest?.id}
            fieldName={field.name}
            onFilesChanged={(files) => {
              // Сохраняем только ID файлов в form_data (как строки для совместимости)
              const fileIds = files.map(f => f.id.toString());
              handleFieldChange(field.name, isMultiple ? fileIds : (fileIds[0] || ''));
            }}
            disabled={submitting}
            multiple={isMultiple}
          />
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.is_required}
            disabled={submitting}
          />
        );
    }
  };

  if (loading && templates.length === 0) {
    return <Loader text="Загрузка доступных заявок..." />;
  }

  if (!selectedTemplate) {
    return (
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
            {isEditing ? 'Редактирование заявки' : 'Подача заявки'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEditing ? 'Внесите изменения в черновик заявки' : 'Выберите тип заявки для подачи'}
          </p>
        </div>

        {error && (
          <Alert variant="error" message={error} />
        )}

        {templates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Нет доступных заявок</h3>
              <p className="mt-2 text-sm text-gray-500">
                В настоящее время нет активных шаблонов заявок
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {templates.map((template) => {
              return (
                <Card 
                  key={template.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
                      {template.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {template.description && (
                      <p className="text-gray-600 mb-3">{template.description}</p>
                    )}
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        Срок рассмотрения: {template.deadline_days} {
                          template.deadline_days === 1 ? 'день' : 
                          template.deadline_days < 5 ? 'дня' : 'дней'
                        }
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full"
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTemplateSelect(template);
                      }}
                    >
                      Подать заявку
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
        <Button 
          onClick={handleBackToTemplates}
          variant="outline"
          disabled={submitting}
          className="w-full sm:w-auto"
        >
          <span className="sm:hidden">{isEditing ? '← К заявкам' : '← К списку'}</span>
          <span className="hidden sm:inline">{isEditing ? '← Назад к моим заявкам' : '← Назад к списку'}</span>
        </Button>
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
            <span className="sm:hidden">{isEditing ? 'Редактирование' : selectedTemplate.name}</span>
            <span className="hidden sm:inline">{isEditing ? `Редактирование: ${selectedTemplate.name}` : selectedTemplate.name}</span>
          </h1>
          <p className="text-gray-600 mt-1">
            {currentRequest && (
              <span className="text-blue-600 font-medium">
                Черновик заявки №{currentRequest.id} • 
              </span>
            )}
            {selectedTemplate.description && `${selectedTemplate.description} • `}
            Срок рассмотрения: {selectedTemplate.deadline_days} {
              selectedTemplate.deadline_days === 1 ? 'день' : 
              selectedTemplate.deadline_days < 5 ? 'дня' : 'дней'
            }
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error" message={error} />
      )}

      {success && (
        <Alert 
          variant="success" 
          message={
            typeof success === 'string' ? success : (
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Заявка успешно отправлена!
              </div>
            )
          } 
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Заполните форму заявки</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader text="Загрузка формы..." />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {fields.filter(isFieldVisible).map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.description && (
                    <p className="text-sm text-gray-500 mb-2">{field.description}</p>
                  )}
                  
                  {renderField(field)}
                </div>
              ))}

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t">
                <Button 
                  type="submit" 
                  variant="primary"
                  disabled={submitting || fields.length === 0}
                  className="w-full sm:w-auto sm:min-w-32"
                >
                  {submitting ? 'Отправка...' : (isEditing ? (
                    <>
                      <span className="sm:hidden">Обновить</span>
                      <span className="hidden sm:inline">Обновить и отправить</span>
                    </>
                  ) : 'Отправить заявку')}
                </Button>
                <Button 
                  type="button"
                  onClick={handleSaveDraft}
                  variant="outline"
                  disabled={submitting || fields.length === 0}
                  className="w-full sm:w-auto sm:min-w-32"
                >
                  <span className="sm:hidden">Сохранить</span>
                  <span className="hidden sm:inline">Сохранить черновик</span>
                </Button>
                <Button 
                  type="button"
                  onClick={handleBackToTemplates}
                  variant="outline"
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  Отмена
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestForm; 