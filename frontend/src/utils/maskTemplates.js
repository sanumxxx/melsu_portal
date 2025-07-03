// Шаблоны масок для различных типов полей
export const MASK_TEMPLATES = {
  // Телефоны
  phone_ru: {
    id: 'phone_ru',
    name: 'Телефон России',
    pattern: '+7 (999) 999-99-99',
    placeholder: '+7 (___) ___-__-__',
    regex: '^\\+7 \\(\\d{3}\\) \\d{3}-\\d{2}-\\d{2}$',
    example: '+7 (123) 456-78-90',
    category: 'phone'
  },
  phone_ua: {
    id: 'phone_ua',
    name: 'Телефон Украины',
    pattern: '+38 (999) 999-99-99',
    placeholder: '+38 (___) ___-__-__',
    regex: '^\\+38 \\(\\d{3}\\) \\d{3}-\\d{2}-\\d{2}$',
    example: '+38 (123) 456-78-90',
    category: 'phone'
  },
  phone_short: {
    id: 'phone_short',
    name: 'Телефон короткий',
    pattern: '8 999 999-99-99',
    placeholder: '8 ___ ___-__-__',
    regex: '^8 \\d{3} \\d{3}-\\d{2}-\\d{2}$',
    example: '8 123 456-78-90',
    category: 'phone'
  },

  // Документы РФ
  passport_rf: {
    id: 'passport_rf',
    name: 'Паспорт РФ',
    pattern: '99 99 999999',
    placeholder: '__ __ ______',
    regex: '^\\d{2} \\d{2} \\d{6}$',
    example: '12 34 567890',
    category: 'document'
  },
  snils: {
    id: 'snils',
    name: 'СНИЛС',
    pattern: '999-999-999 99',
    placeholder: '___-___-___ __',
    regex: '^\\d{3}-\\d{3}-\\d{3} \\d{2}$',
    example: '123-456-789 01',
    category: 'document'
  },
  inn_personal: {
    id: 'inn_personal',
    name: 'ИНН физ. лица',
    pattern: '999999999999',
    placeholder: '____________',
    regex: '^\\d{12}$',
    example: '123456789012',
    category: 'document'
  },
  inn_org: {
    id: 'inn_org',
    name: 'ИНН организации',
    pattern: '9999999999',
    placeholder: '__________',
    regex: '^\\d{10}$',
    example: '1234567890',
    category: 'document'
  },

  // Банковские данные
  card_number: {
    id: 'card_number',
    name: 'Номер банковской карты',
    pattern: '9999 9999 9999 9999',
    placeholder: '____ ____ ____ ____',
    regex: '^\\d{4} \\d{4} \\d{4} \\d{4}$',
    example: '1234 5678 9012 3456',
    category: 'bank'
  },
  account_number: {
    id: 'account_number',
    name: 'Расчетный счет',
    pattern: '99999999999999999999',
    placeholder: '____________________',
    regex: '^\\d{20}$',
    example: '12345678901234567890',
    category: 'bank'
  },
  bik: {
    id: 'bik',
    name: 'БИК',
    pattern: '999999999',
    placeholder: '_________',
    regex: '^\\d{9}$',
    example: '123456789',
    category: 'bank'
  },

  // Образовательные коды
  specialty_code: {
    id: 'specialty_code',
    name: 'Код специальности',
    pattern: '99.99.99',
    placeholder: '__.__.__ ',
    regex: '^\\d{2}\\.\\d{2}\\.\\d{2}$',
    example: '01.03.02',
    category: 'education'
  },
  group_code: {
    id: 'group_code',
    name: 'Код группы',
    pattern: 'AAA-999',
    placeholder: '___-___',
    regex: '^[A-Za-zА-Яа-я]{3}-\\d{3}$',
    example: 'ИНФ-123',
    category: 'education'
  },
  student_id: {
    id: 'student_id',
    name: 'Студенческий билет',
    pattern: '9999999999',
    placeholder: '__________',
    regex: '^\\d{10}$',
    example: '1234567890',
    category: 'education'
  },

  // Даты и время
  date_ru: {
    id: 'date_ru',
    name: 'Дата (ДД.ММ.ГГГГ)',
    pattern: '99.99.9999',
    placeholder: '__.__.____',
    regex: '^\\d{2}\\.\\d{2}\\.\\d{4}$',
    example: '01.01.2025',
    category: 'date'
  },
  time_24: {
    id: 'time_24',
    name: 'Время (ЧЧ:ММ)',
    pattern: '99:99',
    placeholder: '__:__',
    regex: '^([01]\\d|2[0-3]):[0-5]\\d$',
    example: '14:30',
    category: 'date'
  },

  // Почтовые индексы и адреса
  postal_code_ru: {
    id: 'postal_code_ru',
    name: 'Почтовый индекс России',
    pattern: '999999',
    placeholder: '______',
    regex: '^\\d{6}$',
    example: '123456',
    category: 'address'
  },

  // IP адреса
  ip_address: {
    id: 'ip_address',
    name: 'IP адрес',
    pattern: '999.999.999.999',
    placeholder: '___.___.___.___',
    regex: '^((25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)\\.?\\b){4}$',
    example: '192.168.1.1',
    category: 'network'
  },

  // Коды и идентификаторы с буквами
  license_plate_ru: {
    id: 'license_plate_ru',
    name: 'Номер автомобиля РФ',
    pattern: 'A999AA 999',
    placeholder: '_999__ 999',
    regex: '^[АВЕКМНОРСТУХ]\\d{3}[АВЕКМНОРСТУХ]{2}\\s\\d{2,3}$',
    example: 'А123ВС 199',
    category: 'document'
  },

  code_mixed: {
    id: 'code_mixed',
    name: 'Код (буквы и цифры)',
    pattern: 'SSS-999',
    placeholder: '___-___',
    regex: '^[A-Za-zА-Яа-я0-9]{3}-\\d{3}$',
    example: 'ABC-123',
    category: 'education'
  },

  name_initials: {
    id: 'name_initials',
    name: 'Инициалы',
    pattern: 'A.A.',
    placeholder: '_._.',
    regex: '^[А-Яа-яA-Za-z]\\.[А-Яа-яA-Za-z]\\.$',
    example: 'И.И.',
    category: 'custom'
  },

  // Пользовательская маска
  custom: {
    id: 'custom',
    name: 'Пользовательская маска',
    pattern: '',
    placeholder: '',
    regex: '',
    example: '',
    category: 'custom'
  }
};

