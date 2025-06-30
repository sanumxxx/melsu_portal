import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import TextArea from '../common/TextArea';
import Select from '../common/Select';
import UserSelect from '../common/UserSelect';
import { Alert } from '../common/Alert';

const WorkflowBuilder = ({ steps, setSteps, routingRules, setRoutingRules }) => {
  const [activeView, setActiveView] = useState('steps');
  const [selectedStep, setSelectedStep] = useState(null);
  const [selectedRule, setSelectedRule] = useState(null);

  // Добавление нового этапа
  const addStep = () => {
    const newStep = {
      id: Date.now(),
      step_name: '',
      step_description: '',
      step_order: steps.length,
      step_type: 'approval',
      assignment_type: 'role',
      assignment_logic: {},
      assigned_users: [],
      assigned_roles: [],
      assigned_departments: [],
      assigned_positions: [],
      max_execution_time: 24,
      warning_time: 18,
      auto_escalate_time: 48,
      conditions: {},
      skip_conditions: {},
      is_parallel: false,
      is_required: true,
      can_reject: true,
      can_edit: false,
      can_reassign: false,
      can_delegate: false,
      notification_enabled: true,
      notification_settings: {},
      auto_actions: []
    };
    
    setSteps([...steps, newStep]);
    setSelectedStep(newStep.id);
  };

  // Обновление этапа
  const updateStep = (stepId, field, value) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, [field]: value } : step
    ));
  };

  // Удаление этапа
  const removeStep = (stepId) => {
    setSteps(steps.filter(step => step.id !== stepId));
    if (selectedStep === stepId) {
      setSelectedStep(null);
    }
  };

  // Перемещение этапа
  const moveStep = (stepId, direction) => {
    const newSteps = [...steps];
    const currentIndex = newSteps.findIndex(step => step.id === stepId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex >= 0 && newIndex < newSteps.length) {
      [newSteps[currentIndex], newSteps[newIndex]] = [newSteps[newIndex], newSteps[currentIndex]];
      
      // Обновляем порядок
      newSteps.forEach((step, index) => {
        step.step_order = index;
      });
      
      setSteps(newSteps);
    }
  };

  // Добавление правила маршрутизации
  const addRoutingRule = () => {
    const newRule = {
      id: Date.now(),
      rule_name: '',
      rule_type: 'condition',
      condition: {},
      action: {},
      is_active: true,
      priority: 0
    };
    
    setRoutingRules([...routingRules, newRule]);
    setSelectedRule(newRule.id);
  };

  // Обновление правила маршрутизации
  const updateRoutingRule = (ruleId, field, value) => {
    setRoutingRules(routingRules.map(rule => 
      rule.id === ruleId ? { ...rule, [field]: value } : rule
    ));
  };

  // Удаление правила маршрутизации
  const removeRoutingRule = (ruleId) => {
    setRoutingRules(routingRules.filter(rule => rule.id !== ruleId));
    if (selectedRule === ruleId) {
      setSelectedRule(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Навигация */}
      <Card>
        <CardContent className="p-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveView('steps')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'steps'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🔄 Этапы процесса
            </button>
            <button
              onClick={() => setActiveView('rules')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'rules'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Правила маршрутизации
            </button>
            <button
              onClick={() => setActiveView('visual')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'visual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Визуальный редактор
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Этапы процесса */}
      {activeView === 'steps' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Список этапов */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Этапы процесса</CardTitle>
                <Button onClick={addStep} className="bg-green-600 hover:bg-green-700">
                  Добавить этап
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedStep === step.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedStep(step.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {index + 1}. {step.step_name || 'Новый этап'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {step.step_type === 'approval' && 'Согласование'}
                          {step.step_type === 'review' && 'Рассмотрение'}
                          {step.step_type === 'action' && 'Действие'}
                          {step.step_type === 'notification' && 'Уведомление'}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveStep(step.id, 'up');
                          }}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          ↑
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveStep(step.id, 'down');
                          }}
                          disabled={index === steps.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          ↓
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStep(step.id);
                          }}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {steps.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Нет созданных этапов
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Детали этапа */}
          <div className="lg:col-span-2">
            {selectedStep ? (
              <StepEditor
                step={steps.find(s => s.id === selectedStep)}
                onUpdate={(field, value) => updateStep(selectedStep, field, value)}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  Выберите этап для редактирования
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Правила маршрутизации */}
      {activeView === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Список правил */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Правила маршрутизации</CardTitle>
                <Button onClick={addRoutingRule} className="bg-green-600 hover:bg-green-700">
                  Добавить правило
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {routingRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedRule === rule.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedRule(rule.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {rule.rule_name || 'Новое правило'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {rule.rule_type === 'condition' && 'Условие'}
                          {rule.rule_type === 'priority' && 'Приоритет'}
                          {rule.rule_type === 'escalation' && 'Эскалация'}
                          {rule.rule_type === 'notification' && 'Уведомление'}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <span className={`px-2 py-1 text-xs rounded ${
                          rule.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.is_active ? 'Вкл' : 'Выкл'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRoutingRule(rule.id);
                          }}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {routingRules.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Нет созданных правил
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Детали правила */}
          <div className="lg:col-span-2">
            {selectedRule ? (
              <RuleEditor
                rule={routingRules.find(r => r.id === selectedRule)}
                onUpdate={(field, value) => updateRoutingRule(selectedRule, field, value)}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  Выберите правило для редактирования
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Визуальный редактор */}
      {activeView === 'visual' && (
        <VisualWorkflowEditor 
          steps={steps} 
          onStepsChange={setSteps}
          routingRules={routingRules}
          onRulesChange={setRoutingRules}
        />
      )}
    </div>
  );
};

// Компонент редактора этапа
const StepEditor = ({ step, onUpdate }) => {
  const stepTypes = [
    { value: 'approval', label: 'Согласование' },
    { value: 'review', label: 'Рассмотрение' },
    { value: 'action', label: 'Действие' },
    { value: 'notification', label: 'Уведомление' }
  ];

  const assignmentTypes = [
    { value: 'user', label: 'Конкретный пользователь' },
    { value: 'users', label: 'Несколько пользователей' },
    { value: 'role', label: 'Роль' },
    { value: 'department', label: 'Подразделение' },
    { value: 'position', label: 'Должность' },
    { value: 'smart', label: 'Умное назначение' }
  ];

  const availableRoles = [
    { value: 'student', label: 'Студент' },
    { value: 'teacher', label: 'Преподаватель' },
    { value: 'employee', label: 'Сотрудник' },
    { value: 'admin', label: 'Администратор' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Настройка этапа: {step.step_name || 'Новый этап'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Основные настройки */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Основные настройки</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название этапа *
              </label>
              <Input
                value={step.step_name}
                onChange={(e) => onUpdate('step_name', e.target.value)}
                placeholder="Введите название этапа"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип этапа
              </label>
              <Select
                value={step.step_type}
                onChange={(value) => onUpdate('step_type', value)}
                options={stepTypes}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание
            </label>
            <TextArea
              value={step.step_description}
              onChange={(e) => onUpdate('step_description', e.target.value)}
              placeholder="Опишите что происходит на этом этапе"
              rows={2}
            />
          </div>
        </div>

        {/* Настройки назначения */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Назначение исполнителей</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип назначения
            </label>
            <Select
              value={step.assignment_type}
              onChange={(value) => onUpdate('assignment_type', value)}
              options={assignmentTypes}
            />
          </div>

          {step.assignment_type === 'role' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Роли
              </label>
              <Select
                multiple
                value={step.assigned_roles}
                onChange={(value) => onUpdate('assigned_roles', value)}
                options={availableRoles}
              />
            </div>
          )}

          {step.assignment_type === 'user' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Пользователь
              </label>
              <UserSelect
                value={step.assigned_users[0]}
                onChange={(value) => onUpdate('assigned_users', [value])}
              />
            </div>
          )}

          {step.assignment_type === 'users' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Пользователи
              </label>
              <UserSelect
                multiple
                value={step.assigned_users}
                onChange={(value) => onUpdate('assigned_users', value)}
              />
            </div>
          )}

          {step.assignment_type === 'smart' && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Умное назначение</h4>
              <p className="text-sm text-blue-700 mb-3">
                Система автоматически выберет наилучшего исполнителя на основе:
              </p>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">Загруженность исполнителя</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">Компетенции и навыки</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">Историческая производительность</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">Географическое расположение</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Временные настройки */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Временные настройки</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Время выполнения (часы)
              </label>
              <Input
                type="number"
                value={step.max_execution_time}
                onChange={(e) => onUpdate('max_execution_time', parseInt(e.target.value))}
                min="1"
                max="8760"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Предупреждение за (часы)
              </label>
              <Input
                type="number"
                value={step.warning_time}
                onChange={(e) => onUpdate('warning_time', parseInt(e.target.value))}
                min="1"
                max="8760"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Автоэскалация через (часы)
              </label>
              <Input
                type="number"
                value={step.auto_escalate_time}
                onChange={(e) => onUpdate('auto_escalate_time', parseInt(e.target.value))}
                min="1"
                max="8760"
              />
            </div>
          </div>
        </div>

        {/* Возможности этапа */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Возможности этапа</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={step.is_parallel}
                onChange={(e) => onUpdate('is_parallel', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Параллельное выполнение</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={step.is_required}
                onChange={(e) => onUpdate('is_required', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Обязательный этап</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={step.can_reject}
                onChange={(e) => onUpdate('can_reject', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Может отклонить</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={step.can_edit}
                onChange={(e) => onUpdate('can_edit', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Может редактировать</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={step.can_reassign}
                onChange={(e) => onUpdate('can_reassign', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Может переназначить</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={step.can_delegate}
                onChange={(e) => onUpdate('can_delegate', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Может делегировать</span>
            </label>
          </div>
        </div>

        {/* Условная логика */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Условная логика</h3>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Условия выполнения этапа</h4>
            <p className="text-sm text-gray-600 mb-3">
              Этап будет выполнен только при соблюдении указанных условий
            </p>
            <Button variant="outline" className="text-sm">
              Добавить условие
            </Button>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Условия пропуска этапа</h4>
            <p className="text-sm text-gray-600 mb-3">
              Этап будет пропущен при соблюдении указанных условий
            </p>
            <Button variant="outline" className="text-sm">
              Добавить условие пропуска
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Компонент редактора правил
const RuleEditor = ({ rule, onUpdate }) => {
  const ruleTypes = [
    { value: 'condition', label: 'Условное правило' },
    { value: 'priority', label: 'Правило приоритета' },
    { value: 'escalation', label: 'Правило эскалации' },
    { value: 'notification', label: 'Правило уведомления' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Настройка правила: {rule.rule_name || 'Новое правило'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название правила *
            </label>
            <Input
              value={rule.rule_name}
              onChange={(e) => onUpdate('rule_name', e.target.value)}
              placeholder="Введите название правила"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип правила
            </label>
            <Select
              value={rule.rule_type}
              onChange={(value) => onUpdate('rule_type', value)}
              options={ruleTypes}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Приоритет
            </label>
            <Input
              type="number"
              value={rule.priority}
              onChange={(e) => onUpdate('priority', parseInt(e.target.value))}
              min="0"
              max="100"
            />
          </div>
          
          <div className="flex items-center pt-6">
            <input
              type="checkbox"
              id={`rule-active-${rule.id}`}
              checked={rule.is_active}
              onChange={(e) => onUpdate('is_active', e.target.checked)}
              className="mr-2"
            />
            <label htmlFor={`rule-active-${rule.id}`} className="text-sm">
              Правило активно
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Условие срабатывания</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">
              Настройте условия, при которых будет срабатывать это правило
            </p>
            <Button variant="outline" className="text-sm">
              Настроить условие
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Действие</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">
              Настройте действие, которое будет выполнено при срабатывании правила
            </p>
            <Button variant="outline" className="text-sm">
              Настроить действие
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Компонент визуального редактора
const VisualWorkflowEditor = ({ steps, onStepsChange, routingRules, onRulesChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Визуальный редактор процесса</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-8 bg-gray-50 rounded-lg min-h-96 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Визуальный редактор</h3>
            <p className="text-gray-600 mb-4">
              Создавайте процессы с помощью drag-and-drop интерфейса
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Открыть редактор
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowBuilder; 