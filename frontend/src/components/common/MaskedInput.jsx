import React, { useState, useEffect } from 'react';

const MaskedInput = ({ 
  mask, 
  value = '', 
  onChange, 
  placeholder, 
  className = '', 
  disabled = false,
  ...props 
}) => {
  const [displayValue, setDisplayValue] = useState('');

  // Функция для применения маски
  const applyMask = (inputValue, maskPattern) => {
    if (!inputValue) return '';
    
    const cleanValue = inputValue.replace(/\D/g, ''); // Удаляем все нецифровые символы
    let maskedValue = '';
    let valueIndex = 0;

    for (let i = 0; i < maskPattern.length && valueIndex < cleanValue.length; i++) {
      if (maskPattern[i] === 'x') {
        maskedValue += cleanValue[valueIndex];
        valueIndex++;
      } else {
        maskedValue += maskPattern[i];
      }
    }

    return maskedValue;
  };

  // Функция для получения чистого значения (только цифры)
  const getCleanValue = (maskedValue) => {
    return maskedValue.replace(/\D/g, '');
  };

  useEffect(() => {
    if (mask) {
      setDisplayValue(applyMask(value, mask));
    } else {
      setDisplayValue(value);
    }
  }, [value, mask]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    if (mask) {
      const cleanValue = getCleanValue(inputValue);
      const maskedValue = applyMask(cleanValue, mask);
      setDisplayValue(maskedValue);
      
      // Передаем чистое значение (только цифры) в onChange
      if (onChange) {
        onChange(cleanValue);
      }
    } else {
      setDisplayValue(inputValue);
      if (onChange) {
        onChange(inputValue);
      }
    }
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${className}`}
      {...props}
    />
  );
};

export default MaskedInput; 