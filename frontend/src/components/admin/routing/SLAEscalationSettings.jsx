import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../../common/Card';
import Button from '../../common/Button';
import Input from '../../common/Input';
import Select from '../../common/Select';
import TextArea from '../../common/TextArea';

const SLAEscalationSettings = ({ slaHours, setSlaHours, escalationRules, setEscalationRules }) => {
  const [selectedRule, setSelectedRule] = useState(null);

  const addEscalationRule = () => {
    const newRule = {
      id: Date.now(),
      name: 'Новое правило эскалации',
      trigger_type: 'time',
      trigger_conditions: {
        hours_elapsed: 24,
        step_type: 'any'
      },
      escalate_to: {
        type: 'role',
        target: 'admin'
      },
      actions: ['notify', 'reassign'],
      notification: {
        email: true,
        sms: false,
        telegram: false,
        template: 'escalation_default'
      },
      is_active: true
    };
    
    setEscalationRules([...escalationRules, newRule]);
    setSelectedRule(newRule.id);
  };

  const updateEscalationRule = (ruleId, field, value) => {
    setEscalationRules(escalationRules.map(rule => 
      rule.id === ruleId ? { ...rule, [field]: value } : rule
    ));
  };

  const removeEscalationRule = (ruleId) => {
    setEscalationRules(escalationRules.filter(rule => rule.id !== ruleId));
    if (selectedRule === ruleId) {
      setSelectedRule(null);
    }
  };

  const triggerTypes = [
    { value: 'time', label: 'По времени' },
    { value: 'condition', label: 'По условию' },
    { value: 'manual', label: 'Ручная эскалация' },
    { value: 'sla_breach', label: 'Нарушение SLA' }
  ];

  const escalateToTypes = [
    { value: 'user', label: 'Конкретный пользователь' },
    { value: 'role', label: 'Роль' },
    { value: 'department', label: 'Подразделение' },
    { value: 'position', label: 'Должность' },
    { value: 'manager', label: 'Руководитель заявителя' }
  ];

  const stepTypes = [
    { value: 'any', label: 'Любой этап' },
    { value: 'approval', label: 'Этапы согласования' },
    { value: 'review', label: 'Этапы рассмотрения' },
    { value: 'action', label: 'Этапы действий' }
  ];

  return (
    <div className="space-y-6">
      {/* Общие настройки SLA */}
      <Card>
        <CardHeader>
          <CardTitle>Настройки SLA (Service Level Agreement)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Общий SLA (часы)
              </label>
              <Input
                type="number"
                value={slaHours}
                onChange={(e) => setSlaHours(parseInt(e.target.value))}
                min="1"
                max="8760"
              />
              <p className="text-xs text-gray-500 mt-1">
                Максимальное время обработки заявки
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SLA в рабочих днях
              </label>
              <div className="text-lg font-medium text-blue-600">
                {Math.ceil(slaHours / 8)} дней
              </div>
              <p className="text-xs text-gray-500 mt-1">
                При 8-часовом рабочем дне
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Предупреждение за
              </label>
              <Input
                type="number"
                value={Math.floor(slaHours * 0.8)}
                readOnly
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                80% от общего SLA
              </p>
            </div>
          </div>

          {/* SLA по категориям */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">SLA по категориям заявок</h3>
            
            <div className="space-y-3">
              {[
                { category: 'urgent', label: 'Срочные', hours: 4, color: 'red' },
                { category: 'high', label: 'Высокий приоритет', hours: 12, color: 'orange' },
                { category: 'normal', label: 'Обычные', hours: slaHours, color: 'blue' },
                { category: 'low', label: 'Низкий приоритет', hours: slaHours * 2, color: 'gray' }
              ].map((item) => (
                <div key={item.category} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full bg-${item.color}-500`}></div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={item.hours}
                      className="w-20"
                      min="1"
                      max="8760"
                    />
                    <span className="text-sm text-gray-500">часов</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Правила эскалации */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Список правил эскалации */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Правила эскалации</CardTitle>
              <Button onClick={addEscalationRule} className="bg-red-600 hover:bg-red-700">
                + Добавить
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {escalationRules.map((rule, index) => (
                <div
                  key={rule.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRule === rule.id
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedRule(rule.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1">
                        {index + 1}. {rule.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {triggerTypes.find(t => t.value === rule.trigger_type)?.label}
                      </div>
                      {rule.trigger_type === 'time' && (
                        <div className="text-xs text-gray-400 mt-1">
                          Через {rule.trigger_conditions?.hours_elapsed || 24} часов
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-1">
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
                          removeEscalationRule(rule.id);
                        }}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {escalationRules.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Нет правил эскалации</p>
                  <Button 
                    onClick={addEscalationRule} 
                    className="mt-3 bg-red-600 hover:bg-red-700"
                  >
                    Создать правило
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Редактор правила эскалации */}
        <div className="lg:col-span-2">
          {selectedRule ? (
            <EscalationRuleEditor
              rule={escalationRules.find(r => r.id === selectedRule)}
              onUpdate={(field, value) => updateEscalationRule(selectedRule, field, value)}
              triggerTypes={triggerTypes}
              escalateToTypes={escalateToTypes}
              stepTypes={stepTypes}
            />
          ) : (
                          <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <h3 className="text-lg font-medium mb-2">Выберите правило эскалации</h3>
                  <p>Выберите правило из списка слева для редактирования</p>
                </CardContent>
              </Card>
          )}
        </div>
      </div>

      {/* Мониторинг SLA */}
      <Card>
        <CardHeader>
          <CardTitle>Мониторинг выполнения SLA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">95%</div>
              <div className="text-sm text-green-700">В рамках SLA</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">3%</div>
              <div className="text-sm text-yellow-700">Близко к нарушению</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">2%</div>
              <div className="text-sm text-red-700">Нарушение SLA</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">18ч</div>
              <div className="text-sm text-blue-700">Среднее время</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Компонент редактора правила эскалации
const EscalationRuleEditor = ({ rule, onUpdate, triggerTypes, escalateToTypes, stepTypes }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Настройка правила эскалации</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Основные настройки */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Основные настройки</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название правила *
            </label>
            <Input
              value={rule.name}
              onChange={(e) => onUpdate('name', e.target.value)}
              placeholder="Введите название правила эскалации"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип триггера
              </label>
              <Select
                value={rule.trigger_type}
                onChange={(value) => onUpdate('trigger_type', value)}
                options={triggerTypes}
              />
            </div>
            
            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                checked={rule.is_active}
                onChange={(e) => onUpdate('is_active', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Правило активно</span>
            </div>
          </div>
        </div>

        {/* Условия срабатывания */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Условия срабатывания</h3>
          
          {rule.trigger_type === 'time' && (
            <div className="p-4 border rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Время в работе (часы)
                  </label>
                  <Input
                    type="number"
                    value={rule.trigger_conditions?.hours_elapsed || 24}
                    onChange={(e) => onUpdate('trigger_conditions', {
                      ...rule.trigger_conditions,
                      hours_elapsed: parseInt(e.target.value)
                    })}
                    min="1"
                    max="8760"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип этапа
                  </label>
                  <Select
                    value={rule.trigger_conditions?.step_type || 'any'}
                    onChange={(value) => onUpdate('trigger_conditions', {
                      ...rule.trigger_conditions,
                      step_type: value
                    })}
                    options={stepTypes}
                  />
                </div>
              </div>
            </div>
          )}

          {rule.trigger_type === 'sla_breach' && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">Срабатывать при нарушении общего SLA</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm">Срабатывать при нарушении SLA этапа</span>
              </div>
            </div>
          )}
        </div>

        {/* Настройки эскалации */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Настройки эскалации</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Эскалировать к
              </label>
              <Select
                value={rule.escalate_to?.type || 'role'}
                onChange={(value) => onUpdate('escalate_to', {
                  ...rule.escalate_to,
                  type: value
                })}
                options={escalateToTypes}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цель эскалации
              </label>
              <Input
                value={rule.escalate_to?.target || ''}
                onChange={(e) => onUpdate('escalate_to', {
                  ...rule.escalate_to,
                  target: e.target.value
                })}
                placeholder="Укажите пользователя/роль"
              />
            </div>
          </div>
        </div>

        {/* Действия при эскалации */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Действия при эскалации</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rule.actions?.includes('notify')}
                onChange={(e) => {
                  const actions = rule.actions || [];
                  if (e.target.checked) {
                    onUpdate('actions', [...actions, 'notify']);
                  } else {
                    onUpdate('actions', actions.filter(a => a !== 'notify'));
                  }
                }}
                className="mr-2"
              />
              <span className="text-sm">Уведомить</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rule.actions?.includes('reassign')}
                onChange={(e) => {
                  const actions = rule.actions || [];
                  if (e.target.checked) {
                    onUpdate('actions', [...actions, 'reassign']);
                  } else {
                    onUpdate('actions', actions.filter(a => a !== 'reassign'));
                  }
                }}
                className="mr-2"
              />
              <span className="text-sm">Переназначить</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rule.actions?.includes('priority_up')}
                onChange={(e) => {
                  const actions = rule.actions || [];
                  if (e.target.checked) {
                    onUpdate('actions', [...actions, 'priority_up']);
                  } else {
                    onUpdate('actions', actions.filter(a => a !== 'priority_up'));
                  }
                }}
                className="mr-2"
              />
              <span className="text-sm">Повысить приоритет</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rule.actions?.includes('add_step')}
                onChange={(e) => {
                  const actions = rule.actions || [];
                  if (e.target.checked) {
                    onUpdate('actions', [...actions, 'add_step']);
                  } else {
                    onUpdate('actions', actions.filter(a => a !== 'add_step'));
                  }
                }}
                className="mr-2"
              />
              <span className="text-sm">Добавить этап</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rule.actions?.includes('auto_approve')}
                onChange={(e) => {
                  const actions = rule.actions || [];
                  if (e.target.checked) {
                    onUpdate('actions', [...actions, 'auto_approve']);
                  } else {
                    onUpdate('actions', actions.filter(a => a !== 'auto_approve'));
                  }
                }}
                className="mr-2"
              />
              <span className="text-sm">Автоодобрение</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rule.actions?.includes('log_incident')}
                onChange={(e) => {
                  const actions = rule.actions || [];
                  if (e.target.checked) {
                    onUpdate('actions', [...actions, 'log_incident']);
                  } else {
                    onUpdate('actions', actions.filter(a => a !== 'log_incident'));
                  }
                }}
                className="mr-2"
              />
              <span className="text-sm">Зафиксировать инцидент</span>
            </label>
          </div>
        </div>

        {/* Настройки уведомлений */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Настройки уведомлений</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rule.notification?.email}
                onChange={(e) => onUpdate('notification', {
                  ...rule.notification,
                  email: e.target.checked
                })}
                className="mr-2"
              />
              <span className="text-sm">Email</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rule.notification?.sms}
                onChange={(e) => onUpdate('notification', {
                  ...rule.notification,
                  sms: e.target.checked
                })}
                className="mr-2"
              />
              <span className="text-sm">SMS</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rule.notification?.telegram}
                onChange={(e) => onUpdate('notification', {
                  ...rule.notification,
                  telegram: e.target.checked
                })}
                className="mr-2"
              />
              <span className="text-sm">Telegram</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rule.notification?.push}
                onChange={(e) => onUpdate('notification', {
                  ...rule.notification,
                  push: e.target.checked
                })}
                className="mr-2"
              />
              <span className="text-sm">Push</span>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SLAEscalationSettings; 