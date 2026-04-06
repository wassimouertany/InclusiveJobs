import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, className = '', id, ...props }) => {
  const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : `input-${Math.random().toString(36).substr(2, 9)}`);
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className="mb-4 text-left">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-bold text-gray-700 mb-1">
          {label}
        </label>
      )}
      {helperText && (
        <p id={helperId} className="text-xs text-gray-500 mb-2">
          {helperText}
        </p>
      )}
      <input
        id={inputId}
        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white text-gray-900 ${
          error ? "border-red-500 ring-red-100" : "border-gray-200"
        } ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={`${error ? errorId : ''} ${helperText ? helperId : ''}`.trim() || undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-red-500 text-xs mt-1 font-bold" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' }> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const base = "px-6 py-3 rounded-xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-offset-2 focus:ring-primary outline-none";
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-dark shadow-lg hover:shadow-primary/30",
    secondary: "bg-success-green text-white hover:bg-emerald-700 shadow-lg hover:shadow-emerald-200",
    outline: "bg-transparent border-2 border-primary text-primary hover:bg-primary/5"
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => {
  const percentage = (current / total) * 100;
  return (
    <div className="mb-8" aria-hidden="true">
      <div className="flex justify-between text-xs font-bold text-primary mb-2 uppercase tracking-widest">
        <span>Step {current}</span>
        <span>{Math.round(percentage)}% Complete</span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-700 ease-out" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
