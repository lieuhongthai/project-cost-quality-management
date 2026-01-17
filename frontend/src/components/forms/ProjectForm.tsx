import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '@/services/api';
import { Button, Input, DateInput, TextArea } from '../common';
import type { Project, EffortUnit, ProjectSettings } from '@/types';
import { EFFORT_UNIT_FULL_LABELS, convertEffort } from '@/utils/effortUtils';
import { DEFAULT_NON_WORKING_DAYS } from '@/types';
import { format } from 'date-fns';

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

  // Suggested end date (shown as reference, not auto-filled)
  const [suggestedEndDate, setSuggestedEndDate] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionUsed, setSuggestionUsed] = useState(false);

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

  // Calculate suggested end date
  const calculateSuggestedEndDate = useCallback(async () => {
    if (!formData.startDate || formData.estimatedEffort <= 0) {
      setSuggestedEndDate(null);
      return;
    }

    setIsCalculating(true);
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
        setSuggestedEndDate(null);
        return;
      }

      const response = await projectApi.calculateEndDate({
        startDate: formData.startDate,
        estimatedEffortDays: wholeDays,
        projectId: project?.id,
        nonWorkingDays: workSettings?.nonWorkingDays || DEFAULT_NON_WORKING_DAYS,
        holidays: workSettings?.holidays || [],
      });

      setSuggestedEndDate(response.data.endDate);
    } catch (error) {
      console.error('Error calculating end date:', error);
      setSuggestedEndDate(null);
    } finally {
      setIsCalculating(false);
    }
  }, [formData.startDate, formData.estimatedEffort, effortUnit, workSettings, project?.id]);

  // Calculate suggestion when start date or effort changes
  useEffect(() => {
    if (!showSuggestion) return;

    const debounceTimer = setTimeout(() => {
      calculateSuggestedEndDate();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [calculateSuggestedEndDate, showSuggestion]);

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

    // Show suggestion when start date or effort changes
    if (name === 'startDate' || name === 'estimatedEffort') {
      setShowSuggestion(true);
      setSuggestionUsed(false);
    }
  };

  // Use suggested end date
  const useSuggestedDate = () => {
    if (suggestedEndDate) {
      setFormData((prev) => {
        return { ...prev, endDate: suggestedEndDate };
      });
      setSuggestionUsed(true);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Format suggested date for display
  const formatSuggestedDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy (EEEE)');
    } catch {
      return dateStr;
    }
  };

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

        <DateInput
          label="End Date"
          name="endDate"
          value={formData.endDate}
          onChange={handleChange}
          error={errors.endDate}
          disabled={isLoading}
        />
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

      {/* Suggested End Date - shown as reference (fixed height to prevent flickering) */}
      {showSuggestion && formData.startDate && formData.estimatedEffort > 0 && (
        <div className={`p-3 rounded-lg border transition-colors ${
          suggestionUsed
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200'
        }`} style={{ minHeight: '80px' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className={`text-sm font-medium ${suggestionUsed ? 'text-green-700' : 'text-blue-700'}`}>
                {suggestionUsed ? 'End Date Applied' : 'Suggested End Date'}
              </p>
              {isCalculating ? (
                <p className="text-sm text-blue-600">Calculating...</p>
              ) : suggestedEndDate ? (
                <p className={`text-lg font-semibold ${suggestionUsed ? 'text-green-800' : 'text-blue-800'}`}>
                  {formatSuggestedDate(suggestedEndDate)}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Unable to calculate</p>
              )}
              <p className={`text-xs mt-1 ${suggestionUsed ? 'text-green-500' : 'text-blue-500'}`}>
                Based on {Math.ceil(convertEffort(formData.estimatedEffort, effortUnit, 'man-day', workSettings))} working days
              </p>
            </div>
            {suggestedEndDate && !suggestionUsed && (
              <Button
                type="button"
                size="sm"
                onClick={useSuggestedDate}
                disabled={isCalculating}
              >
                Use this date
              </Button>
            )}
            {suggestionUsed && (
              <span className="text-green-600 text-sm font-medium">Applied!</span>
            )}
          </div>
        </div>
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
