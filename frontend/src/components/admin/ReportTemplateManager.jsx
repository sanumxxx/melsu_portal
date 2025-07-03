import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  XMarkIcon,
  Squares2X2Icon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';

const ReportTemplateManager = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');

  // Форма создания/редактирования шаблона
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    fields: [],
    allowed_roles: [],
    viewers: [],
    is_active: true
  });

  // Данные для конструктора полей
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [fieldData, setFieldData] = useState({
    id: null,
    name: '',
    label: '',
    description: '',
    type: 'text',
    required: false,
    placeholder: '',
    options: []
  });
  const [fieldOptions, setFieldOptions] = useState([]);
  const [newOption, setNewOption] = useState('');

  const [availableRoles, setAvailableRoles] = useState([]);

  const fieldTypes = [
    { value: 'text', label: 'Текст', description: 'Однострочное текстовое поле', hasOptions: false },
    { value: 'textarea', label: 'Многострочный текст', description: 'Большое текстовое поле для длинного текста', hasOptions: false },
    { value: 'number', label: 'Число', description: 'Поле для ввода чисел', hasOptions: false },
    { value: 'date', label: 'Дата', description: 'Выбор даты из календаря', hasOptions: false },
    { value: 'select', label: 'Выбор из списка', description: 'Выпадающий список с вариантами', hasOptions: true },
    { value: 'radio', label: 'Переключатель', description: 'Выбор одного варианта из нескольких', hasOptions: true },
    { value: 'checkbox', label: 'Флажок', description: 'Поле для выбора да/нет', hasOptions: false },
    { value: 'email', label: 'Email', description: 'Поле для ввода электронной почты', hasOptions: false },
    { value: 'phone', label: 'Телефон', description: 'Поле для ввода номера телефона', hasOptions: false },
    { value: 'url', label: 'Ссылка', description: 'Поле для ввода веб-адреса', hasOptions: false }
  ];

  const tabs = [
    { id: 'basic', label: 'Основная информация', icon: Cog6ToothIcon },
    { id: 'fields', label: 'Конструктор полей', icon: Squares2X2Icon },
    { id: 'access', label: 'Права доступа', icon: UserGroupIcon }
  ];

  useEffect(() => {
    loadTemplates();
    loadRoles();
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

  const loadRoles = async () => {
    try {
      const response = await api.get('/api/roles');
      setAvailableRoles(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки ролей:', err);
      // Не показываем ошибку пользователю, используем fallback
      setAvailableRoles([
        { name: 'admin', display_name: 'Администратор' },
        { name: 'employee', display_name: 'Сотрудник' },
        { name: 'teacher', display_name: 'Преподаватель' },
        { name: 'student', display_name: 'Студент' },
        { name: 'curator', display_name: 'Куратор' }
      ]);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      description: '',
      fields: [],
      allowed_roles: [],
      viewers: [],
      is_active: true
    });
    setActiveTab('basic');
    setShowCreateModal(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      fields: (template.fields || []).map(field => ({
        ...field,
        id: field.id || Date.now() + Math.random() // Добавляем временный ID если его нет
      })),
      allowed_roles: template.allowed_roles || [],
      viewers: template.viewers || [],
      is_active: template.is_active
    });
    setActiveTab('basic');
    setShowCreateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) {
      setError('Введите название шаблона');
      return;
    }
    
    if (templateForm.fields.length === 0) {
      setError('Добавьте хотя бы одно поле');
      return;
    }

    try {
      setLoading(true);
      
      // Подготавливаем данные для отправки - убираем временные ID полей
      const dataToSend = {
        ...templateForm,
        fields: templateForm.fields.map(field => {
          const { id, ...fieldWithoutId } = field;
          return fieldWithoutId;
        })
      };
      
      console.log('Отправляем данные на сервер:', dataToSend);
      console.log('Поля шаблона:', dataToSend.fields);
      
      if (editingTemplate) {
        await api.put(`/api/report-templates/${editingTemplate.id}`, dataToSend);
      } else {
        await api.post('/api/report-templates/', dataToSend);
      }

      resetForm();
      setShowCreateModal(false);
      setEditingTemplate(null);
      await loadTemplates();
    } catch (err) {
      console.error('Ошибка сохранения шаблона:', err);
      setError(err.response?.data?.detail || 'Ошибка сохранения шаблона');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот шаблон?')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/api/report-templates/${templateId}`);
      await loadTemplates();
    } catch (err) {
      console.error('Ошибка удаления шаблона:', err);
      setError(err.response?.data?.detail || 'Ошибка удаления шаблона');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      fields: [],
      allowed_roles: [],
      viewers: [],
      is_active: true
    });
    setError('');
  };

  // Функции для работы с полями
  const handleCreateField = () => {
    setEditingField(null);
    setFieldData({
      id: Date.now(),
      name: '',
      label: '',
      description: '',
      type: 'text',
      required: false,
      placeholder: '',
      options: []
    });
    setFieldOptions([]);
    setNewOption('');
    setShowFieldForm(true);
  };

  const handleEditField = (field) => {
    setEditingField(field);
    setFieldData({ ...field });
    setFieldOptions(field.options || []);
    setNewOption('');
    setShowFieldForm(true);
  };

  const handleSaveField = () => {
    if (!fieldData.label.trim()) {
      setError('Введите название поля');
      return;
    }

    if (hasOptions() && fieldOptions.length === 0) {
      setError('Добавьте варианты для поля с выбором');
      return;
    }

    // Генерируем техническое имя из названия если не указано
    let processedFieldData = { ...fieldData };
    if (!processedFieldData.name.trim()) {
      processedFieldData.name = processedFieldData.label
        .toLowerCase()
        .replace(/[^a-zа-я0-9]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    }

    processedFieldData.options = fieldOptions;

    if (editingField) {
      // Обновляем существующее поле
      setTemplateForm(prev => ({
        ...prev,
        fields: prev.fields.map(field =>
          field.id === editingField.id ? processedFieldData : field
        )
      }));
    } else {
      // Добавляем новое поле
      setTemplateForm(prev => ({
        ...prev,
        fields: [...prev.fields, processedFieldData]
      }));
    }

    setShowFieldForm(false);
    setError('');
  };

  const handleDeleteField = (fieldId) => {
    if (!window.confirm('Вы уверены, что хотите удалить это поле?')) {
      return;
    }

    setTemplateForm(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
  };

  const getFieldTypeInfo = (type) => {
    return fieldTypes.find(ft => ft.value === type) || fieldTypes[0];
  };

  const hasOptions = () => {
    const fieldType = getFieldTypeInfo(fieldData.type);
    return fieldType.hasOptions;
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      const option = { label: newOption.trim(), value: newOption.trim().toLowerCase() };
      const updatedOptions = [...fieldOptions, option];
      setFieldOptions(updatedOptions);
      setNewOption('');
    }
  };

  const handleRemoveOption = (index) => {
    const updatedOptions = fieldOptions.filter((_, i) => i !== index);
    setFieldOptions(updatedOptions);
  };

  const handleEditOption = (index, newLabel) => {
    const updatedOptions = fieldOptions.map((option, i) => 
      i === index 
        ? { ...option, label: newLabel, value: newLabel.toLowerCase() }
        : option
    );
    setFieldOptions(updatedOptions);
  };

  const addViewer = (type, value) => {
    if (!value) return;
    
    const newViewer = { type, value };
    if (!templateForm.viewers.some(v => v.type === type && v.value === value)) {
      setTemplateForm({
        ...templateForm,
        viewers: [...templateForm.viewers, newViewer]
      });
    }
  };

  const removeViewer = (index) => {
    setTemplateForm({
      ...templateForm,
      viewers: templateForm.viewers.filter((_, i) => i !== index)
    });
  };

  const getRoleDisplayName = (roleName) => {
    const role = availableRoles.find(r => r.name === roleName);
    return role ? role.display_name : roleName;
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading && templates.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Заголовок */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Шаблоны отчетов</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Управление шаблонами для создания отчетов</p>
          </div>
          <button
            onClick={handleCreateTemplate}
            className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 w-full sm:w-auto text-sm sm:text-base"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Создать шаблон
          </button>
        </div>
      </div>

      {/* Поиск */}
      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск шаблонов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
          />
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

      {/* Список шаблонов */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">
                          {template.name}
                        </h3>
                        {!template.is_active && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 flex-shrink-0">
                            Неактивен
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-400 mt-2 gap-1 sm:gap-4">
                        <div className="flex items-center">
                          <ChartBarIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span>{template.reports_count} отчетов</span>
                        </div>
                        <div className="flex items-center">
                          <UserGroupIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span>{template.allowed_roles?.length || 0} ролей</span>
                        </div>
                        <div className="hidden sm:block">
                          Создан: {template.creator_name}
                        </div>
                      </div>
                      <div className="sm:hidden text-xs text-gray-400 mt-1">
                        Создан: {template.creator_name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-2">
                    <button
                      onClick={() => openEditModal(template)}
                      className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
                      title="Редактировать"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={template.reports_count > 0 ? "Нельзя удалить шаблон с отчетами" : "Удалить"}
                      disabled={template.reports_count > 0}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Нет шаблонов</h3>
          <p className="mt-1 text-sm text-gray-500">
            Начните с создания первого шаблона отчета
          </p>
        </div>
      )}

      {/* Модальное окно создания/редактирования шаблона */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full h-full sm:h-auto sm:max-w-6xl sm:w-full sm:rounded-lg">
              {/* Заголовок модального окна */}
              <div className="flex justify-between items-center p-4 sm:p-6 border-b bg-white sticky top-0 z-10">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {editingTemplate ? 'Редактирование шаблона' : 'Создание шаблона'}
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              {/* Вкладки */}
              <div className="border-b bg-white sticky top-16 sm:top-20 z-10">
                <div className="flex overflow-x-auto scrollbar-hide">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center px-4 sm:px-6 py-3 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                        activeTab === tab.id
                          ? 'bg-red-50 text-red-600 border-b-2 border-red-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <tab.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Содержимое вкладок */}
              <div className="p-4 sm:p-6 overflow-y-auto h-full sm:h-auto sm:max-h-[calc(90vh-200px)]">
                {activeTab === 'basic' && (
                  <div className="space-y-4 sm:space-y-6">
                    <h3 className="text-base sm:text-lg font-semibold mb-4">Основная информация</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Название шаблона *
                        </label>
                        <input
                          type="text"
                          value={templateForm.name}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:ring-red-500 focus:border-red-500"
                          placeholder="Введите название шаблона"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Статус
                        </label>
                        <select
                          value={templateForm.is_active}
                          onChange={(e) => setTemplateForm({...templateForm, is_active: e.target.value === 'true'})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:ring-red-500 focus:border-red-500"
                        >
                          <option value="true">Активен</option>
                          <option value="false">Неактивен</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Описание
                      </label>
                      <textarea
                        value={templateForm.description}
                        onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:ring-red-500 focus:border-red-500"
                        placeholder="Описание назначения шаблона отчета"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'fields' && (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <h3 className="text-base sm:text-lg font-semibold">Конструктор полей</h3>
                      <button
                        onClick={handleCreateField}
                        className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 text-sm sm:text-base w-full sm:w-auto"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Добавить поле
                      </button>
                    </div>

                    {/* Список полей */}
                    {templateForm.fields.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <Squares2X2Icon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-gray-500">Нет созданных полей</p>
                        <p className="text-sm text-gray-400">Добавьте поля для сбора данных в отчетах</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {templateForm.fields.map((field) => (
                          <div
                            key={field.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 space-y-3 sm:space-y-0"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                                  {field.label}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                    {getFieldTypeInfo(field.type).label}
                                  </span>
                                  {field.required && (
                                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                                      Обязательное
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                {field.name} {field.description && `• ${field.description}`}
                              </p>
                              {field.options && field.options.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-500 mb-1">Варианты:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {field.options.slice(0, 3).map((option, index) => (
                                      <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                        {option.label}
                                      </span>
                                    ))}
                                    {field.options.length > 3 && (
                                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                        +{field.options.length - 3} еще
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex space-x-2 self-end sm:self-center">
                              <button
                                onClick={() => handleEditField(field)}
                                className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
                                title="Редактировать"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteField(field.id)}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors"
                                title="Удалить"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Форма создания/редактирования поля */}
                    {showFieldForm && (
                      <div className="mt-4 sm:mt-6 p-4 sm:p-6 border border-gray-200 rounded-lg bg-gray-50">
                        <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
                          {editingField ? 'Редактирование поля' : 'Создание нового поля'}
                        </h4>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Название поля *
                              </label>
                              <input
                                type="text"
                                value={fieldData.label}
                                onChange={(e) => setFieldData(prev => ({ ...prev, label: e.target.value }))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:ring-red-500 focus:border-red-500"
                                placeholder="Введите название поля"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Техническое имя
                              </label>
                              <input
                                type="text"
                                value={fieldData.name}
                                onChange={(e) => setFieldData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:ring-red-500 focus:border-red-500"
                                placeholder="Автоматически из названия"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Тип поля *
                            </label>
                            <select
                              value={fieldData.type}
                              onChange={(e) => {
                                setFieldData(prev => ({ ...prev, type: e.target.value }));
                                // Сбрасываем варианты если новый тип их не поддерживает
                                const newFieldType = getFieldTypeInfo(e.target.value);
                                if (!newFieldType.hasOptions) {
                                  setFieldOptions([]);
                                }
                              }}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:ring-red-500 focus:border-red-500"
                            >
                              {fieldTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                  {type.label} - {type.description}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Placeholder
                              </label>
                              <input
                                type="text"
                                value={fieldData.placeholder}
                                onChange={(e) => setFieldData(prev => ({ ...prev, placeholder: e.target.value }))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:ring-red-500 focus:border-red-500"
                                placeholder="Текст подсказки в поле"
                              />
                            </div>

                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="field_required"
                                checked={fieldData.required}
                                onChange={(e) => setFieldData(prev => ({ ...prev, required: e.target.checked }))}
                                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                              />
                              <label htmlFor="field_required" className="ml-2 block text-sm text-gray-900">
                                Обязательное поле
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Описание
                            </label>
                            <textarea
                              value={fieldData.description}
                              onChange={(e) => setFieldData(prev => ({ ...prev, description: e.target.value }))}
                              rows={2}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:ring-red-500 focus:border-red-500"
                              placeholder="Дополнительное описание поля"
                            />
                          </div>

                          {/* Секция для вариантов ответов */}
                          {hasOptions() && (
                            <div className="space-y-3">
                              <label className="block text-sm font-medium text-gray-700">
                                Варианты ответов *
                              </label>
                              
                              {/* Список существующих вариантов */}
                              {fieldOptions.length > 0 && (
                                <div className="space-y-2">
                                  {fieldOptions.map((option, index) => (
                                    <div key={index} className="flex items-center space-x-2 p-2 border border-gray-200 rounded">
                                      <input
                                        type="text"
                                        value={option.label}
                                        onChange={(e) => handleEditOption(index, e.target.value)}
                                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveOption(index)}
                                        className="text-red-600 hover:text-red-900"
                                      >
                                        <TrashIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Добавление нового варианта */}
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                                <input
                                  type="text"
                                  value={newOption}
                                  onChange={(e) => setNewOption(e.target.value)}
                                  placeholder="Введите новый вариант"
                                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:ring-red-500 focus:border-red-500"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddOption();
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={handleAddOption}
                                  disabled={!newOption.trim()}
                                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm sm:text-base"
                                >
                                  <PlusIcon className="h-4 w-4" />
                                </button>
                              </div>
                              
                              {fieldOptions.length === 0 && (
                                <p className="text-sm text-red-600">
                                  Необходимо добавить хотя бы один вариант ответа
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                            <button
                              onClick={handleSaveField}
                              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm sm:text-base"
                            >
                              {editingField ? 'Обновить' : 'Создать'} поле
                            </button>
                            <button
                              onClick={() => setShowFieldForm(false)}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm sm:text-base"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'access' && (
                  <div className="space-y-4 sm:space-y-6">
                    <h3 className="text-base sm:text-lg font-semibold mb-4">Настройка прав доступа</h3>

                    {/* Роли для создания отчетов */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Роли, которые могут создавать отчеты
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {availableRoles.map(role => (
                          <label key={role.name} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={templateForm.allowed_roles.includes(role.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTemplateForm({
                                    ...templateForm,
                                    allowed_roles: [...templateForm.allowed_roles, role.name]
                                  });
                                } else {
                                  setTemplateForm({
                                    ...templateForm,
                                    allowed_roles: templateForm.allowed_roles.filter(r => r !== role.name)
                                  });
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm">{role.display_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Зрители отчетов */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Кто может просматривать отчеты
                      </label>
                      
                      {/* Добавление зрителей по ролям */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
                        {availableRoles.map(role => (
                          <button
                            key={role.name}
                            type="button"
                            onClick={() => addViewer('role', role.name)}
                            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-left"
                          >
                            + {role.display_name}
                          </button>
                        ))}
                      </div>

                      {/* Список добавленных зрителей */}
                      <div className="flex flex-wrap gap-2">
                        {templateForm.viewers.map((viewer, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {viewer.type === 'role' ? `Роль: ${getRoleDisplayName(viewer.value)}` : `Пользователь: ${viewer.value}`}
                            <button
                              type="button"
                              onClick={() => removeViewer(index)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-col sm:flex-row sm:flex-row-reverse gap-2 sm:gap-0 sticky bottom-0 z-10">
                <button
                  onClick={handleSaveTemplate}
                  disabled={loading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {loading ? 'Сохранение...' : (editingTemplate ? 'Сохранить' : 'Создать')}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportTemplateManager; 