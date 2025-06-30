import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../../common/Card';
import Button from '../../common/Button';
import Input from '../../common/Input';
import TextArea from '../../common/TextArea';
import Select from '../../common/Select';
import {
  CheckCircleIcon,
  EyeIcon,
  BoltIcon,
  EnvelopeIcon,
  UserIcon,
  UsersIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  ClockIcon,
  CogIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const StepEditor = ({ step, onUpdate, onRemove }) => {
  const stepTypes = [
    { value: 'approval', label: 'Согласование', icon: CheckCircleIcon },
    { value: 'review', label: 'Рассмотрение', icon: EyeIcon },
    { value: 'action', label: 'Действие', icon: BoltIcon },
    { value: 'notification', label: 'Уведомление', icon: EnvelopeIcon }
  ];

  const assignmentTypes = [
    { value: 'role', label: 'По роли' },
    { value: 'user', label: 'Конкретный пользователь' },
    { value: 'department', label: 'Подразделение' },
    { value: 'smart', label: 'Умное назначение' }
  ];

  const availableRoles = [
    { value: 'admin', label: 'Администратор' },
    { value: 'employee', label: 'Сотрудник' },
    { value: 'teacher', label: 'Преподаватель' },
    { value: 'student', label: 'Студент' }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Этап: {step.step_name || 'Новый этап'}</CardTitle>
          <Button onClick={onRemove} variant="outline" className="text-red-600">
            Удалить
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Основные настройки */}
        <div className="space-y-4">
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

                 {/* Назначение исполнителей */}
         <div className="space-y-4">
           <h3 className="flex items-center text-lg font-medium text-gray-900">
             <UserIcon className="h-5 w-5 mr-2" />
             Назначение исполнителей
           </h3>
          
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
                Роли исполнителей
              </label>
              <Select
                multiple
                value={step.assigned_roles}
                onChange={(value) => onUpdate('assigned_roles', value)}
                options={availableRoles}
              />
            </div>
          )}

          {step.assignment_type === 'smart' && (
                         <div className="p-4 bg-blue-50 rounded-lg">
               <h4 className="flex items-center font-medium text-blue-900 mb-2">
                 <SparklesIcon className="h-4 w-4 mr-2" />
                 Умное назначение
               </h4>
              <p className="text-sm text-blue-700 mb-3">
                Система автоматически выберет исполнителя на основе:
              </p>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span className="text-sm">Текущая загруженность</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span className="text-sm">Компетенции и опыт</span>
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
           <h3 className="flex items-center text-lg font-medium text-gray-900">
             <ClockIcon className="h-5 w-5 mr-2" />
             Временные настройки
           </h3>
          
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
           <h3 className="flex items-center text-lg font-medium text-gray-900">
             <CogIcon className="h-5 w-5 mr-2" />
             Возможности этапа
           </h3>
          
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
           <h3 className="flex items-center text-lg font-medium text-gray-900">
             <BoltIcon className="h-5 w-5 mr-2" />
             Условная логика
           </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Условия выполнения</h4>
              <p className="text-sm text-gray-600 mb-3">
                Этап будет выполнен только при соблюдении условий
              </p>
              <Button variant="outline" className="text-sm">
                + Добавить условие
              </Button>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Условия пропуска</h4>
              <p className="text-sm text-gray-600 mb-3">
                Этап будет пропущен при соблюдении условий
              </p>
              <Button variant="outline" className="text-sm">
                + Добавить условие
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StepEditor; 