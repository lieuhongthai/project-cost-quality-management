import React from 'react';
import { EffortUnit } from '../../types';
import { EFFORT_UNIT_LABELS, EFFORT_UNIT_FULL_LABELS } from '../../utils/effortUtils';

interface EffortUnitSelectorProps {
  value: EffortUnit;
  onChange: (unit: EffortUnit) => void;
  size?: 'sm' | 'md';
  showFullLabel?: boolean;
  className?: string;
}

const EFFORT_UNITS: EffortUnit[] = ['man-hour', 'man-day', 'man-month'];

export const EffortUnitSelector: React.FC<EffortUnitSelectorProps> = ({
  value,
  onChange,
  size = 'sm',
  showFullLabel = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <div className={`inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 ${className}`}>
      {EFFORT_UNITS.map((unit) => (
        <button
          key={unit}
          type="button"
          onClick={() => onChange(unit)}
          className={`
            ${sizeClasses[size]}
            font-medium rounded-md transition-all duration-200
            ${
              value === unit
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
          title={EFFORT_UNIT_FULL_LABELS[unit]}
        >
          {showFullLabel ? EFFORT_UNIT_FULL_LABELS[unit] : EFFORT_UNIT_LABELS[unit]}
        </button>
      ))}
    </div>
  );
};

// Dropdown version for forms
interface EffortUnitDropdownProps {
  value: EffortUnit;
  onChange: (unit: EffortUnit) => void;
  label?: string;
  className?: string;
}

export const EffortUnitDropdown: React.FC<EffortUnitDropdownProps> = ({
  value,
  onChange,
  label,
  className = '',
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as EffortUnit)}
        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        {EFFORT_UNITS.map((unit) => (
          <option key={unit} value={unit}>
            {EFFORT_UNIT_FULL_LABELS[unit]} ({EFFORT_UNIT_LABELS[unit]})
          </option>
        ))}
      </select>
    </div>
  );
};
