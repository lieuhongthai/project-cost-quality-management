import React from 'react';
import TextField from '@mui/material/TextField';
import MuiSelect from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormHelperText from '@mui/material/FormHelperText';

// TextArea Component - Using MUI TextField with multiline
interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  rows = 4,
  onChange,
  ...props
}) => {
  return (
    <TextField
      id={id}
      label={label}
      error={!!error}
      helperText={error || helperText}
      fullWidth
      size="small"
      multiline
      rows={rows}
      className={className}
      required={props.required}
      disabled={props.disabled}
      placeholder={props.placeholder}
      value={props.value}
      defaultValue={props.defaultValue}
      onChange={onChange as any}
      name={props.name}
    />
  );
};

// Select Component
interface SelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string | number; label: string }[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  value?: string | number;
  defaultValue?: string | number;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  className = '',
  id,
  fullWidth = true,
  size = 'small',
  onChange,
  ...props
}) => {
  const labelId = `${id || 'select'}-label`;

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      error={!!error}
      className={className}
      required={props.required}
      disabled={props.disabled}
      sx={!fullWidth ? { minWidth: 140 } : undefined}
    >
      {label && <InputLabel id={labelId}>{label}</InputLabel>}
      <MuiSelect
        id={id}
        labelId={labelId}
        label={label}
        value={props.value || ''}
        defaultValue={props.defaultValue}
        onChange={(e) => {
          if (onChange) {
            // Create synthetic event for compatibility
            const syntheticEvent = {
              target: {
                name: props.name,
                value: e.target.value,
              },
            } as React.ChangeEvent<HTMLSelectElement>;
            onChange(syntheticEvent);
          }
        }}
        name={props.name}
        MenuProps={{
          disableScrollLock: true,
        }}
        displayEmpty
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
      {(error || helperText) && (
        <FormHelperText>{error || helperText}</FormHelperText>
      )}
    </FormControl>
  );
};
