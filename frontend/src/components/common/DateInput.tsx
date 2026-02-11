import React, { forwardRef, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { parse, format, isValid } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

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
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}

/**
 * Custom input component for react-datepicker using MUI TextField
 */
const CustomInput = forwardRef<HTMLInputElement, {
  value?: string;
  onClick?: () => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  label?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}>(({ value, onClick, onChange, onBlur, label, error, helperText, disabled, required, size, fullWidth, placeholder, className, id }, ref) => (
  <TextField
    id={id}
    inputRef={ref}
    label={label}
    value={value || ''}
    onClick={onClick}
    onChange={onChange}
    onBlur={onBlur}
    placeholder={placeholder}
    disabled={disabled}
    required={required}
    error={error}
    helperText={helperText}
    fullWidth={fullWidth}
    size={size}
    className={className}
    slotProps={{
      inputLabel: { shrink: true },
      input: {
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              onClick={onClick}
              disabled={disabled}
              edge="end"
              size="small"
              aria-label="Open calendar"
            >
              <CalendarTodayIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
      },
    }}
  />
));
CustomInput.displayName = 'CustomInput';

/**
 * DateInput component using react-datepicker with MUI TextField
 * - Accepts and displays dates in yyyy/MM/dd format
 * - Uses react-datepicker for calendar functionality
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
  placeholder = 'yyyy/MM/dd',
  size = 'small',
  fullWidth = true,
}) => {
  // Convert ISO string (yyyy-mm-dd) to Date object
  const parseISOToDate = (isoString: string): Date | null => {
    if (!isoString) return null;
    const date = parse(isoString, 'yyyy-MM-dd', new Date());
    return isValid(date) ? date : null;
  };

  // Convert Date object to ISO string (yyyy-mm-dd)
  const formatDateToISO = (date: Date | null): string => {
    if (!date || !isValid(date)) return '';
    return format(date, 'yyyy-MM-dd');
  };

  const handleDateChange = useCallback((date: Date | null) => {
    const isoDate = formatDateToISO(date);

    // Create a synthetic event to match the existing onChange interface
    const syntheticEvent = {
      target: {
        name,
        value: isoDate,
      },
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(syntheticEvent);
  }, [name, onChange]);

  const selectedDate = parseISOToDate(value);

  return (
    <DatePicker
      selected={selectedDate}
      onChange={handleDateChange}
      dateFormat="yyyy/MM/dd"
      placeholderText={placeholder}
      disabled={disabled}
      // showYearPicker
      // showMonthYearPicker
      customInput={
        <CustomInput
          id={id}
          label={label}
          error={!!error}
          helperText={error || helperText}
          disabled={disabled}
          required={required}
          size={size}
          fullWidth={fullWidth}
          placeholder={placeholder}
          className={className}
        />
      }
      wrapperClassName={fullWidth ? 'w-full' : ''}
    />
  );
};
