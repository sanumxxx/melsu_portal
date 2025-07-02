import React, { useState, useEffect } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { Card, CardHeader, CardContent, CardTitle } from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import TextArea from '../common/TextArea';
import Select from '../common/Select';
import UserSearch from '../common/UserSearch';
import { Loader } from '../common/Loader';
import { Alert } from '../common/Alert';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  CogIcon,
  Squares2X2Icon,
  EyeSlashIcon,
  UserGroupIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const RequestBuilder = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // Данные шаблона
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deadline_days: 7,
    is_active: true,
    routing_type: 'manual',
    default_assignees: [],
    auto_assign_enabled: false,
    department_routing: false,
    routing_rules: [],
    auto_role_assignment_enabled: false,
    role_assignment_rules: []
  });

  // Данные для конструктора полей
  const [fieldTypes, setFieldTypes] = useState([]);
  const [fields, setFields] = useState([]);
  const [profileFields, setProfileFields] = useState([]);
  
  // Данные для маршрутизации
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  
  // Данные для правил маршрутизации
  const [routingRules, setRoutingRules] = useState([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleData, setRuleData] = useState({
    field: '',
    value: '',
    assignees: []
  });
  const [ruleAssignees, setRuleAssignees] = useState([]);
  
  // Данные для правил назначения ролей
  const [roleAssignmentRules, setRoleAssignmentRules] = useState([]);
  const [showRoleRuleForm, setShowRoleRuleForm] = useState(false);
  const [editingRoleRule, setEditingRoleRule] = useState(null);
  const [roleRuleData, setRoleRuleData] = useState({
    field: '',
    value: '',
    role: '',
    description: ''
  });
  const [availableRoles, setAvailableRoles] = useState([]);
  
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [fieldData, setFieldData] = useState({
    name: '',
    label: '',
    description: '',
    placeholder: '',
    field_type_id: '',
    is_required: false,
    is_visible: true,
    sort_order: 0,
    default_value: '',
    options: [],
    conditional_field_id: null,
    conditional_value: '',
    conditional_operator: 'equals',
    profile_field_mapping: '',
    update_profile_on_submit: false,
    update_profile_on_approve: false
  });
  const [fieldOptions, setFieldOptions] = useState([]);
  const [newOption, setNewOption] = useState('');

  const tabs = [
    { id: 'basic', label: 'Основная информация', icon: CogIcon },
    { id: 'routing', label: 'Маршрутизация', icon: UserGroupIcon },
    { id: 'roles', label: 'Назначение ролей', icon: ShieldCheckIcon },
    { id: 'fields', label: 'Конструктор полей', icon: Squares2X2Icon }
  ];

  useEffect(() => {
    loadTemplates();
    loadFieldTypes();
    loadProfileFields();
    loadAvailableRoles();
  }, []);

  useEffect(() => {
    if (editingTemplate) {
      loadTemplateFields();
    }
  }, [editingTemplate]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/request-templates');
      setTemplates(response.data);
    } catch (err) {
      console.error('Ошибка загрузки шаблонов:', err);
      setError('Не удалось загрузить список шаблонов: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadFieldTypes = async () => {
    try {
      const response = await api.get('/api/fields/field-types');
      setFieldTypes(response.data);
    } catch (err) {
      console.error('Ошибка загрузки типов полей:', err);
    }
  };

  const loadProfileFields = async () => {
    try {
      const response = await api.get('/api/profile-fields/grouped');
      setProfileFields(response.data);
    } catch (err) {
      console.error('Ошибка загрузки полей профиля:', err);
      // Не показываем ошибку пользователю, так как это дополнительный функционал
    }
  };

  const loadAvailableRoles = async () => {
    try {
      const response = await api.get('/api/roles');
      setAvailableRoles(response.data.map(role => ({
        value: role.name,
        label: role.display_name || role.name
      })));
    } catch (err) {
      console.error('Ошибка загрузки ролей:', err);
      // Используем базовые роли как fallback
      setAvailableRoles([
        { value: 'student', label: 'Студент' },
        { value: 'teacher', label: 'Преподаватель' },
        { value: 'curator', label: 'Куратор' },
        { value: 'admin', label: 'Администратор' }
      ]);
    }
  };

  const loadTemplateFields = async () => {
    if (!editingTemplate) return;
    
    try {
      const response = await api.get(`/api/fields/templates/${editingTemplate.id}/fields`);
      setFields(response.data);
    } catch (err) {
      console.error('Ошибка загрузки полей:', err);
      setError('Не удалось загрузить поля: ' + getErrorMessage(err));
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      deadline_days: 7,
      is_active: true,
      routing_type: 'manual',
      default_assignees: [],
      auto_assign_enabled: false,
      department_routing: false,
      routing_rules: [],
      auto_role_assignment_enabled: false,
      role_assignment_rules: []
    });
    setSelectedAssignees([]);
    setRoutingRules([]);
    setRoleAssignmentRules([]);
    setFields([]);
    setActiveTab('basic');
    setShowModal(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      deadline_days: template.deadline_days || 7,
      is_active: template.is_active,
      routing_type: template.routing_type || 'manual',
      default_assignees: template.default_assignees || [],
      auto_assign_enabled: template.auto_assign_enabled || false,
      department_routing: template.department_routing || false,
      routing_rules: template.routing_rules || [],
      auto_role_assignment_enabled: template.auto_role_assignment_enabled || false,
      role_assignment_rules: template.role_assignment_rules || []
    });
    
    // Загружаем информацию о назначенных пользователях
    loadAssignees(template.default_assignees || []);
    
    // Загружаем правила маршрутизации
    setRoutingRules(template.routing_rules || []);
    
    // Загружаем правила назначения ролей
    setRoleAssignmentRules(template.role_assignment_rules || []);
    
    setActiveTab('basic');
    setShowModal(true);
  };

  const loadAssignees = async (assigneeIds) => {
    if (!assigneeIds || assigneeIds.length === 0) {
      setSelectedAssignees([]);
      return;
    }

    try {
      // Загружаем пользователей по их ID через новый endpoint
      const response = await api.post('/auth/users/by-ids', assigneeIds);
      setSelectedAssignees(response.data);
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
      setSelectedAssignees([]);
    }
  };

  const handleDeleteTemplate = async (template) => {
    if (!window.confirm(`Вы уверены, что хотите удалить шаблон "${template.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.delete(`/api/request-templates/${template.id}`);
      loadTemplates();
    } catch (err) {
      console.error('Ошибка удаления:', err);
      setError('Не удалось удалить шаблон: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!formData.name.trim()) {
      setError('Название шаблона обязательно для заполнения');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Подготавливаем данные для отправки
      const templateData = {
        ...formData,
        default_assignees: selectedAssignees.map(user => user.id),
        routing_rules: routingRules,
        role_assignment_rules: roleAssignmentRules
      };
      
      let savedTemplate;
      if (editingTemplate) {
        const response = await api.put(`/api/request-templates/${editingTemplate.id}`, templateData);
        savedTemplate = response.data;
      } else {
        const response = await api.post('/api/request-templates', templateData);
        savedTemplate = response.data;
        setEditingTemplate(savedTemplate);
      }
      
      setShowModal(false);
      loadTemplates();
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setError('Не удалось сохранить шаблон: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setSelectedAssignees([]);
    setRoutingRules([]);
    setShowRuleForm(false);
    setFields([]);
    setShowFieldForm(false);
    setError(null);
  };

  // Функции для управления маршрутизацией
  const handleAddAssignee = (user) => {
    if (!selectedAssignees.find(assignee => assignee.id === user.id)) {
      const updatedAssignees = [...selectedAssignees, user];
      setSelectedAssignees(updatedAssignees);
      setFormData(prev => ({ 
        ...prev, 
        default_assignees: updatedAssignees.map(u => u.id)
      }));
    }
  };

  const handleRemoveAssignee = (userId) => {
    const updatedAssignees = selectedAssignees.filter(user => user.id !== userId);
    setSelectedAssignees(updatedAssignees);
    setFormData(prev => ({ 
      ...prev, 
      default_assignees: updatedAssignees.map(u => u.id)
    }));
  };

  // Функции для управления правилами маршрутизации
  const handleCreateRule = () => {
    setEditingRule(null);
    setRuleData({
      field: '',
      value: '',
      assignees: []
    });
    setRuleAssignees([]);
    setShowRuleForm(true);
  };

  const handleEditRule = (index) => {
    const rule = routingRules[index];
    setEditingRule(index);
    setRuleData({
      field: rule.field,
      value: rule.value,
      assignees: rule.assignees
    });
    
    // Загружаем информацию о назначенных пользователях для правила
    loadRuleAssignees(rule.assignees);
    setShowRuleForm(true);
  };

  const loadRuleAssignees = async (assigneeIds) => {
    if (!assigneeIds || assigneeIds.length === 0) {
      setRuleAssignees([]);
      return;
    }

    try {
      const response = await api.post('/auth/users/by-ids', assigneeIds);
      setRuleAssignees(response.data);
    } catch (err) {
      console.error('Ошибка загрузки пользователей для правила:', err);
      setRuleAssignees([]);
    }
  };

  const handleSaveRule = () => {
    if (!ruleData.field.trim() || !ruleData.value.trim() || ruleAssignees.length === 0) {
      setError('Заполните все поля правила и выберите исполнителей');
      return;
    }

    const rule = {
      field: ruleData.field.trim(),
      value: ruleData.value.trim(),
      assignees: ruleAssignees.map(user => user.id)
    };

    let updatedRules;
    if (editingRule !== null) {
      // Редактирование существующего правила
      updatedRules = [...routingRules];
      updatedRules[editingRule] = rule;
    } else {
      // Добавление нового правила
      updatedRules = [...routingRules, rule];
    }

    setRoutingRules(updatedRules);
    setFormData(prev => ({ ...prev, routing_rules: updatedRules }));
    setShowRuleForm(false);
    setError(null);
  };

  const handleDeleteRule = (index) => {
    const updatedRules = routingRules.filter((_, i) => i !== index);
    setRoutingRules(updatedRules);
    setFormData(prev => ({ ...prev, routing_rules: updatedRules }));
  };

  const handleAddRuleAssignee = (user) => {
    if (!ruleAssignees.find(assignee => assignee.id === user.id)) {
      const updatedAssignees = [...ruleAssignees, user];
      setRuleAssignees(updatedAssignees);
      setRuleData(prev => ({ 
        ...prev, 
        assignees: updatedAssignees.map(u => u.id)
      }));
    }
  };

  const handleRemoveRuleAssignee = (userId) => {
    const updatedAssignees = ruleAssignees.filter(user => user.id !== userId);
    setRuleAssignees(updatedAssignees);
    setRuleData(prev => ({ 
      ...prev, 
      assignees: updatedAssignees.map(u => u.id)
    }));
  };

  // Функции для управления правилами назначения ролей
  const handleCreateRoleRule = () => {
    setEditingRoleRule(null);
    setRoleRuleData({
      field: '',
      value: '',
      role: '',
      description: ''
    });
    setShowRoleRuleForm(true);
  };

  const handleEditRoleRule = (index) => {
    const rule = roleAssignmentRules[index];
    setEditingRoleRule(index);
    setRoleRuleData({
      field: rule.field,
      value: rule.value,
      role: rule.role,
      description: rule.description || ''
    });
    setShowRoleRuleForm(true);
  };

  const handleSaveRoleRule = () => {
    if (!roleRuleData.field.trim() || !roleRuleData.value.trim() || !roleRuleData.role) {
      setError('Заполните все обязательные поля правила назначения роли');
      return;
    }

    const rule = {
      field: roleRuleData.field.trim(),
      value: roleRuleData.value.trim(),
      role: roleRuleData.role,
      description: roleRuleData.description.trim()
    };

    let updatedRules;
    if (editingRoleRule !== null) {
      // Редактирование существующего правила
      updatedRules = [...roleAssignmentRules];
      updatedRules[editingRoleRule] = rule;
    } else {
      // Добавление нового правила
      updatedRules = [...roleAssignmentRules, rule];
    }

    setRoleAssignmentRules(updatedRules);
    setFormData(prev => ({ ...prev, role_assignment_rules: updatedRules }));
    setShowRoleRuleForm(false);
    setError(null);
  };

  const handleDeleteRoleRule = (index) => {
    const updatedRules = roleAssignmentRules.filter((_, i) => i !== index);
    setRoleAssignmentRules(updatedRules);
    setFormData(prev => ({ ...prev, role_assignment_rules: updatedRules }));
  };

  // Функции для работы с полями
  const handleCreateField = () => {
    setEditingField(null);
    setFieldData({
      name: '',
      label: '',
      description: '',
      placeholder: '',
      field_type_id: '',
      is_required: false,
      is_visible: true,
      sort_order: fields.length,
      default_value: '',
      options: [],
      conditional_field_id: null,
      conditional_value: '',
      conditional_operator: 'equals',
      profile_field_mapping: '',
      update_profile_on_submit: false,
      update_profile_on_approve: false
    });
    setFieldOptions([]);
    setNewOption('');
    setShowFieldForm(true);
  };

  const handleEditField = (field) => {
    setEditingField(field);
    setFieldData({
      name: field.name,
      label: field.label,
      description: field.description || '',
      placeholder: field.placeholder || '',
      field_type_id: field.field_type_id,
      is_required: field.is_required,
      is_visible: field.is_visible,
      sort_order: field.sort_order,
      default_value: field.default_value || '',
      options: field.options || [],
      conditional_field_id: field.conditional_field_id || null,
      conditional_value: field.conditional_value || '',
      conditional_operator: field.conditional_operator || 'equals',
      profile_field_mapping: field.profile_field_mapping || '',
      update_profile_on_submit: field.update_profile_on_submit || false,
      update_profile_on_approve: field.update_profile_on_approve || false
    });
    setFieldOptions(field.options || []);
    setNewOption('');
    setShowFieldForm(true);
  };

  const handleSaveField = async (e) => {
    e.preventDefault();
    
    if (!fieldData.label.trim() || !fieldData.field_type_id) {
      setError('Название поля и тип обязательны для заполнения');
      return;
    }

    if (hasOptions() && fieldOptions.length === 0) {
      setError('Для данного типа поля необходимо указать хотя бы один вариант ответа');
      return;
    }

    if (!editingTemplate) {
      setError('Сначала сохраните шаблон');
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

    console.log('Отправляемые данные поля:', processedFieldData);

    try {
      setLoading(true);
      setError(null);
      
      if (editingField) {
        await api.put(`/api/fields/fields/${editingField.id}`, processedFieldData);
      } else {
        await api.post(`/api/fields/templates/${editingTemplate.id}/fields`, processedFieldData);
      }
      
      setShowFieldForm(false);
      loadTemplateFields();
    } catch (err) {
      console.error('Ошибка сохранения поля:', err);
      console.error('Детали ошибки:', err.response?.data);
      setError('Не удалось сохранить поле: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteField = async (field) => {
    if (!window.confirm(`Вы уверены, что хотите удалить поле "${field.label}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.delete(`/api/fields/fields/${field.id}`);
      loadTemplateFields();
    } catch (err) {
      console.error('Ошибка удаления поля:', err);
      setError('Не удалось удалить поле: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getFieldTypeLabel = (fieldTypeId) => {
    const fieldType = fieldTypes.find(ft => ft.id === fieldTypeId);
    return fieldType ? fieldType.label : 'Неизвестный тип';
  };

  const getSelectedFieldType = () => {
    return fieldTypes.find(ft => ft.id === parseInt(fieldData.field_type_id));
  };

  const hasOptions = () => {
    const selectedType = getSelectedFieldType();
    return selectedType?.has_options || false;
  };

  // Функции для работы с вариантами ответов
  const handleAddOption = () => {
    if (newOption.trim()) {
      const option = { label: newOption.trim(), value: newOption.trim().toLowerCase() };
      const updatedOptions = [...fieldOptions, option];
      setFieldOptions(updatedOptions);
      setFieldData(prev => ({ ...prev, options: updatedOptions }));
      setNewOption('');
    }
  };

  const handleRemoveOption = (index) => {
    const updatedOptions = fieldOptions.filter((_, i) => i !== index);
    setFieldOptions(updatedOptions);
    setFieldData(prev => ({ ...prev, options: updatedOptions }));
  };

  const handleEditOption = (index, newLabel) => {
    const updatedOptions = fieldOptions.map((option, i) => 
      i === index 
        ? { ...option, label: newLabel, value: newLabel.toLowerCase() }
        : option
    );
    setFieldOptions(updatedOptions);
    setFieldData(prev => ({ ...prev, options: updatedOptions }));
  };

  const handleDebugTemplate = async (templateId) => {
    try {
      const response = await api.get(`/api/request-templates/${templateId}/debug`);
      console.log('DEBUG: Настройки шаблона:', response.data);
      alert(`Настройки шаблона:\n\nНазвание: ${response.data.name}\nТип маршрутизации: ${response.data.routing_type}\nАвтоназначение: ${response.data.auto_assign_enabled ? 'ВКЛ' : 'ВЫКЛ'}\nИсполнители: ${response.data.default_assignees?.length || 0} чел.\n\nПодробности в консоли браузера (F12).`);
    } catch (err) {
      console.error('Ошибка отладки:', err);
      setError('Ошибка отладки: ' + getErrorMessage(err));
    }
  };

  if (loading && templates.length === 0) {
    return <Loader text="Загрузка шаблонов заявок..." />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Конструктор заявок</h1>
          <p className="text-gray-600 mt-2">Создание и управление шаблонами заявок</p>
        </div>
        <Button 
          onClick={handleCreateTemplate}
          variant="primary"
          disabled={loading}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Создать шаблон
        </Button>
      </div>

      {error && (
        <Alert variant="error" message={error} />
      )}

      {/* Список шаблонов */}
      <Card>
        <CardHeader>
          <CardTitle>Существующие шаблоны</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Нет созданных шаблонов</p>
              <Button 
                onClick={handleCreateTemplate}
                variant="primary"
                className="mt-4"
                disabled={loading}
              >
                Создать первый шаблон
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {template.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.is_active ? (
                          <>
                            <CheckCircleIcon className="h-3 w-3 inline mr-1" />
                            Активен
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="h-3 w-3 inline mr-1" />
                            Неактивен
                          </>
                        )}
                      </span>
                    </div>
                    {template.description && (
                      <p className="text-gray-600 mt-1">{template.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-blue-600 font-medium">
                        📅 Срок: {template.deadline_days} {template.deadline_days === 1 ? 'день' : template.deadline_days < 5 ? 'дня' : 'дней'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Создан: {new Date(template.created_at).toLocaleDateString('ru-RU')}
                      {template.updated_at && (
                        <span className="ml-4">
                          Обновлен: {new Date(template.updated_at).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleEditTemplate(template)}
                      variant="outline"
                      size="sm"
                      disabled={loading}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteTemplate(template)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      disabled={loading}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модальное окно */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Заголовок модального окна */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTemplate ? 'Редактирование шаблона' : 'Создание шаблона'}
              </h2>
              <Button
                onClick={handleCloseModal}
                variant="outline"
                size="sm"
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>

            {/* Вкладки */}
            <div className="border-b">
              <div className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-6 py-3 font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <tab.icon className="h-5 w-5 mr-2" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Содержимое вкладок */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Основная информация</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Название шаблона *
                      </label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Введите название шаблона"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Срок выполнения (дни) *
                      </label>
                      <Input
                        type="number"
                        value={formData.deadline_days}
                        onChange={(e) => setFormData(prev => ({ ...prev, deadline_days: parseInt(e.target.value) || 7 }))}
                        placeholder="Введите количество дней"
                        min="1"
                        max="365"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Описание
                    </label>
                    <TextArea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Описание назначения шаблона"
                      rows="3"
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={loading}
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                      Активный шаблон
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'routing' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold mb-4">Настройка маршрутизации</h3>
                  
                  {/* Тип маршрутизации */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Тип маршрутизации
                    </label>
                    <Select
                      value={formData.routing_type}
                      onChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        routing_type: value,
                        // Автоматически включаем auto_assign_enabled для всех типов кроме manual
                        auto_assign_enabled: value !== 'manual'
                      }))}
                      options={[
                        { value: 'manual', label: 'Ручное назначение (по умолчанию)' },
                        { value: 'auto_assign', label: 'Автоматическое назначение из списка' },
                        { value: 'department', label: 'По отделам' },
                        { value: 'round_robin', label: 'По очереди' }
                      ]}
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.routing_type === 'manual' && 'Заявки будут требовать ручного назначения ответственного'}
                      {formData.routing_type === 'auto_assign' && 'Заявки будут автоматически назначаться одному из указанных пользователей'}
                      {formData.routing_type === 'department' && 'Заявки будут направляться в соответствующие отделы'}
                      {formData.routing_type === 'round_robin' && 'Заявки будут назначаться по очереди между указанными пользователями'}
                    </p>
                  </div>

                  {/* Список исполнителей по умолчанию */}
                  {['auto_assign', 'round_robin'].includes(formData.routing_type) && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Исполнители по умолчанию
                        </label>
                        <p className="text-sm text-gray-600 mb-3">
                          Добавьте пользователей, которые могут быть назначены на заявки по этому шаблону
                        </p>
                        
                        <UserSearch
                          onSelect={handleAddAssignee}
                          placeholder="Найти пользователя для добавления..."
                          className="mb-4"
                        />
                      </div>

                      {/* Список выбранных исполнителей */}
                      {selectedAssignees.length > 0 ? (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">
                            Выбранные исполнители ({selectedAssignees.length})
                          </h4>
                          <div className="space-y-2">
                            {selectedAssignees.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-blue-600">
                                      {(user.display_name || user.email || '?').charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {user.display_name || user.email}
                                    </p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                  </div>
                                </div>
                                <Button
                                  onClick={() => handleRemoveAssignee(user.id)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                          <UserGroupIcon className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">
                            Добавьте хотя бы одного исполнителя
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Дополнительные настройки */}
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-700">Дополнительные настройки</h4>
                    
                    <div className="space-y-3">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          checked={formData.auto_assign_enabled}
                          onChange={(e) => setFormData(prev => ({ ...prev, auto_assign_enabled: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                          disabled={loading || formData.routing_type === 'manual'}
                        />
                        <div className="ml-2">
                          <span className="text-sm text-gray-700">
                            Включить автоматическое назначение
                          </span>
                          <p className="text-xs text-red-600 mt-1">
                            ⚠️ Обязательно для работы автоматической маршрутизации!
                          </p>
                        </div>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.department_routing}
                          onChange={(e) => setFormData(prev => ({ ...prev, department_routing: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={loading}
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Использовать маршрутизацию по отделам
                        </span>
                      </label>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-blue-800 mb-2">Как работает маршрутизация:</h5>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• <strong>Ручное назначение:</strong> Ответственный назначается вручную после создания заявки</li>
                        <li>• <strong>Автоматическое:</strong> Система сама назначает одного из указанных исполнителей</li>
                        <li>• <strong>По отделам:</strong> Заявки направляются в отделы согласно настройкам</li>
                        <li>• <strong>По очереди:</strong> Исполнители назначаются поочередно для равномерного распределения нагрузки</li>
                      </ul>
                    </div>
                  </div>

                  {/* Правила условной маршрутизации */}
                  {formData.auto_assign_enabled && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Правила условной маршрутизации</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            Настройте автоназначение на основе данных формы (например, по факультету)
                          </p>
                        </div>
                        <Button 
                          onClick={handleCreateRule}
                          variant="outline"
                          size="sm"
                          disabled={loading}
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Добавить правило
                        </Button>
                      </div>

                      {/* Список правил */}
                      {routingRules.length > 0 ? (
                        <div className="space-y-3">
                          {routingRules.map((rule, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    Если поле "{rule.field}" = "{rule.value}"
                                  </span>
                                  <span className="text-xs text-gray-500">→</span>
                                  <span className="text-sm text-blue-600">
                                    {rule.assignees.length} исполнител{rule.assignees.length === 1 ? 'ь' : (rule.assignees.length < 5 ? 'я' : 'ей')}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Заявки будут назначены одному из выбранных исполнителей
                                </p>
                              </div>
                              
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => handleEditRule(index)}
                                  variant="outline"
                                  size="sm"
                                  disabled={loading}
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteRule(index)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                  disabled={loading}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                          <CogIcon className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">
                            Пока нет правил условной маршрутизации
                          </p>
                          <p className="text-xs text-gray-400">
                            Добавьте правила для автоматического назначения ответственных на основе данных формы
                          </p>
                        </div>
                      )}

                      {/* Форма создания/редактирования правила */}
                      {showRuleForm && (
                        <Card className="mt-4">
                          <CardHeader>
                            <CardTitle>
                              {editingRule !== null ? 'Редактирование правила' : 'Создание нового правила'}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Поле формы *
                                  </label>
                                  <Input
                                    value={ruleData.field}
                                    onChange={(e) => setRuleData(prev => ({ ...prev, field: e.target.value }))}
                                    placeholder="Например: faculty, department"
                                    disabled={loading}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Техническое имя поля из формы заявки
                                  </p>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Значение поля *
                                  </label>
                                  <Input
                                    value={ruleData.value}
                                    onChange={(e) => setRuleData(prev => ({ ...prev, value: e.target.value }))}
                                    placeholder="Например: technical, economic"
                                    disabled={loading}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Значение, при котором применяется правило
                                  </p>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Исполнители для этого правила *
                                </label>
                                <p className="text-sm text-gray-600 mb-3">
                                  Выберите пользователей, которые будут назначены при срабатывании правила
                                </p>
                                
                                <UserSearch
                                  onSelect={handleAddRuleAssignee}
                                  placeholder="Найти пользователя для добавления..."
                                  className="mb-4"
                                />

                                {/* Список выбранных исполнителей для правила */}
                                {ruleAssignees.length > 0 ? (
                                  <div className="space-y-2">
                                    <h5 className="text-sm font-medium text-gray-700">
                                      Выбранные исполнители ({ruleAssignees.length})
                                    </h5>
                                    <div className="space-y-2">
                                      {ruleAssignees.map((user) => (
                                        <div
                                          key={user.id}
                                          className="flex items-center justify-between p-2 bg-blue-50 rounded border"
                                        >
                                          <div className="flex items-center space-x-3">
                                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                              <span className="text-xs font-medium text-blue-600">
                                                {(user.display_name || user.email || '?').charAt(0).toUpperCase()}
                                              </span>
                                            </div>
                                            <div>
                                              <p className="text-sm font-medium text-gray-900">
                                                {user.display_name || user.email}
                                              </p>
                                              <p className="text-xs text-gray-500">{user.email}</p>
                                            </div>
                                          </div>
                                          <Button
                                            onClick={() => handleRemoveRuleAssignee(user.id)}
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 border-red-300 hover:bg-red-50"
                                          >
                                            <TrashIcon className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                                    <UserGroupIcon className="mx-auto h-6 w-6 text-gray-400" />
                                    <p className="mt-1 text-sm text-gray-500">
                                      Добавьте исполнителей для правила
                                    </p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex space-x-3 pt-4">
                                <Button 
                                  onClick={handleSaveRule}
                                  variant="primary"
                                  disabled={loading}
                                >
                                  {editingRule !== null ? 'Обновить' : 'Создать'} правило
                                </Button>
                                <Button 
                                  onClick={() => setShowRuleForm(false)}
                                  variant="outline"
                                  disabled={loading}
                                >
                                  Отмена
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-green-800 mb-2">Как работают правила:</h5>
                        <ul className="text-sm text-green-700 space-y-1">
                          <li>• Система проверяет правила по порядку (сверху вниз)</li>
                          <li>• Применяется первое подходящее правило</li>
                          <li>• Если ни одно правило не подходит, используются исполнители по умолчанию</li>
                          <li>• Пример: поле "faculty" = "technical" → назначить на техдеп</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'roles' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold mb-4">Автоматическое назначение ролей</h3>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Как работает назначение ролей:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Роли назначаются автоматически при <strong>завершении</strong> заявки</li>
                      <li>• Можно настроить условия на основе данных формы</li>
                      <li>• Например: если "факультет" = "технический", то назначить роль "student"</li>
                      <li>• Роли добавляются к существующим, не заменяют их</li>
                    </ul>
                  </div>

                  {/* Включение автоназначения ролей */}
                  <div className="space-y-4">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={formData.auto_role_assignment_enabled}
                        onChange={(e) => setFormData(prev => ({ ...prev, auto_role_assignment_enabled: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                        disabled={loading}
                      />
                      <div className="ml-2">
                        <span className="text-sm font-medium text-gray-700">
                          Включить автоматическое назначение ролей
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          При завершении заявки будут применены правила назначения ролей
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Правила назначения ролей */}
                  {formData.auto_role_assignment_enabled && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Правила назначения ролей</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            Настройте какие роли назначать на основе данных формы
                          </p>
                        </div>
                        <Button 
                          onClick={handleCreateRoleRule}
                          variant="outline"
                          size="sm"
                          disabled={loading}
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Добавить правило
                        </Button>
                      </div>

                      {/* Список правил назначения ролей */}
                      {roleAssignmentRules.length > 0 ? (
                        <div className="space-y-3">
                          {roleAssignmentRules.map((rule, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    Если поле "{rule.field}" = "{rule.value}"
                                  </span>
                                  <span className="text-xs text-gray-500">→</span>
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                    {availableRoles.find(r => r.value === rule.role)?.label || rule.role}
                                  </span>
                                </div>
                                {rule.description && (
                                  <p className="text-xs text-gray-500 mt-1">{rule.description}</p>
                                )}
                              </div>
                              
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => handleEditRoleRule(index)}
                                  variant="outline"
                                  size="sm"
                                  disabled={loading}
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteRoleRule(index)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                  disabled={loading}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                          <ShieldCheckIcon className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">
                            Пока нет правил назначения ролей
                          </p>
                          <p className="text-xs text-gray-400">
                            Добавьте правила для автоматического назначения ролей при завершении заявки
                          </p>
                        </div>
                      )}

                      {/* Форма создания/редактирования правила роли */}
                      {showRoleRuleForm && (
                        <Card className="mt-4">
                          <CardHeader>
                            <CardTitle>
                              {editingRoleRule !== null ? 'Редактирование правила роли' : 'Создание нового правила роли'}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Поле формы *
                                  </label>
                                  <Select
                                    value={roleRuleData.field}
                                    onChange={(value) => setRoleRuleData(prev => ({ 
                                      ...prev, 
                                      field: value,
                                      value: '' // Сбрасываем значение при смене поля
                                    }))}
                                    options={fields.map(field => ({
                                      value: field.name,
                                      label: `${field.label} (${field.name})`
                                    }))}
                                    placeholder="Выберите поле из формы"
                                    disabled={loading}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Поле из формы заявки, на которое будет проверяться условие
                                  </p>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Значение поля *
                                  </label>
                                  {(() => {
                                    const selectedField = fields.find(f => f.name === roleRuleData.field);
                                    const hasOptions = selectedField?.options && selectedField.options.length > 0;
                                    
                                    if (roleRuleData.field && hasOptions) {
                                      // Показываем Select с вариантами поля
                                      return (
                                        <>
                                          <Select
                                            value={roleRuleData.value}
                                            onChange={(value) => setRoleRuleData(prev => ({ ...prev, value: value }))}
                                            options={selectedField.options.map(option => ({
                                              value: option.value,
                                              label: option.label
                                            }))}
                                            placeholder="Выберите значение"
                                            disabled={loading}
                                          />
                                          <p className="text-xs text-green-600 mt-1">
                                            ✓ Выберите один из вариантов поля "{selectedField.label}"
                                          </p>
                                        </>
                                      );
                                    } else if (roleRuleData.field) {
                                      // Показываем обычный Input для полей без вариантов
                                      return (
                                        <>
                                          <Input
                                            value={roleRuleData.value}
                                            onChange={(e) => setRoleRuleData(prev => ({ ...prev, value: e.target.value }))}
                                            placeholder="Введите точное значение"
                                            disabled={loading}
                                          />
                                          <p className="text-xs text-blue-600 mt-1">
                                            ℹ️ Поле "{selectedField?.label}" не имеет предустановленных вариантов - введите точное значение
                                          </p>
                                        </>
                                      );
                                    } else {
                                      // Поле не выбрано
                                      return (
                                        <>
                                          <Input
                                            value=""
                                            placeholder="Сначала выберите поле формы"
                                            disabled={true}
                                          />
                                          <p className="text-xs text-gray-500 mt-1">
                                            Сначала выберите поле формы выше
                                          </p>
                                        </>
                                      );
                                    }
                                  })()}
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Роль для назначения *
                                </label>
                                <Select
                                  value={roleRuleData.role}
                                  onChange={(value) => setRoleRuleData(prev => ({ ...prev, role: value }))}
                                  options={availableRoles}
                                  placeholder="Выберите роль"
                                  disabled={loading}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Роль будет добавлена пользователю при завершении заявки
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Описание правила
                                </label>
                                <Input
                                  value={roleRuleData.description}
                                  onChange={(e) => setRoleRuleData(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Например: Назначение роли студента для технического факультета"
                                  disabled={loading}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Необязательное описание для понимания правила
                                </p>
                              </div>
                              
                              <div className="flex space-x-3 pt-4">
                                <Button 
                                  onClick={handleSaveRoleRule}
                                  variant="primary"
                                  disabled={loading}
                                >
                                  {editingRoleRule !== null ? 'Обновить' : 'Создать'} правило
                                </Button>
                                <Button 
                                  onClick={() => setShowRoleRuleForm(false)}
                                  variant="outline"
                                  disabled={loading}
                                >
                                  Отмена
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-green-800 mb-2">Примеры использования:</h5>
                        <ul className="text-sm text-green-700 space-y-1">
                          <li>• Заявка на студенческий билет → назначить роль "student"</li>
                          <li>• Факультет "технический" → назначить роль "technical_student"</li>
                          <li>• Тип заявки "кураторская" → назначить роль "curator"</li>
                          <li>• Отдел "администрация" → назначить роль "admin_assistant"</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'fields' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Конструктор полей</h3>
                    <Button 
                      onClick={handleCreateField}
                      variant="primary"
                      disabled={loading || !editingTemplate}
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Добавить поле
                    </Button>
                  </div>

                  {!editingTemplate && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800">
                        Сначала сохраните основную информацию шаблона, затем можно будет добавлять поля.
                      </p>
                    </div>
                  )}

                  {editingTemplate && (
                    <>
                      {fields.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                          <p className="text-gray-500">Нет созданных полей</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {fields.map((field) => (
                            <div
                              key={field.id}
                              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <h4 className="font-medium text-gray-900">
                                    {field.label}
                                  </h4>
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                    {getFieldTypeLabel(field.field_type_id)}
                                  </span>
                                  {field.is_required && (
                                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                                      Обязательное
                                    </span>
                                  )}
                                  {!field.is_visible && (
                                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                                      <EyeSlashIcon className="h-3 w-3 inline mr-1" />
                                      Скрыто
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {field.name}
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
                                {field.conditional_field_id && (
                                  <div className="mt-2">
                                    <p className="text-xs text-gray-500 mb-1">Условие:</p>
                                    <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                                      {(() => {
                                        const conditionalField = fields.find(f => f.id === field.conditional_field_id);
                                        const operatorText = {
                                          'equals': 'равно',
                                          'not_equals': 'не равно', 
                                          'contains': 'содержит',
                                          'not_empty': 'не пустое',
                                          'empty': 'пустое'
                                        }[field.conditional_operator] || 'равно';
                                        
                                        return `${conditionalField?.label || 'поле'} ${operatorText} "${field.conditional_value}"`;
                                      })()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => handleEditField(field)}
                                  variant="outline"
                                  size="sm"
                                  disabled={loading}
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteField(field)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                  disabled={loading}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Форма создания/редактирования поля */}
                      {showFieldForm && (
                        <Card className="mt-6">
                          <CardHeader>
                            <CardTitle>
                              {editingField ? 'Редактирование поля' : 'Создание нового поля'}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <form onSubmit={handleSaveField} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Название поля *
                                  </label>
                                  <Input
                                    value={fieldData.label}
                                    onChange={(e) => setFieldData(prev => ({ ...prev, label: e.target.value }))}
                                    placeholder="Введите название поля"
                                    required
                                    disabled={loading}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Техническое имя
                                  </label>
                                  <Input
                                    value={fieldData.name}
                                    onChange={(e) => setFieldData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Автоматически из названия"
                                    disabled={loading}
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Тип поля *
                                </label>
                                <Select
                                  value={fieldData.field_type_id}
                                  onChange={(value) => {
                                    const newFieldTypeId = parseInt(value);
                                    setFieldData(prev => ({ ...prev, field_type_id: newFieldTypeId }));
                                    
                                    // Сбрасываем варианты если новый тип их не поддерживает
                                    const newFieldType = fieldTypes.find(ft => ft.id === newFieldTypeId);
                                    if (!newFieldType?.has_options) {
                                      setFieldOptions([]);
                                      setFieldData(prev => ({ ...prev, options: [] }));
                                    }
                                  }}
                                  options={fieldTypes.map(ft => ({ value: ft.id, label: ft.label }))}
                                  placeholder="Выберите тип поля"
                                  disabled={loading}
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Placeholder
                                </label>
                                <Input
                                  value={fieldData.placeholder}
                                  onChange={(e) => setFieldData(prev => ({ ...prev, placeholder: e.target.value }))}
                                  placeholder="Текст подсказки в поле"
                                  disabled={loading}
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
                                          <Input
                                            value={option.label}
                                            onChange={(e) => handleEditOption(index, e.target.value)}
                                            className="flex-1"
                                            disabled={loading}
                                          />
                                          <Button
                                            type="button"
                                            onClick={() => handleRemoveOption(index)}
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 border-red-300 hover:bg-red-50"
                                            disabled={loading}
                                          >
                                            <TrashIcon className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Добавление нового варианта */}
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      value={newOption}
                                      onChange={(e) => setNewOption(e.target.value)}
                                      placeholder="Введите новый вариант"
                                      className="flex-1"
                                      disabled={loading}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleAddOption();
                                        }
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      onClick={handleAddOption}
                                      variant="outline"
                                      disabled={loading || !newOption.trim()}
                                    >
                                      <PlusIcon className="h-4 w-4 mr-1" />
                                      Добавить
                                    </Button>
                                  </div>
                                  
                                  {fieldOptions.length === 0 && (
                                    <p className="text-sm text-red-600">
                                      Необходимо добавить хотя бы один вариант ответа
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Секция условной видимости */}
                              <div className="border-t pt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Условная видимость поля</h4>
                                <p className="text-xs text-gray-500 mb-3">
                                  Настройте когда это поле должно отображаться в форме в зависимости от значений других полей
                                </p>
                                
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Зависит от поля
                                    </label>
                                    <Select
                                      value={fieldData.conditional_field_id || ''}
                                      onChange={(value) => setFieldData(prev => ({ 
                                        ...prev, 
                                        conditional_field_id: value || null,
                                        conditional_value: '', // Сбрасываем значение при смене поля
                                        conditional_operator: value ? prev.conditional_operator : 'equals'
                                      }))}
                                      options={[
                                        { value: '', label: 'Поле всегда видимо' },
                                        ...fields
                                          .filter(f => f.id !== editingField?.id) // Исключаем само поле
                                          .map(f => ({
                                            value: f.id,
                                            label: f.label
                                          }))
                                      ]}
                                      placeholder="Выберите поле"
                                      disabled={loading}
                                    />
                                    {fieldData.conditional_field_id && (
                                      <div className="mt-1">
                                        <p className="text-xs text-gray-500">
                                          Поле будет показано только при определенном значении выбранного поля
                                        </p>
                                        {(() => {
                                          const conditionalField = fields.find(f => f.id === fieldData.conditional_field_id);
                                          const hasOptions = conditionalField?.options && conditionalField.options.length > 0;
                                          
                                          if (hasOptions) {
                                            return (
                                              <p className="text-xs text-green-600 mt-1">
                                                ✓ У поля "{conditionalField.label}" есть варианты - можно выбрать значение из списка
                                              </p>
                                            );
                                          } else {
                                            return (
                                              <p className="text-xs text-blue-600 mt-1">
                                                ℹ️ У поля "{conditionalField?.label}" нет вариантов - нужно будет ввести значение вручную
                                              </p>
                                            );
                                          }
                                        })()}
                                      </div>
                                    )}
                                  </div>

                                  {fieldData.conditional_field_id && (
                                    <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-sm font-medium text-blue-800 mb-1">
                                            Условие *
                                          </label>
                                          <Select
                                            value={fieldData.conditional_operator}
                                            onChange={(value) => setFieldData(prev => ({ 
                                              ...prev, 
                                              conditional_operator: value 
                                            }))}
                                            options={[
                                              { value: 'equals', label: 'Равно' },
                                              { value: 'not_equals', label: 'Не равно' },
                                              { value: 'contains', label: 'Содержит' },
                                              { value: 'not_empty', label: 'Не пустое' },
                                              { value: 'empty', label: 'Пустое' }
                                            ]}
                                            disabled={loading}
                                          />
                                        </div>

                                        {!['not_empty', 'empty'].includes(fieldData.conditional_operator) && (
                                          <div>
                                            <label className="block text-sm font-medium text-blue-800 mb-1">
                                              Значение *
                                            </label>
                                            {(() => {
                                              const conditionalField = fields.find(f => f.id === fieldData.conditional_field_id);
                                              const hasOptions = conditionalField?.options && conditionalField.options.length > 0;
                                              
                                              if (hasOptions) {
                                                // Показываем селект с вариантами из поля-родителя
                                                return (
                                                  <>
                                                    <Select
                                                      value={fieldData.conditional_value}
                                                      onChange={(value) => setFieldData(prev => ({ 
                                                        ...prev, 
                                                        conditional_value: value 
                                                      }))}
                                                      options={conditionalField.options.map(option => ({
                                                        value: option.value,
                                                        label: option.label
                                                      }))}
                                                      placeholder="Выберите значение"
                                                      disabled={loading}
                                                    />
                                                    <p className="text-xs text-blue-600 mt-1">
                                                      Выберите один из вариантов поля "{conditionalField.label}"
                                                    </p>
                                                  </>
                                                );
                                              } else {
                                                // Показываем обычный ввод для полей без вариантов
                                                return (
                                                  <>
                                                    <Input
                                                      value={fieldData.conditional_value}
                                                      onChange={(e) => setFieldData(prev => ({ 
                                                        ...prev, 
                                                        conditional_value: e.target.value 
                                                      }))}
                                                      placeholder="Введите значение"
                                                      disabled={loading}
                                                    />
                                                    <p className="text-xs text-blue-600 mt-1">
                                                      Точное значение для сравнения (учитывается регистр)
                                                    </p>
                                                  </>
                                                );
                                              }
                                            })()}
                                          </div>
                                        )}
                                      </div>

                                      <div className="bg-blue-100 border border-blue-200 rounded p-2">
                                        <p className="text-xs text-blue-800">
                                          <strong>Пример условия:</strong> 
                                          {(() => {
                                            const conditionalField = fields.find(f => f.id === fieldData.conditional_field_id);
                                            const fieldLabel = conditionalField?.label || 'выбранное поле';
                                            const operator = {
                                              'equals': 'равно',
                                              'not_equals': 'не равно',
                                              'contains': 'содержит',
                                              'not_empty': 'не пустое',
                                              'empty': 'пустое'
                                            }[fieldData.conditional_operator] || 'равно';
                                            
                                            if (['not_empty', 'empty'].includes(fieldData.conditional_operator)) {
                                              return ` Поле "${fieldData.label || 'это поле'}" будет показано, если "${fieldLabel}" ${operator}`;
                                            }
                                            
                                            // Получаем название варианта вместо технического значения
                                            let displayValue = fieldData.conditional_value || 'значение';
                                            if (conditionalField?.options && fieldData.conditional_value) {
                                              const option = conditionalField.options.find(opt => opt.value === fieldData.conditional_value);
                                              if (option) {
                                                displayValue = option.label;
                                              }
                                            }
                                            
                                            return ` Поле "${fieldData.label || 'это поле'}" будет показано, если "${fieldLabel}" ${operator} "${displayValue}"`;
                                          })()}
                                        </p>
                                      </div>

                                      {(!fieldData.conditional_value && !['not_empty', 'empty'].includes(fieldData.conditional_operator)) && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                          <p className="text-xs text-yellow-800">
                                            ⚠️ Укажите значение для сравнения
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Секция связывания с профилем пользователя */}
                              <div className="border-t pt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Связь с профилем пользователя</h4>
                                <p className="text-xs text-gray-500 mb-3">
                                  Автоматическое обновление профиля пользователя данными из этого поля при обработке заявки
                                </p>
                                
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Связанное поле профиля
                                    </label>
                                    <Select
                                      value={fieldData.profile_field_mapping || ''}
                                      onChange={(value) => setFieldData(prev => ({ 
                                        ...prev, 
                                        profile_field_mapping: value || ''
                                      }))}
                                      options={[
                                        { value: '', label: 'Не связывать с профилем' },
                                        ...Object.entries(profileFields).flatMap(([groupName, fields]) =>
                                          fields.map(field => ({
                                            value: field.name,
                                            label: `${field.label} (${groupName})`
                                          }))
                                        )
                                      ]}
                                      placeholder="Выберите поле профиля"
                                      disabled={loading}
                                    />
                                    {fieldData.profile_field_mapping && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Данные из этого поля будут сохранены в профиль пользователя
                                      </p>
                                    )}
                                  </div>

                                  {fieldData.profile_field_mapping && (
                                    <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                                      <h5 className="text-sm font-medium text-blue-800">Когда обновлять профиль?</h5>
                                      
                                      <div className="space-y-2">
                                        <label className="flex items-center">
                                          <input
                                            type="checkbox"
                                            checked={fieldData.update_profile_on_submit}
                                            onChange={(e) => setFieldData(prev => ({ 
                                              ...prev, 
                                              update_profile_on_submit: e.target.checked 
                                            }))}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            disabled={loading}
                                          />
                                          <span className="ml-2 text-sm text-gray-700">
                                            При подаче заявки
                                          </span>
                                        </label>
                                        <p className="text-xs text-gray-500 ml-6">
                                          Профиль обновится сразу после отправки заявки пользователем
                                        </p>

                                        <label className="flex items-center">
                                          <input
                                            type="checkbox"
                                            checked={fieldData.update_profile_on_approve}
                                            onChange={(e) => setFieldData(prev => ({ 
                                              ...prev, 
                                              update_profile_on_approve: e.target.checked 
                                            }))}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            disabled={loading}
                                          />
                                          <span className="ml-2 text-sm text-gray-700">
                                            При одобрении заявки
                                          </span>
                                        </label>
                                        <p className="text-xs text-gray-500 ml-6">
                                          Профиль обновится только после одобрения заявки ответственным
                                        </p>
                                      </div>

                                      {!fieldData.update_profile_on_submit && !fieldData.update_profile_on_approve && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                          <p className="text-xs text-yellow-800">
                                            ⚠️ Выберите хотя бы один момент для обновления профиля
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex space-x-3 pt-4">
                                <Button 
                                  type="submit" 
                                  variant="primary"
                                  disabled={loading}
                                >
                                  {editingField ? 'Обновить' : 'Создать'}
                                </Button>
                                <Button 
                                  type="button"
                                  onClick={() => setShowFieldForm(false)}
                                  variant="outline"
                                  disabled={loading}
                                >
                                  Отмена
                                </Button>
                              </div>
                            </form>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Футер модального окна */}
            <div className="flex justify-between items-center p-6 border-t bg-gray-50">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {editingTemplate ? 'Редактирование шаблона' : 'Создание нового шаблона'}
                </div>
                {editingTemplate && (
                  <Button 
                    onClick={() => handleDebugTemplate(editingTemplate.id)}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    🐛 Отладка
                  </Button>
                )}
              </div>
              <div className="flex space-x-3">
                <Button 
                  onClick={handleCloseModal}
                  variant="outline"
                  disabled={loading}
                >
                  Отмена
                </Button>
                <Button 
                  onClick={handleSaveTemplate}
                  variant="primary"
                  disabled={loading || activeTab === 'fields'}
                >
                  {editingTemplate ? 'Обновить' : 'Создать'} шаблон
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestBuilder; 