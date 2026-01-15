import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { phaseScreenFunctionApi } from '@/services/api';
import { Button, Input, Select, TextArea } from '../common';
import type { PhaseScreenFunction, PhaseScreenFunctionStatus } from '@/types';

interface PhaseScreenFunctionFormProps {
  phaseId: number;
  phaseScreenFunction: PhaseScreenFunction;
  onSuccess: () => void;
  onCancel: () => void;
}

const STATUS_OPTIONS: { value: PhaseScreenFunctionStatus; label: string }[] = [
  { value: 'Not Started', label: 'Not Started' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Skipped', label: 'Skipped' },
];

export const PhaseScreenFunctionForm: React.FC<PhaseScreenFunctionFormProps> = ({
  phaseId,
  phaseScreenFunction,
  onSuccess,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    estimatedEffort: phaseScreenFunction.estimatedEffort || 0,
    actualEffort: phaseScreenFunction.actualEffort || 0,
    progress: phaseScreenFunction.progress || 0,
    status: phaseScreenFunction.status || 'Not Started' as PhaseScreenFunctionStatus,
    note: phaseScreenFunction.note || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateMutation = useMutation({
    mutationFn: (data: Partial<PhaseScreenFunction>) =>
      phaseScreenFunctionApi.update(phaseScreenFunction.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phaseScreenFunctions', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['phaseScreenFunctionSummary', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['screenFunction', phaseScreenFunction.screenFunctionId] });
      onSuccess();
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (formData.estimatedEffort < 0) {
      newErrors.estimatedEffort = 'Estimated effort cannot be negative';
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

    updateMutation.mutate({
      estimatedEffort: Number(formData.estimatedEffort) || 0,
      actualEffort: Number(formData.actualEffort) || 0,
      progress: Number(formData.progress) || 0,
      status: formData.status,
      note: formData.note,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numericFields = ['estimatedEffort', 'actualEffort', 'progress'];
    const finalValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Auto-calculate progress when actual effort changes
  const handleActualEffortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const actualEffort = parseFloat(e.target.value) || 0;
    const estimatedEffort = formData.estimatedEffort;

    let newProgress = formData.progress;
    let newStatus = formData.status;

    if (estimatedEffort > 0) {
      newProgress = Math.min(100, Math.round((actualEffort / estimatedEffort) * 100));
    }

    if (newProgress >= 100) {
      newStatus = 'Completed';
    } else if (actualEffort > 0) {
      newStatus = 'In Progress';
    }

    setFormData((prev) => ({
      ...prev,
      actualEffort,
      progress: newProgress,
      status: newStatus,
    }));
  };

  const isLoading = updateMutation.isPending;

  const screenFunctionName = phaseScreenFunction.screenFunction?.name || 'Unknown';
  const screenFunctionType = phaseScreenFunction.screenFunction?.type || 'Screen';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-3 rounded-lg mb-4">
        <p className="text-sm text-gray-500">Screen/Function</p>
        <p className="font-medium">
          {screenFunctionName}
          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
            {screenFunctionType}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Estimated Effort (Man-Hours)"
          name="estimatedEffort"
          type="number"
          step="0.5"
          min="0"
          value={formData.estimatedEffort}
          onChange={handleChange}
          error={errors.estimatedEffort}
          disabled={isLoading}
        />

        <Input
          label="Actual Effort (Man-Hours)"
          name="actualEffort"
          type="number"
          step="0.5"
          min="0"
          value={formData.actualEffort}
          onChange={handleActualEffortChange}
          error={errors.actualEffort}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Progress (%)"
          name="progress"
          type="number"
          step="1"
          min="0"
          max="100"
          value={formData.progress}
          onChange={handleChange}
          error={errors.progress}
          disabled={isLoading}
        />

        <Select
          label="Status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          options={STATUS_OPTIONS}
          disabled={isLoading}
        />
      </div>

      {/* Variance indicator */}
      {formData.estimatedEffort > 0 && (
        <div className={`p-2 rounded text-sm ${
          formData.actualEffort > formData.estimatedEffort
            ? 'bg-red-50 text-red-700'
            : 'bg-green-50 text-green-700'
        }`}>
          Variance: {(formData.actualEffort - formData.estimatedEffort).toFixed(1)} hours
          ({formData.estimatedEffort > 0
            ? (((formData.actualEffort - formData.estimatedEffort) / formData.estimatedEffort) * 100).toFixed(1)
            : 0}%)
        </div>
      )}

      <TextArea
        label="Note"
        name="note"
        value={formData.note}
        onChange={handleChange}
        placeholder="Add any notes for this phase..."
        rows={2}
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
          Update
        </Button>
      </div>
    </form>
  );
};
