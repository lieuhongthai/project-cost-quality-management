import { EffortUnit, ProjectSettings } from '../types';

/**
 * Default settings when project settings are not available
 */
export const DEFAULT_WORK_SETTINGS = {
  workingHoursPerDay: 8,
  workingDaysPerMonth: 20,
  defaultEffortUnit: 'man-hour' as EffortUnit,
};

/**
 * Labels for effort units
 */
export const EFFORT_UNIT_LABELS: Record<EffortUnit, string> = {
  'man-hour': 'MH',
  'man-day': 'MD',
  'man-month': 'MM',
};

export const EFFORT_UNIT_FULL_LABELS: Record<EffortUnit, string> = {
  'man-hour': 'Man-Hour',
  'man-day': 'Man-Day',
  'man-month': 'Man-Month',
};

/**
 * Get the conversion rates based on project settings
 */
export function getConversionRates(settings?: Partial<ProjectSettings>) {
  const hoursPerDay = settings?.workingHoursPerDay || DEFAULT_WORK_SETTINGS.workingHoursPerDay;
  const daysPerMonth = settings?.workingDaysPerMonth || DEFAULT_WORK_SETTINGS.workingDaysPerMonth;
  const hoursPerMonth = hoursPerDay * daysPerMonth;

  return {
    hoursPerDay,
    daysPerMonth,
    hoursPerMonth,
  };
}

/**
 * Convert effort value from one unit to another
 *
 * @param value - The effort value to convert
 * @param fromUnit - The source unit (the unit the value is currently in)
 * @param toUnit - The target unit (the unit to convert to)
 * @param settings - Project settings for conversion rates
 * @returns The converted effort value
 */
export function convertEffort(
  value: number,
  fromUnit: EffortUnit,
  toUnit: EffortUnit,
  settings?: Partial<ProjectSettings>
): number {
  if (fromUnit === toUnit) return value;
  if (!value || isNaN(value)) return 0;

  const rates = getConversionRates(settings);

  // First convert to man-hours (base unit)
  let valueInHours: number;
  switch (fromUnit) {
    case 'man-hour':
      valueInHours = value;
      break;
    case 'man-day':
      valueInHours = value * rates.hoursPerDay;
      break;
    case 'man-month':
      valueInHours = value * rates.hoursPerMonth;
      break;
    default:
      valueInHours = value;
  }

  // Then convert from man-hours to target unit
  switch (toUnit) {
    case 'man-hour':
      return valueInHours;
    case 'man-day':
      return valueInHours / rates.hoursPerDay;
    case 'man-month':
      return valueInHours / rates.hoursPerMonth;
    default:
      return valueInHours;
  }
}

/**
 * Format effort value with appropriate decimal places
 */
export function formatEffort(value: number, unit: EffortUnit): string {
  if (!value || isNaN(value)) return '0';

  // Use different precision based on unit
  switch (unit) {
    case 'man-hour':
      return value >= 10 ? value.toFixed(1) : value.toFixed(2);
    case 'man-day':
      return value.toFixed(2);
    case 'man-month':
      return value.toFixed(3);
    default:
      return value.toFixed(2);
  }
}

/**
 * Format effort with unit label
 */
export function formatEffortWithUnit(
  value: number,
  displayUnit: EffortUnit,
  sourceUnit: EffortUnit = 'man-hour',
  settings?: Partial<ProjectSettings>
): string {
  const convertedValue = convertEffort(value, sourceUnit, displayUnit, settings);
  const formattedValue = formatEffort(convertedValue, displayUnit);
  return `${formattedValue} ${EFFORT_UNIT_LABELS[displayUnit]}`;
}

/**
 * Get effort display info including converted value and label
 */
export function getEffortDisplay(
  value: number,
  displayUnit: EffortUnit,
  sourceUnit: EffortUnit = 'man-hour',
  settings?: Partial<ProjectSettings>
): { value: number; formatted: string; label: string; fullLabel: string } {
  const convertedValue = convertEffort(value, sourceUnit, displayUnit, settings);
  return {
    value: convertedValue,
    formatted: formatEffort(convertedValue, displayUnit),
    label: EFFORT_UNIT_LABELS[displayUnit],
    fullLabel: EFFORT_UNIT_FULL_LABELS[displayUnit],
  };
}

/**
 * Calculate total hours from effort value
 * Useful for calculating costs (hourlyRate * totalHours)
 */
export function toManHours(
  value: number,
  fromUnit: EffortUnit,
  settings?: Partial<ProjectSettings>
): number {
  return convertEffort(value, fromUnit, 'man-hour', settings);
}

/**
 * Parse effort input - handles user input that might include unit suffix
 */
export function parseEffortInput(
  input: string,
  defaultUnit: EffortUnit = 'man-hour'
): { value: number; unit: EffortUnit } {
  const trimmed = input.trim().toLowerCase();

  // Check for unit suffix
  if (trimmed.endsWith('mm')) {
    return { value: parseFloat(trimmed), unit: 'man-month' };
  }
  if (trimmed.endsWith('md')) {
    return { value: parseFloat(trimmed), unit: 'man-day' };
  }
  if (trimmed.endsWith('mh') || trimmed.endsWith('h')) {
    return { value: parseFloat(trimmed), unit: 'man-hour' };
  }

  return { value: parseFloat(trimmed) || 0, unit: defaultUnit };
}
