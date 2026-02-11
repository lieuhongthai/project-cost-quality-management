import React from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import MuiSelect from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Tooltip from '@mui/material/Tooltip';
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
  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    newValue: EffortUnit | null
  ) => {
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={handleChange}
      size={size === 'sm' ? 'small' : 'medium'}
      className={className}
    >
      {EFFORT_UNITS.map((unit) => (
        <Tooltip key={unit} title={EFFORT_UNIT_FULL_LABELS[unit]} arrow>
          <ToggleButton
            value={unit}
            sx={{
              textTransform: 'none',
              px: size === 'sm' ? 1.5 : 2,
              py: size === 'sm' ? 0.5 : 1,
              fontSize: size === 'sm' ? '0.75rem' : '0.875rem',
            }}
          >
            {showFullLabel ? EFFORT_UNIT_FULL_LABELS[unit] : EFFORT_UNIT_LABELS[unit]}
          </ToggleButton>
        </Tooltip>
      ))}
    </ToggleButtonGroup>
  );
};

// Dropdown version for forms
interface EffortUnitDropdownProps {
  value: EffortUnit;
  onChange: (unit: EffortUnit) => void;
  label?: string;
  className?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}

export const EffortUnitDropdown: React.FC<EffortUnitDropdownProps> = ({
  value,
  onChange,
  label,
  className = '',
  size = 'small',
  fullWidth = true,
}) => {
  const labelId = 'effort-unit-label';

  return (
    <FormControl fullWidth={fullWidth} size={size} className={className}>
      {label && <InputLabel id={labelId}>{label}</InputLabel>}
      <MuiSelect
        labelId={labelId}
        value={value}
        label={label}
        onChange={(e) => onChange(e.target.value as EffortUnit)}
      >
        {EFFORT_UNITS.map((unit) => (
          <MenuItem key={unit} value={unit}>
            {EFFORT_UNIT_FULL_LABELS[unit]} ({EFFORT_UNIT_LABELS[unit]})
          </MenuItem>
        ))}
      </MuiSelect>
    </FormControl>
  );
};
