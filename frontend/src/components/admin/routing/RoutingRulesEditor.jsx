import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../../common/Card';
import Button from '../../common/Button';
import Input from '../../common/Input';
import Select from '../../common/Select';

const RoutingRulesEditor = ({ routingRules, setRoutingRules }) => {
  const [selectedRule, setSelectedRule] = useState(null);

  const addRule = () => {
    const newRule = {
      id: Date.now(),
      rule_name: 'Новое правило',
      rule_type: 'condition',
      condition: {
        field: '',
        operator: 'equals',
        value: ''
      },
      action: {
        type: 'assign',
        target: ''
      },
      is_active: true,
      priority: routingRules.length
    };
    
    setRoutingRules([...routingRules, newRule]);
    setSelectedRule(newRule.id);
  };

  const updateRule = (ruleId, field, value) => {
    setRoutingRules(routingRules.map(rule => 
      rule.id === ruleId ? { ...rule, [field]: value } : rule
    ));
  };

  const removeRule = (ruleId) => {
    setRoutingRules(routingRules.filter(rule => rule.id !== ruleId));
    if (selectedRule === ruleId) {
      setSelectedRule(null);
    }
  };

  const ruleTypes = [
    { value: 'condition', label: 'Условное правило' },
    { value: 'priority', label: 'Правило приоритета' },
    { value: 'escalation', label: 'Правило эскалации' },
    { value: 'notification', label: 'Правило уведомления' }
  ];

  const conditionFields = [
    { value: 'category', label: 'Категория заявки' },
    { value: 'priority', label: 'Приоритет' },
    { value: 'amount', label: 'Сумма' },
    { value: 'department', label: 'Подразделение заявителя' },
    { value: 'user_role', label: 'Роль заявителя' },
    { value: 'time_submitted', label: 'Время подачи' },
    { value: 'custom_field', label: 'Пользовательское поле' }
  ];

  const operators = [
    { value: 'equals', label: 'Равно' },
    { value: 'not_equals', label: 'Не равно' },
    { value: 'greater_than', label: 'Больше' },
    { value: 'less_than', label: 'Меньше' },
    { value: 'contains', label: 'Содержит' },
    { value: 'in_list', label: 'В списке' },
    { value: 'between', label: 'Между' }
  ];

  const actionTypes = [
    { value: 'assign', label: 'Назначить исполнителя' },
    { value: 'skip_step', label: 'Пропустить этап' },
    { value: 'add_step', label: 'Добавить этап' },
    { value: 'change_priority', label: 'Изменить приоритет' },
    { value: 'send_notification', label: 'Отправить уведомление' },
    { value: 'set_deadline', label: 'Установить дедлайн' }
  ];

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопка добавления */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Правила маршрутизации</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Настройте автоматические правила для обработки заявок
              </p>
            </div>
            <Button onClick={addRule} className="bg-green-600 hover:bg-green-700">
              + Добавить правило
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Список правил */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая панель - список правил */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Список правил ({routingRules.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {routingRules.map((rule, index) => (
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
                      <div className="font-medium text-sm mb-1">
                        {index + 1}. {rule.rule_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ruleTypes.find(t => t.value === rule.rule_type)?.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Приоритет: {rule.priority}
                      </div>
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
                          removeRule(rule.id);
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
                  <p>Нет созданных правил</p>
                  <Button 
                    onClick={addRule} 
                    className="mt-3 bg-green-600 hover:bg-green-700"
                  >
                    Создать первое правило
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Правая панель - редактор правила */}
        <div className="lg:col-span-2">
          {selectedRule ? (
            <RuleDetailEditor
              rule={routingRules.find(r => r.id === selectedRule)}
              onUpdate={(field, value) => updateRule(selectedRule, field, value)}
              ruleTypes={ruleTypes}
              conditionFields={conditionFields}
              operators={operators}
              actionTypes={actionTypes}
            />
          ) : (
                          <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <h3 className="text-lg font-medium mb-2">Выберите правило</h3>
                  <p>Выберите правило из списка слева для редактирования</p>
                </CardContent>
              </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// Компонент детального редактора правила
const RuleDetailEditor = ({ rule, onUpdate, ruleTypes, conditionFields, operators, actionTypes }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Настройка правила</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Основные настройки */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Основные настройки</h3>
          
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
                Приоритет (0-100)
              </label>
              <Input
                type="number"
                value={rule.priority}
                onChange={(e) => onUpdate('priority', parseInt(e.target.value))}
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Правила с большим приоритетом выполняются первыми
              </p>
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

        {/* Настройка условий */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Условия срабатывания</h3>
          
          <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Поле
                </label>
                <Select
                  value={rule.condition?.field || ''}
                  onChange={(value) => onUpdate('condition', { ...rule.condition, field: value })}
                  options={conditionFields}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Оператор
                </label>
                <Select
                  value={rule.condition?.operator || 'equals'}
                  onChange={(value) => onUpdate('condition', { ...rule.condition, operator: value })}
                  options={operators}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Значение
                </label>
                <Input
                  value={rule.condition?.value || ''}
                  onChange={(e) => onUpdate('condition', { ...rule.condition, value: e.target.value })}
                  placeholder="Введите значение"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <Button variant="outline" className="text-sm">
                + Добавить условие
              </Button>
              <span className="text-xs text-gray-500">
                Логика: И (все условия должны быть выполнены)
              </span>
            </div>
          </div>
        </div>

        {/* Настройка действий */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Действия</h3>
          
          <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип действия
                </label>
                <Select
                  value={rule.action?.type || ''}
                  onChange={(value) => onUpdate('action', { ...rule.action, type: value })}
                  options={actionTypes}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Цель действия
                </label>
                <Input
                  value={rule.action?.target || ''}
                  onChange={(e) => onUpdate('action', { ...rule.action, target: e.target.value })}
                  placeholder="Параметры действия"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <Button variant="outline" className="text-sm">
                + Добавить действие
              </Button>
            </div>
          </div>
        </div>

        {/* Примеры правил */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Примеры правил</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Высокий приоритет для больших сумм</h4>
              <p className="text-sm text-blue-700">
                ЕСЛИ сумма > 100000 ТО приоритет = "высокий"
              </p>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Автоматическое одобрение</h4>
              <p className="text-sm text-green-700">
                ЕСЛИ сумма &lt; 5000 И заявитель = "сотрудник" ТО одобрить автоматически
              </p>
            </div>
            
            <div className="p-3 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Эскалация по времени</h4>
              <p className="text-sm text-yellow-700">
                ЕСЛИ время в работе > 24 часа ТО эскалировать руководителю
              </p>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">Уведомления по категории</h4>
              <p className="text-sm text-purple-700">
                ЕСЛИ категория = "IT" ТО уведомить IT-отдел
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoutingRulesEditor; 