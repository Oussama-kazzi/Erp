import React from 'react';

const FilterBar = ({ filters, values, onChange, onReset }) => (
  <div className="flex flex-wrap items-end gap-3">
    {filters.map((f) => (
      <div key={f.key} className="flex flex-col gap-1.5 min-w-[130px]">
        {f.label && <label className="label">{f.label}</label>}
        {f.type === 'select' ? (
          <select
            className="input text-sm py-2"
            value={values[f.key] || ''}
            onChange={(e) => onChange(f.key, e.target.value)}
          >
            <option value="">All</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input
            type={f.type || 'text'}
            className="input text-sm py-2"
            placeholder={f.placeholder || ''}
            value={values[f.key] || ''}
            onChange={(e) => onChange(f.key, e.target.value)}
          />
        )}
      </div>
    ))}
    {onReset && (
      <button onClick={onReset} className="btn-ghost btn-sm self-end text-xs">
        Clear filters
      </button>
    )}
  </div>
);

export default FilterBar;
