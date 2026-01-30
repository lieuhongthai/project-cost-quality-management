import React, { ReactNode } from "react";

// Card Component
interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string | ReactNode;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  title,
  actions,
}) => {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

// Loading Spinner Component
export const LoadingSpinner: React.FC<{ size?: "sm" | "md" | "lg" }> = ({
  size = "md",
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex justify-center items-center">
      <svg
        className={`animate-spin ${sizeClasses[size]} text-primary-600`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
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
    <div className="text-center py-12">
      {icon && <div className="flex justify-center mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-gray-500 mb-4">{description}</p>}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
};

// Status Badge Component
interface StatusBadgeProps {
  status: "Good" | "Warning" | "At Risk" | "Acceptable" | "Poor";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusClasses = {
    Good: "status-good",
    Warning: "status-warning",
    "At Risk": "status-at-risk",
    Acceptable: "status-acceptable",
    Poor: "status-poor",
  };

  return <span className={statusClasses[status]}>{status}</span>;
};

// Progress Bar Component
export interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "success" | "warning" | "danger";
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = false,
  size = "md",
  color = "primary",
  className = "",
}) => {
  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  const colorClasses = {
    primary: "bg-primary-600",
    success: "bg-green-600",
    warning: "bg-yellow-600",
    danger: "bg-red-600",
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-600 mt-1 block">
          {clampedProgress.toFixed(0)}%
        </span>
      )}
    </div>
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
  return (
    <label
      className={`flex items-center gap-3 cursor-pointer ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-gray-300 text-primary-600 transition-colors focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {label && <span className="text-sm text-gray-700 select-none">{label}</span>}
    </label>
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
  return (
    <label
      className={`flex items-center gap-2 cursor-pointer ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      <input
        type="radio"
        id={id}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 border-gray-300 text-primary-600 transition-colors focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {label && <span className="text-sm text-gray-700 select-none">{label}</span>}
    </label>
  );
};

// Tooltip Component
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
}) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block group">
      {children}
      <div
        className={`absolute ${positionClasses[position]} z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none`}
      >
        {content}
      </div>
    </div>
  );
};

// IconButton Component
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'success' | 'danger' | 'primary' | 'info';
  icon: ReactNode;
  tooltip?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  variant = 'default',
  icon,
  tooltip,
  className = '',
  disabled,
  ...props
}) => {
  const variantClasses = {
    default: 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
    success: 'text-green-600 hover:bg-green-50',
    danger: 'text-gray-400 hover:bg-gray-100 hover:text-red-600',
    primary: 'text-gray-400 hover:bg-gray-100 hover:text-primary-600',
    info: 'text-gray-400 hover:bg-gray-100 hover:text-blue-600',
  };

  return (
    <button
      type="button"
      className={`rounded p-1 transition-colors focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      title={tooltip}
      {...props}
    >
      {icon}
    </button>
  );
};
