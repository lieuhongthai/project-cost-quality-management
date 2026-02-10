import React from 'react';
import TextField from '@mui/material/TextField';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  multiline?: boolean;
  rows?: number;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  fullWidth = true,
  size = 'small',
  type,
  multiline,
  rows,
  ...props
}) => {
  return (
    <TextField
      id={id}
      label={label}
      error={!!error}
      helperText={error || helperText}
      fullWidth={fullWidth}
      size={size}
      type={type}
      multiline={multiline}
      rows={rows}
      className={className}
      required={props.required}
      disabled={props.disabled}
      placeholder={props.placeholder}
      value={props.value}
      defaultValue={props.defaultValue}
      onChange={props.onChange as any}
      onBlur={props.onBlur as any}
      name={props.name}
      slotProps={{
        htmlInput: {
          min: props.min,
          max: props.max,
          step: props.step,
          maxLength: props.maxLength,
          readOnly: props.readOnly,
        },
      }}
    />
  );
};