// Группировка масок по категориям
export const MASK_CATEGORIES = {
  phone: {
    name: 'Телефоны',
    icon: 'PhoneIcon',
    templates: ['phone_ru', 'phone_ua', 'phone_short']
  },
  document: {
    name: 'Документы',
    icon: 'DocumentTextIcon',
    templates: ['passport_rf', 'snils', 'inn_personal', 'inn_org', 'license_plate_ru']
  },
  bank: {
    name: 'Банковские данные',
    icon: 'CreditCardIcon',
    templates: ['card_number', 'account_number', 'bik']
  },
  education: {
    name: 'Образование',
    icon: 'AcademicCapIcon',
    templates: ['specialty_code', 'group_code', 'student_id', 'code_mixed']
  },
  date: {
    name: 'Дата и время',
    icon: 'CalendarIcon',
    templates: ['date_ru', 'time_24']
  },
  address: {
    name: 'Адреса',
    icon: 'MapPinIcon',
    templates: ['postal_code_ru']
  },
  network: {
    name: 'Сеть',
    icon: 'GlobeAltIcon',
    templates: ['ip_address']
  },
  custom: {
    name: 'Пользовательские',
    icon: 'WrenchScrewdriverIcon',
    templates: ['name_initials', 'custom']
  }
};

// Символы маски
export const MASK_CHARS = {
  '9': /\d/,           // Только цифры 0-9
  'A': /[A-Za-z]/,     // Только латинские буквы
  'a': /[a-z]/,        // Только строчные латинские буквы
  'S': /[A-Za-z0-9]/,  // Буквы и цифры
  'Я': /[А-Яа-я]/,     // Только кириллица
  'я': /[а-я]/,        // Только строчная кириллица
  '*': /./             // Любой символ
};

// Получить шаблон по ID
export const getMaskTemplate = (templateId) => {
  return MASK_TEMPLATES[templateId] || null;
};

// Получить все шаблоны категории
export const getMasksByCategory = (categoryId) => {
  const category = MASK_CATEGORIES[categoryId];
  if (!category) return [];
  
  return category.templates.map(templateId => MASK_TEMPLATES[templateId]);
};

// Валидация значения по маске
export const validateMaskValue = (value, template) => {
  // Если значение пустое, считаем валидным (не показываем ошибку при стирании)
  if (!value || !value.trim()) return { is_valid: true };
  
  if (!template || !template.regex) return { is_valid: true };
  
  const regex = new RegExp(template.regex);
  const isValid = regex.test(value);
  
  return {
    is_valid: isValid,
    error_message: isValid ? null : 'Значение не соответствует формату маски'
  };
};

// Получить все доступные шаблоны
export const getAllMaskTemplates = () => {
  return Object.values(MASK_TEMPLATES);
};

// Конвертация маски из формата react-input-mask в более читаемый вид
export const convertMaskToDisplay = (mask) => {
  return mask
    .replace(/9/g, '_')
    .replace(/A/g, '_')
    .replace(/a/g, '_')
    .replace(/S/g, '_')
    .replace(/Я/g, '_')
    .replace(/я/g, '_')
    .replace(/\*/g, '_');
};

// Генерация placeholder из маски
export const generatePlaceholderFromMask = (mask) => {
  if (!mask) return '';
  
  return mask
    .replace(/9/g, '_')    // Цифры
    .replace(/A/g, '_')    // Буквы
    .replace(/a/g, '_')    // Строчные буквы
    .replace(/S/g, '_')    // Буквы или цифры
    .replace(/Я/g, '_')    // Кириллица
    .replace(/я/g, '_')    // Строчная кириллица
    .replace(/\*/g, '_');  // Любой символ
};

// Создание regex из маски
export const createRegexFromMask = (mask) => {
  if (!mask) return '';
  
  let result = '';
  
  for (let i = 0; i < mask.length; i++) {
    const char = mask[i];
    
    switch (char) {
      case '9':
        result += '\\d';
        break;
      case 'A':
        result += '[A-Za-zА-Яа-я]';
        break;
      case 'a':
        result += '[a-zа-я]';
        break;
      case 'S':
        result += '[A-Za-zА-Яа-я0-9]';
        break;
      case 'Я':
        result += '[А-Яа-я]';
        break;
      case 'я':
        result += '[а-я]';
        break;
      case '*':
        result += '.';
        break;
      default:
        // Для всех остальных символов экранируем их, если они являются спецсимволами regex
        if (/[.*+?^${}()|[\]\\]/.test(char)) {
          result += '\\' + char;
        } else {
          result += char;
        }
        break;
    }
  }
  
  return `^${result}$`;
}; 