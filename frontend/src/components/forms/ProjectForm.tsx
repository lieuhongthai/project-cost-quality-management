import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '@/services/api';
import { Button, Input, DateInput, TextArea } from '../common';
import type { Project, EffortUnit, ProjectSettings } from '@/types';
import { EFFORT_UNIT_FULL_LABELS, convertEffort } from '@/utils/effortUtils';
import { DEFAULT_NON_WORKING_DAYS } from '@/types';

interface ProjectFormProps {
  project?: Project;
  effortUnit?: EffortUnit;
  workSettings?: Partial<ProjectSettings>;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  project,
  effortUnit = 'man-hour',
  workSettings,
  onSuccess,
  onCancel,
}) => {
  const queryClient = useQueryClient();

  // Convert existing effort from man-months to display unit for editing
  const initialEffort = project?.estimatedEffort
    ? convertEffort(project.estimatedEffort, 'man-month', effortUnit, workSettings)
    : 0;

  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    startDate: project?.startDate ? project.startDate.split('T')[0] : '',
    endDate: project?.endDate ? project.endDate.split('T')[0] : '',
    estimatedEffort: initialEffort,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalculatingEndDate, setIsCalculatingEndDate] = useState(false);
  const [autoCalculate, setAutoCalculate] = useState(true);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Project>) => projectApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Project>) => projectApi.update(project!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', project!.id] });
      onSuccess();
    },
  });

  // Calculate end date when start date or estimated effort changes
  const calculateEndDate = useCallback(async () => {
    if (!formData.startDate || formData.estimatedEffort <= 0 || !autoCalculate) {
      return;
    }

    setIsCalculatingEndDate(true);
    try {
      // Convert effort to man-days for calculation
      const effortInDays = convertEffort(
        formData.estimatedEffort,
        effortUnit,
        'man-day',
        workSettings
      );

      // Round to whole days
      const wholeDays = Math.ceil(effortInDays);

      if (wholeDays <= 0) {
        return;
      }

      const response = await projectApi.calculateEndDate({
        startDate: formData.startDate,
        estimatedEffortDays: wholeDays,
        projectId: project?.id,
        nonWorkingDays: workSettings?.nonWorkingDays || DEFAULT_NON_WORKING_DAYS,
        holidays: workSettings?.holidays || [],
      });

      setFormData((prev) => ({
        ...prev,
        endDate: response.data.endDate,
      }));
    } catch (error) {
      console.error('Error calculating end date:', error);
    } finally {
      setIsCalculatingEndDate(false);
    }
  }, [formData.startDate, formData.estimatedEffort, effortUnit, workSettings, project?.id, autoCalculate]);

  // Auto-calculate end date when start date or effort changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      calculateEndDate();
    }, 500); // Debounce to avoid too many API calls

    return () => clearTimeout(debounceTimer);
  }, [calculateEndDate]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.estimatedEffort <= 0) {
      newErrors.estimatedEffort = 'Estimated effort must be greater than 0';
    }

    if (formData.endDate && formData.startDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Convert effort from display unit back to man-months for storage
    const effortInManMonths = convertEffort(
      formData.estimatedEffort,
      effortUnit,
      'man-month',
      workSettings
    );

    const submitData = {
      ...formData,
      estimatedEffort: effortInManMonths,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
    };

    if (project) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Convert estimatedEffort to number
    const finalValue = name === 'estimatedEffort' ? parseFloat(value) || 0 : value;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle manual end date change - disable auto-calculate
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoCalculate(false);
    handleChange(e);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Project Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        required
        disabled={isLoading}
      />

      <TextArea
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        disabled={isLoading}
      />

      <div className="grid grid-cols-2 gap-4">
        <DateInput
          label="Start Date"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          error={errors.startDate}
          required
          disabled={isLoading}
        />

        <div className="relative">
          <DateInput
            label="End Date"
            name="endDate"
            value={formData.endDate}
            onChange={handleEndDateChange}
            error={errors.endDate}
            disabled={isLoading}
          />
          {isCalculatingEndDate && (
            <div className="absolute right-2 top-8 text-xs text-gray-500">
              Calculating...
            </div>
          )}
          {!autoCalculate && formData.endDate && (
            <button
              type="button"
              onClick={() => {
                setAutoCalculate(true);
                calculateEndDate();
              }}
              className="absolute right-2 top-8 text-xs text-primary-600 hover:text-primary-700"
            >
              Auto-calculate
            </button>
          )}
        </div>
      </div>

      <Input
        label={`Estimated Effort (${EFFORT_UNIT_FULL_LABELS[effortUnit]}s)`}
        name="estimatedEffort"
        type="number"
        step="0.01"
        value={formData.estimatedEffort}
        onChange={handleChange}
        error={errors.estimatedEffort}
        required
        disabled={isLoading}
      />

      {formData.startDate && formData.estimatedEffort > 0 && (
        <p className="text-xs text-gray-500">
          End date is auto-calculated based on start date, estimated effort, and work calendar settings
          (excluding weekends and holidays).
        </p>
      )}

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
          {project ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
};
