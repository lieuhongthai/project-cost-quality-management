import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { screenFunctionApi } from '@/services/api';
import { Button, Input, Select, TextArea } from '../common';
import type { ScreenFunction, ScreenFunctionType, Priority, Complexity } from '@/types';

interface ScreenFunctionFormProps {
  projectId: number;
  screenFunction?: ScreenFunction;
  onSuccess: () => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: { value: ScreenFunctionType; label: string }[] = [
  { value: 'Screen', label: 'Screen' },
  { value: 'Function', label: 'Function' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

const COMPLEXITY_OPTIONS: { value: Complexity; label: string }[] = [
  { value: 'Simple', label: 'Simple' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Complex', label: 'Complex' },
];

export const ScreenFunctionForm: React.FC<ScreenFunctionFormProps> = ({
  projectId,
  screenFunction,
  onSuccess,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: screenFunction?.name || '',
    type: screenFunction?.type || 'Screen' as ScreenFunctionType,
    description: screenFunction?.description || '',
    priority: screenFunction?.priority || 'Medium' as Priority,
    complexity: screenFunction?.complexity || 'Medium' as Complexity,
    estimatedEffort: screenFunction?.estimatedEffort || 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: Partial<ScreenFunction>) => screenFunctionApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screenFunctions', projectId] });
      queryClient.invalidateQueries({ queryKey: ['screenFunctionSummary', projectId] });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ScreenFunction>) => screenFunctionApi.update(screenFunction!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screenFunctions', projectId] });
      queryClient.invalidateQueries({ queryKey: ['screenFunction', screenFunction!.id] });
      queryClient.invalidateQueries({ queryKey: ['screenFunctionSummary', projectId] });
      onSuccess();
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.type) {
      newErrors.type = 'Type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const submitData = {
      ...formData,
      estimatedEffort: Number(formData.estimatedEffort) || 0,
    };

    if (screenFunction) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate({ projectId, ...submitData });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const finalValue = name === 'estimatedEffort' ? parseFloat(value) || 0 : value;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        placeholder="Enter screen/function name"
        required
        disabled={isLoading}
      />

      <div className="grid grid-cols-3 gap-4">
        <Select
          label="Type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          options={TYPE_OPTIONS}
          error={errors.type}
          required
          disabled={isLoading}
        />

        <Select
          label="Priority"
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          options={PRIORITY_OPTIONS}
          disabled={isLoading}
        />

        <Select
          label="Complexity"
          name="complexity"
          value={formData.complexity}
          onChange={handleChange}
          options={COMPLEXITY_OPTIONS}
          disabled={isLoading}
        />
      </div>

      <Input
        label="Estimated Effort (Man-Hours)"
        name="estimatedEffort"
        type="number"
        step="0.5"
        min="0"
        value={formData.estimatedEffort}
        onChange={handleChange}
        placeholder="Total estimated effort across all phases"
        disabled={isLoading}
      />

      <TextArea
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Describe the screen/function..."
        rows={3}
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
          {screenFunction ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
};
