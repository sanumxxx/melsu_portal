import React, { useRef, useEffect } from 'react';

const CodeInput = ({ value, onChange, length = 6 }) => {
  const inputRefs = useRef([]);

  useEffect(() => {
    // Фокус на первом инпуте при загрузке
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, inputValue) => {
    // Убираем все нецифровые символы
    const newValue = inputValue.replace(/\D/g, '').slice(0, 1);
    
    // Создаем новый массив значений
    const newCode = [...value];
    newCode[index] = newValue;
    
    // Обновляем состояние
    onChange(newCode);

    // Переход к следующему инпуту если введена цифра
    if (newValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // Если поле пустое, переходим к предыдущему и очищаем его
        const newCode = [...value];
        newCode[index - 1] = '';
        onChange(newCode);
        inputRefs.current[index - 1]?.focus();
      } else if (value[index]) {
        // Если поле заполнено, очищаем его
        const newCode = [...value];
        newCode[index] = '';
        onChange(newCode);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const newCode = Array(length).fill('');
    
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    
    onChange(newCode);
    
    // Фокус на следующем пустом инпуте или последнем заполненном
    const nextEmptyIndex = newCode.findIndex(code => !code);
    const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
    setTimeout(() => {
      inputRefs.current[focusIndex]?.focus();
    }, 0);
  };

  const handleFocus = (index) => {
    // Выделяем содержимое при фокусе
    setTimeout(() => {
      inputRefs.current[index]?.select();
    }, 0);
  };

  return (
    <div className="flex justify-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
      {Array(length).fill('').map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength="1"
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          autoComplete="one-time-code"
          className="
            w-10 h-10 sm:w-12 sm:h-12
            bg-white 
            border-2 border-gray-300 
            rounded-xl 
            text-center text-lg sm:text-xl font-bold text-gray-800
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
            transition-all duration-300
            hover:border-gray-400
            placeholder-gray-400
          "
          placeholder="•"
        />
      ))}
    </div>
  );
};

export default CodeInput; 