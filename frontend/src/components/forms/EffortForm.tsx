import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { effortApi } from '@/services/api';
import { Button, Input, DateInput } from '../common';
import type { Effort, EffortUnit, ProjectSettings } from '@/types';
import { addDays, startOfWeek } from 'date-fns';
import { EFFORT_UNIT_FULL_LABELS, convertEffort } from '@/utils/effortUtils';

interface EffortFormProps {
  phaseId: number;
  effort?: Effort;
  effortUnit?: EffortUnit;
  workSettings?: Partial<ProjectSettings>;
  onSuccess: () => void;
  onCancel: () => void;
}

export const EffortForm: React.FC<EffortFormProps> = ({
  phaseId,
  effort,
  effortUnit = 'man-month',
  workSettings,
  onSuccess,
  onCancel,
}) => {
  const queryClient = useQueryClient();

  // Convert existing effort from man-months to display unit for editing
  const initialPlanned = effort?.plannedEffort
    ? convertEffort(effort.plannedEffort, 'man-month', effortUnit, workSettings)
    : 0;
  const initialActual = effort?.actualEffort
    ? convertEffort(effort.actualEffort, 'man-month', effortUnit, workSettings)
    : 0;

  const [formData, setFormData] = useState({
    weekStartDate: effort?.weekStartDate ? effort.weekStartDate.split('T')[0] : '',
    plannedEffort: initialPlanned,
    actualEffort: initialActual,
    progress: effort?.progress || 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: Partial<Effort>) => effortApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efforts', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['effort-summary', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['phase', phaseId] });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Effort>) => effortApi.update(effort!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efforts', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['effort-summary', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['phase', phaseId] });
      onSuccess();
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.weekStartDate) {
      newErrors.weekStartDate = 'Week start date is required';
    }

    if (formData.plannedEffort < 0) {
      newErrors.plannedEffort = 'Planned effort cannot be negative';
    }

    if (formData.actualEffort < 0) {
      newErrors.actualEffort = 'Actual effort cannot be negative';
    }

    if (formData.progress < 0 || formData.progress > 100) {
      newErrors.progress = 'Progress must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Convert effort from display unit back to man-months for storage
    const plannedInManMonths = convertEffort(
      formData.plannedEffort,
      effortUnit,
      'man-month',
      workSettings
    );
    const actualInManMonths = convertEffort(
      formData.actualEffort,
      effortUnit,
      'man-month',
      workSettings
    );

    if (effort) {
      // When updating, only send the editable fields
      const updateData = {
        plannedEffort: plannedInManMonths,
        actualEffort: actualInManMonths,
        progress: parseFloat(formData.progress.toString()),
      };
      updateMutation.mutate(updateData);
    } else {
      // When creating, send all required fields
      const weekStart = new Date(formData.weekStartDate);
      const weekEnd = addDays(weekStart, 6);
      const weekNumber = Math.ceil((weekStart.getTime() - startOfWeek(new Date(weekStart.getFullYear(), 0, 1)).getTime()) / (7 * 24 * 60 * 60 * 1000));

      const createData = {
        phaseId,
        weekNumber,
        year: weekStart.getFullYear(),
        weekStartDate: weekStart.toISOString(),
        weekEndDate: weekEnd.toISOString(),
        plannedEffort: plannedInManMonths,
        actualEffort: actualInManMonths,
        progress: parseFloat(formData.progress.toString()),
      };
      createMutation.mutate(createData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Convert number fields to actual numbers
    const numberFields = ['plannedEffort', 'actualEffort', 'progress'];
    const finalValue = numberFields.includes(name) ? parseFloat(value) || 0 : value;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DateInput
        label="Week Start Date"
        name="weekStartDate"
        value={formData.weekStartDate}
        onChange={handleChange}
        error={errors.weekStartDate}
        required
        disabled={isLoading || !!effort}
        helperText="Enter date in yyyy/mm/dd format (e.g., 2024/01/15)"
      />

      <Input
        label={`Planned Effort (${EFFORT_UNIT_FULL_LABELS[effortUnit]}s)`}
        name="plannedEffort"
        type="number"
        step="0.01"
        value={formData.plannedEffort}
        onChange={handleChange}
        error={errors.plannedEffort}
        required
        disabled={isLoading}
      />

      <Input
        label={`Actual Effort (${EFFORT_UNIT_FULL_LABELS[effortUnit]}s)`}
        name="actualEffort"
        type="number"
        step="0.01"
        value={formData.actualEffort}
        onChange={handleChange}
        error={errors.actualEffort}
        disabled={isLoading}
      />

      <Input
        label="Progress (%)"
        name="progress"
        type="number"
        step="0.1"
        min="0"
        max="100"
        value={formData.progress}
        onChange={handleChange}
        error={errors.progress}
        disabled={isLoading}
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading}
        >
          {effort ? 'Update Effort' : 'Add Effort'}
        </Button>
      </div>
    </form>
  );
};
