import React from 'react';

const FormInput = ({ label, error, type = 'text', className = '', ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="label">{label}</label>}
    {type === 'select' ? (
      <select className={`input ${className}`} {...props}>{props.children}</select>
    ) : type === 'textarea' ? (
      <textarea className={`input resize-none ${className}`} rows={3} {...props} />
    ) : (
      <input type={type} className={`input ${className}`} {...props} />
    )}
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

export default FormInput;
