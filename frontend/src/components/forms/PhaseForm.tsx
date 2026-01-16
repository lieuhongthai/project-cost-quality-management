import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { phaseApi } from '@/services/api';
import { Button, Input, DateInput } from '../common';
import type { Phase, EffortUnit, ProjectSettings } from '@/types';
import { EFFORT_UNIT_FULL_LABELS, convertEffort } from '@/utils/effortUtils';

interface PhaseFormProps {
  projectId: number;
  phase?: Phase;
  effortUnit?: EffortUnit;
  workSettings?: Partial<ProjectSettings>;
  onSuccess: () => void;
  onCancel: () => void;
}

// Common phase name suggestions (but not enforced)
const PHASE_SUGGESTIONS = [
  'Functional Design',
  'Coding',
  'Unit Test',
  'Integration Test',
  'System Test',
  'JA Test',
  'EN Test',
  'UAT',
  'Performance Test',
  'Security Test',
];

export const PhaseForm: React.FC<PhaseFormProps> = ({
  projectId,
  phase,
  effortUnit = 'man-month',
  workSettings,
  onSuccess,
  onCancel,
}) => {
  const queryClient = useQueryClient();

  // Convert existing effort from man-months to display unit for editing
  const initialEffort = phase?.estimatedEffort
    ? convertEffort(phase.estimatedEffort, 'man-month', effortUnit, workSettings)
    : 0;

  const [formData, setFormData] = useState({
    name: phase?.name || '',
    startDate: phase?.startDate ? phase.startDate.split('T')[0] : '',
    endDate: phase?.endDate ? phase.endDate.split('T')[0] : '',
    estimatedEffort: initialEffort,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: Partial<Phase>) => phaseApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Phase>) => phaseApi.update(phase!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['phase', phase!.id] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      onSuccess();
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = 'Phase name is required';
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

    const baseData = {
      ...formData,
      estimatedEffort: effortInManMonths,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
    };

    if (phase) {
      // Don't send projectId when updating
      updateMutation.mutate(baseData);
    } else {
      // Send projectId only when creating
      createMutation.mutate({ projectId, ...baseData });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Convert estimatedEffort to number
    const finalValue = name === 'estimatedEffort' ? parseFloat(value) || 0 : value;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phase Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          list="phase-suggestions"
          placeholder="Enter phase name or select from suggestions"
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          disabled={isLoading}
          required
        />
        <datalist id="phase-suggestions">
          {PHASE_SUGGESTIONS.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Type a custom name or select from common phases
        </p>
      </div>

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
          {phase ? 'Update Phase' : 'Create Phase'}
        </Button>
      </div>
    </form>
  );
};
