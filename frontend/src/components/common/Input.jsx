import React from 'react';

const Input = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`
          w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors
          min-h-[48px] appearance-none
          ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}
    </div>
  );
};

export default Input; 