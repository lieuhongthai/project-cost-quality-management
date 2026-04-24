import React from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
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
  const selectedOption = options.find((option) => option.value === props.value) || null;

  return (
    <>
      <Autocomplete
        id={id}
        options={options}
        value={selectedOption}
        onChange={(_, option) => {
          if (onChange) {
            const syntheticEvent = {
              target: {
                name: props.name,
                value: option?.value ?? '',
              },
            } as React.ChangeEvent<HTMLSelectElement>;
            onChange(syntheticEvent);
          }
        }}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, value) => option.value === value.value}
        disabled={props.disabled}
        className={className}
        sx={{
          ...(fullWidth ? {} : { minWidth: 140 }),
        }}
        size={size}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            required={props.required}
            error={!!error}
          />
        )}
      />
      {(error || helperText) && (
        <FormHelperText error={!!error}>{error || helperText}</FormHelperText>
      )}
    </>
  );
};
