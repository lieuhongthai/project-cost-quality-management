import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { phaseApi } from '@/services/api';
import { Button, Input, DateInput, Select } from '../common';
import type { Phase, PhaseType } from '@/types';

interface PhaseFormProps {
  projectId: number;
  phase?: Phase;
  onSuccess: () => void;
  onCancel: () => void;
}

const PHASE_OPTIONS: { value: PhaseType; label: string }[] = [
  { value: 'Functional Design', label: 'Functional Design' },
  { value: 'Coding', label: 'Coding' },
  { value: 'Unit Test', label: 'Unit Test' },
  { value: 'Integration Test', label: 'Integration Test' },
  { value: 'System Test', label: 'System Test' },
];

export const PhaseForm: React.FC<PhaseFormProps> = ({
  projectId,
  phase,
  onSuccess,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: phase?.name || ('' as PhaseType),
    startDate: phase?.startDate ? phase.startDate.split('T')[0] : '',
    endDate: phase?.endDate ? phase.endDate.split('T')[0] : '',
    estimatedEffort: phase?.estimatedEffort || 0,
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

    const baseData = {
      ...formData,
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
      <Select
        label="Phase Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        options={PHASE_OPTIONS}
        error={errors.name}
        required
        disabled={isLoading || !!phase}
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
        label="Estimated Effort (Man-Months)"
        name="estimatedEffort"
        type="number"
        step="0.1"
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
