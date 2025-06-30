import React from 'react';

const Checkbox = ({ 
  checked = false, 
  onChange, 
  label, 
  disabled = false, 
  className = '', 
  ...props 
}) => {
  return (
    <label className={`inline-flex items-center cursor-pointer ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div className={`
          w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center
          ${checked 
            ? 'bg-red-600 border-red-600' 
            : 'bg-white border-gray-300 hover:border-red-400'
          }
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}>
          {checked && (
            <svg 
              className="w-3 h-3 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          )}
        </div>
      </div>
      {label && (
        <span className="ml-3 text-gray-700 select-none">
          {label}
        </span>
      )}
    </label>
  );
};

export default Checkbox; 