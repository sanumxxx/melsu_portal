import React from 'react';

const TextArea = ({ 
  value = '',
  onChange,
  placeholder = '',
  rows = 3,
  disabled = false,
  required = false,
  className = '',
  error = '',
  ...props 
}) => {
  const baseClasses = 'w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical';
  
  const stateClasses = error 
    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
    : 'border-gray-300';
    
  const disabledClasses = disabled 
    ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
    : 'bg-white text-gray-900';

  const classes = `${baseClasses} ${stateClasses} ${disabledClasses} ${className}`;

  return (
    <div className="w-full">
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
        className={classes}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export { TextArea };
export default TextArea; 