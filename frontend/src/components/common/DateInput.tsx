import React, { useState, useCallback, useEffect } from 'react';

interface DateInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  value: string; // yyyy-mm-dd format (ISO date string without time)
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
}

/**
 * DateInput component with yyyy/mm/dd format
 * - Accepts and displays dates in yyyy/mm/dd format
 * - Auto-formats input with slashes
 * - Validates date format and values
 * - Returns ISO date string (yyyy-mm-dd) for backend compatibility
 */
export const DateInput: React.FC<DateInputProps> = ({
  label,
  error,
  helperText,
  value,
  onChange,
  name,
  required = false,
  disabled = false,
  className = '',
  id,
  placeholder = 'yyyy/mm/dd',
}) => {
  const inputId = id || `date-input-${Math.random().toString(36).substr(2, 9)}`;

  // Convert ISO date (yyyy-mm-dd) to display format (yyyy/mm/dd)
  const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate) return '';
    // ISO format is already yyyy-mm-dd, just replace - with /
    return isoDate.replace(/-/g, '/');
  };

  // Convert display format (yyyy/mm/dd) to ISO (yyyy-mm-dd)
  const formatDateForStorage = (displayDate: string): string => {
    if (!displayDate) return '';
    // Remove all non-digits
    const cleaned = displayDate.replace(/\D/g, '');
    if (cleaned.length !== 8) return displayDate;

    // Format as yyyy-mm-dd
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);

    return `${year}-${month}-${day}`;
  };

  // Local display value
  const [displayValue, setDisplayValue] = useState(formatDateForDisplay(value));

  // Sync with external value changes
  useEffect(() => {
    setDisplayValue(formatDateForDisplay(value));
  }, [value]);

  // Auto-format input as user types
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;

    // Remove all non-digits
    let cleaned = input.replace(/\D/g, '');

    // Limit to 8 digits (yyyymmdd)
    cleaned = cleaned.substring(0, 8);

    // Auto-format with slashes
    let formatted = cleaned;
    if (cleaned.length >= 4) {
      formatted = cleaned.substring(0, 4) + '/' + cleaned.substring(4);
    }
    if (cleaned.length >= 6) {
      formatted = cleaned.substring(0, 4) + '/' + cleaned.substring(4, 6) + '/' + cleaned.substring(6);
    }

    setDisplayValue(formatted);

    // Only trigger onChange if we have a complete date or empty
    if (cleaned.length === 8 || cleaned.length === 0) {
      const isoDate = cleaned.length === 8 ? formatDateForStorage(formatted) : '';

      // Create a synthetic event with the ISO format value
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          name,
          value: isoDate,
        },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange(syntheticEvent);
    }
  }, [name, onChange]);

  // Validate on blur
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const cleaned = displayValue.replace(/\D/g, '');

    if (cleaned.length > 0 && cleaned.length !== 8) {
      // Incomplete date - clear it
      setDisplayValue('');
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          name,
          value: '',
        },
      } as any;
      onChange(syntheticEvent);
      return;
    }

    if (cleaned.length === 8) {
      const year = parseInt(cleaned.substring(0, 4));
      const month = parseInt(cleaned.substring(4, 6));
      const day = parseInt(cleaned.substring(6, 8));

      // Basic validation
      if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
        // Invalid date - clear it
        setDisplayValue('');
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            name,
            value: '',
          },
        } as any;
        onChange(syntheticEvent);
      }
    }
  }, [displayValue, name, onChange]);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        name={name}
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`input ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
        maxLength={10} // yyyy/mm/dd = 10 characters
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};
