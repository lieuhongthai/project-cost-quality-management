import React from 'react';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// Map custom variants to MUI variants and colors
const getButtonProps = (variant: ButtonProps['variant']) => {
  switch (variant) {
    case 'primary':
      return { muiVariant: 'contained' as const, color: 'primary' as const };
    case 'secondary':
      return { muiVariant: 'outlined' as const };
    case 'danger':
      return { muiVariant: 'contained' as const, color: 'error' as const };
    case 'success':
      return { muiVariant: 'contained' as const, color: 'success' as const };
    case 'outline':
      return { muiVariant: 'outlined' as const, color: 'primary' as const };
    case 'ghost':
      return { muiVariant: 'text' as const, color: 'inherit' as const };
    default:
      return { muiVariant: 'contained' as const, color: 'primary' as const };
  }
};

// Map custom sizes to MUI sizes
const getMuiSize = (size: ButtonProps['size']) => {
  switch (size) {
    case 'xs':
    case 'sm':
      return 'small' as const;
    case 'lg':
      return 'large' as const;
    case 'md':
    default:
      return 'medium' as const;
  }
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  startIcon,
  endIcon,
  fullWidth,
  type = 'button',
  ...props
}) => {
  const { muiVariant, color } = getButtonProps(variant);
  const muiSize = getMuiSize(size);

  // Extra small size styling
  const sxProps = size === 'xs' ? { fontSize: '0.75rem', py: 0.5, px: 1.5 } : {};

  return (
    <MuiButton
      variant={muiVariant}
      color={color}
      size={muiSize}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
      endIcon={endIcon}
      fullWidth={fullWidth}
      type={type}
      className={className}
      sx={sxProps}
      {...(props as any)}
    >
      {loading ? 'Loading...' : children}
    </MuiButton>
  );
};
