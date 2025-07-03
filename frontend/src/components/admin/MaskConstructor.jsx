import React, { useState, useEffect } from 'react';
import { 
  PhoneIcon, 
  DocumentTextIcon, 
  CreditCardIcon,
  AcademicCapIcon,
  CalendarIcon,
  MapPinIcon,
  GlobeAltIcon,
  WrenchScrewdriverIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import InputMask from 'react-input-mask';
import { 
  MASK_TEMPLATES, 
  MASK_CATEGORIES, 
  getMaskTemplate, 
  getMasksByCategory,
  validateMaskValue,
  createRegexFromMask,
  generatePlaceholderFromMask
} from '../../utils/maskTemplates';

const MaskConstructor = ({ value, onChange, className = '' }) => {
  const [selectedCategory, setSelectedCategory] = useState('phone');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customPattern, setCustomPattern] = useState('');
  const [testValue, setTestValue] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Инициализация из переданного значения
  useEffect(() => {
    if (value && value.mask_enabled) {
      const template = getMaskTemplate(value.mask_type);
      if (template) {
        setSelectedTemplate(template);
        setSelectedCategory(template.category);
      } else if (value.mask_type === 'custom') {
        setSelectedTemplate(MASK_TEMPLATES.custom);
        setCustomPattern(value.mask_pattern || '');
        setSelectedCategory('custom');
      }
    }
  }, [value]);

  // Иконки для категорий
  const getCategoryIcon = (iconName) => {
    const icons = {
      PhoneIcon,
      DocumentTextIcon, 
      CreditCardIcon,
      AcademicCapIcon,
      CalendarIcon,
      MapPinIcon,
      GlobeAltIcon,
      WrenchScrewdriverIcon
    };
    const IconComponent = icons[iconName];
    return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
  };

  // Применение выбранного шаблона
  const applyTemplate = (template) => {
    setSelectedTemplate(template);
    setTestValue('');
    
    let maskData;
    if (template.id === 'custom') {
      maskData = {
        mask_enabled: true,
        mask_type: 'custom',
        mask_pattern: customPattern,
        mask_placeholder: generatePlaceholderFromMask(customPattern),
        mask_validation_regex: customPattern ? createRegexFromMask(customPattern) : '',
        mask_validation_message: 'Введите значение в правильном формате',
        mask_guide: false,
        mask_keep_char_positions: false
      };
    } else {
      maskData = {
        mask_enabled: true,
        mask_type: template.id,
        mask_pattern: template.pattern,
        mask_placeholder: template.placeholder,
        mask_validation_regex: template.regex,
        mask_validation_message: `Введите ${template.name.toLowerCase()} в формате: ${template.example}`,
        mask_guide: false,
        mask_keep_char_positions: false
      };
    }
    
    onChange(maskData);
  };

  // Отключение маски
  const disableMask = () => {
    setSelectedTemplate(null);
    setTestValue('');
    onChange({
      mask_enabled: false,
      mask_type: null,
      mask_pattern: null,
      mask_placeholder: null,
      mask_validation_regex: null,
      mask_validation_message: null,
      mask_guide: true,
      mask_keep_char_positions: false
    });
  };

  // Обновление пользовательского паттерна
  const updateCustomPattern = (pattern) => {
    setCustomPattern(pattern);
    if (selectedTemplate?.id === 'custom') {
      // Создаем объект пользовательской маски с правильными данными
      const customMaskData = {
        mask_enabled: true,
        mask_type: 'custom',
        mask_pattern: pattern,
        mask_placeholder: generatePlaceholderFromMask(pattern),
        mask_validation_regex: pattern ? createRegexFromMask(pattern) : '',
        mask_validation_message: 'Введите значение в правильном формате',
        mask_guide: false,
        mask_keep_char_positions: false
      };
      onChange(customMaskData);
    }
  };

  return (
    <div className={`bg-white border border-gray-300 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Настройка маски ввода</h3>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <EyeIcon className="w-4 h-4 mr-1" />
            Предпросмотр
          </button>
          {value?.mask_enabled && (
            <button
              type="button"
              onClick={disableMask}
              className="text-sm text-red-600 hover:text-red-800 flex items-center"
            >
              <XMarkIcon className="w-4 h-4 mr-1" />
              Отключить маску
            </button>
          )}
        </div>
      </div>

      {/* Включение/отключение маски */}
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={value?.mask_enabled || false}
            onChange={(e) => {
              if (e.target.checked) {
                if (selectedTemplate) {
                  applyTemplate(selectedTemplate);
                } else {
                  // Выбираем шаблон по умолчанию (первый в категории "phone")
                  const defaultTemplate = MASK_TEMPLATES.phone_ru;
                  setSelectedTemplate(defaultTemplate);
                  setSelectedCategory('phone');
                  applyTemplate(defaultTemplate);
                }
              } else {
                disableMask();
              }
            }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">
            Использовать маску ввода
          </span>
        </label>
      </div>

      {value?.mask_enabled && (
        <>
          {/* Выбор категории */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Категория маски
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(MASK_CATEGORIES).map(([categoryId, category]) => (
                <button
                  key={categoryId}
                  type="button"
                  onClick={() => setSelectedCategory(categoryId)}
                  className={`p-3 text-sm rounded-lg border-2 transition-colors flex flex-col items-center space-y-1 ${
                    selectedCategory === categoryId
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {getCategoryIcon(category.icon)}
                  <span className="text-xs">{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Выбор шаблона */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Шаблон маски
            </label>
            <div className="space-y-2">
              {getMasksByCategory(selectedCategory).map((template) => (
                <div
                  key={template.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => applyTemplate(template)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Паттерн: <code>{template.pattern || 'Пользовательский'}</code>
                      </div>
                      {template.example && (
                        <div className="text-xs text-gray-500">
                          Пример: {template.example}
                        </div>
                      )}
                    </div>
                    {selectedTemplate?.id === template.id && (
                      <CheckIcon className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Пользовательский паттерн */}
          {selectedCategory === 'custom' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Пользовательский паттерн
              </label>
              <input
                type="text"
                value={customPattern}
                onChange={(e) => updateCustomPattern(e.target.value)}
                placeholder="9 - цифра, A - буква, S - буква/цифра"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-1 text-xs text-gray-500">
                <strong>Символы маски:</strong> 9 = цифра, A = буква, S = буква или цифра, остальное - разделители
              </div>
            </div>
          )}

          {/* Предпросмотр */}
          {showPreview && selectedTemplate && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Предпросмотр маски
              </label>
              <div className="space-y-2">
                <InputMask
                  mask={value.mask_pattern || ''}
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  placeholder={value.mask_placeholder || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maskChar={value?.mask_guide ? '_' : null}
                  alwaysShowMask={false}
                  formatChars={{
                    '9': '[0-9]',
                    'A': '[A-Za-zА-Яа-я]',
                    'a': '[a-zа-я]', 
                    'S': '[A-Za-zА-Яа-я0-9]',
                    'Я': '[А-Яа-я]',
                    'я': '[а-я]',
                    '*': '.'
                  }}
                  beforeMaskedStateChange={({ nextState }) => {
                    // Разрешаем полное очищение поля
                    return { ...nextState };
                  }}
                />
                <div className="text-xs text-gray-500">
                  Попробуйте ввести значение для проверки маски
                </div>
                {testValue && value.mask_validation_regex && (
                  <div className={`text-xs ${
                    validateMaskValue(testValue, {regex: value.mask_validation_regex}).is_valid
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {validateMaskValue(testValue, {regex: value.mask_validation_regex}).is_valid
                      ? '✓ Значение соответствует маске'
                      : '✗ Значение не соответствует маске'
                    }
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Дополнительные настройки */}
          <div className="space-y-3">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={value?.mask_guide || false}
                  onChange={(e) => onChange({...value, mask_guide: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Показывать направляющие символы при вводе
                </span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={value?.mask_keep_char_positions || false}
                  onChange={(e) => onChange({...value, mask_keep_char_positions: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Сохранять позиции символов при удалении
                </span>
              </label>
            </div>
          </div>

          {/* Сводка */}
          {selectedTemplate && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-1">Настройки маски:</div>
              <div className="text-xs text-blue-700 space-y-1">
                <div><strong>Тип:</strong> {selectedTemplate.name}</div>
                <div><strong>Паттерн:</strong> <code>{value.mask_pattern}</code></div>
                <div><strong>Плейсхолдер:</strong> <code>{value.mask_placeholder}</code></div>
                {selectedTemplate.example && (
                  <div><strong>Пример:</strong> {selectedTemplate.example}</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MaskConstructor; 