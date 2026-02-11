import React, { ReactNode } from "react";
import MuiCard from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import MuiCheckbox from "@mui/material/Checkbox";
import MuiRadio from "@mui/material/Radio";
import FormControlLabel from "@mui/material/FormControlLabel";
import MuiTooltip from "@mui/material/Tooltip";
import MuiIconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// Card Component
interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string | ReactNode;
  actions?: React.ReactNode;
  elevation?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  title,
  actions,
  elevation = 1,
}) => {
  return (
    <MuiCard className={className} elevation={elevation} sx={{ p: 2 }}>
      {(title || actions) && (
        <CardHeader
          title={title}
          action={actions}
          sx={{ p: 0, pb: 2 }}
          titleTypographyProps={{ variant: "h6", fontWeight: 600 }}
        />
      )}
      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        {children}
      </CardContent>
    </MuiCard>
  );
};

// Loading Spinner Component
export const LoadingSpinner: React.FC<{ size?: "sm" | "md" | "lg" }> = ({
  size = "md",
}) => {
  const sizeMap = {
    sm: 20,
    md: 40,
    lg: 60,
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center">
      <CircularProgress size={sizeMap[size]} />
    </Box>
  );
};

// Empty State Component
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
}) => {
  return (
    <Box textAlign="center" py={6}>
      {icon && (
        <Box display="flex" justifyContent="center" mb={2}>
          {icon}
        </Box>
      )}
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {description}
        </Typography>
      )}
      {action && (
        <Box display="flex" justifyContent="center">
          {action}
        </Box>
      )}
    </Box>
  );
};

// Status Badge Component
interface StatusBadgeProps {
  status: "Good" | "Warning" | "At Risk" | "Acceptable" | "Poor";
}

const statusColorMap = {
  Good: "success" as const,
  Warning: "warning" as const,
  "At Risk": "error" as const,
  Acceptable: "info" as const,
  Poor: "error" as const,
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  return (
    <Chip
      label={status}
      color={statusColorMap[status]}
      size="small"
      variant="filled"
    />
  );
};

// Progress Bar Component
export interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "success" | "warning" | "danger";
  className?: string;
}

const colorMap = {
  primary: "primary" as const,
  success: "success" as const,
  warning: "warning" as const,
  danger: "error" as const,
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = false,
  size = "md",
  color = "primary",
  className = "",
}) => {
  const heightMap = {
    sm: 4,
    md: 8,
    lg: 12,
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <Box className={className} width="100%">
      <LinearProgress
        variant="determinate"
        value={clampedProgress}
        color={colorMap[color]}
        sx={{ height: heightMap[size], borderRadius: 1 }}
      />
      {showLabel && (
        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          {clampedProgress.toFixed(0)}%
        </Typography>
      )}
    </Box>
  );
};

// Checkbox Component
interface CheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string | ReactNode;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked,
  onChange,
  label,
  disabled = false,
  className = "",
}) => {
  if (label) {
    return (
      <FormControlLabel
        className={className}
        control={
          <MuiCheckbox
            id={id}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            size="small"
          />
        }
        label={<Typography variant="body2">{label}</Typography>}
      />
    );
  }

  return (
    <MuiCheckbox
      id={id}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      size="small"
      className={className}
    />
  );
};

// Radio Component
interface RadioProps {
  id?: string;
  name?: string;
  checked: boolean;
  onChange: () => void;
  label?: string | ReactNode;
  disabled?: boolean;
  className?: string;
}

export const Radio: React.FC<RadioProps> = ({
  id,
  name,
  checked,
  onChange,
  label,
  disabled = false,
  className = "",
}) => {
  if (label) {
    return (
      <FormControlLabel
        className={className}
        control={
          <MuiRadio
            id={id}
            name={name}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            size="small"
          />
        }
        label={<Typography variant="body2">{label}</Typography>}
      />
    );
  }

  return (
    <MuiRadio
      id={id}
      name={name}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      size="small"
      className={className}
    />
  );
};

// Tooltip Component
interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
}) => {
  return (
    <MuiTooltip title={content} placement={position} arrow>
      {children}
    </MuiTooltip>
  );
};

// IconButton Component
interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  variant?: "default" | "success" | "danger" | "primary" | "info";
  icon: ReactNode;
  tooltip?: string;
}

const iconButtonColorMap = {
  default: "default" as const,
  success: "success" as const,
  danger: "error" as const,
  primary: "primary" as const,
  info: "info" as const,
};

export const IconButton: React.FC<IconButtonProps> = ({
  variant = "default",
  icon,
  tooltip,
  className = "",
  disabled,
  onClick,
}) => {
  const button = (
    <MuiIconButton
      color={iconButtonColorMap[variant]}
      disabled={disabled}
      onClick={onClick as any}
      className={className}
      size="small"
    >
      {icon}
    </MuiIconButton>
  );

  if (tooltip) {
    return (
      <MuiTooltip title={tooltip} arrow>
        <span>{button}</span>
      </MuiTooltip>
    );
  }

  return button;
};
