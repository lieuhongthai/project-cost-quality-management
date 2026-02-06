import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { screenFunctionApi } from '@/services/api';
import { Button, Input, Select, TextArea } from '../common';
import type { ScreenFunction, ScreenFunctionType, Priority, Complexity, EffortUnit, ProjectSettings } from '@/types';
import { EFFORT_UNIT_FULL_LABELS, convertEffort } from '@/utils/effortUtils';
import { useTranslation } from 'react-i18next';

interface ScreenFunctionFormProps {
  projectId: number;
  screenFunction?: ScreenFunction;
  effortUnit?: EffortUnit;
  workSettings?: Partial<ProjectSettings>;
  nextDisplayOrder?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ScreenFunctionForm: React.FC<ScreenFunctionFormProps> = ({
  projectId,
  screenFunction,
  effortUnit = 'man-hour',
  workSettings,
  nextDisplayOrder = 1,
  onSuccess,
  onCancel,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Convert existing effort from man-hours to display unit for editing
  const initialEffort = screenFunction?.estimatedEffort
    ? convertEffort(screenFunction.estimatedEffort, 'man-hour', effortUnit, workSettings)
    : 0;

  const [formData, setFormData] = useState({
    name: screenFunction?.name || '',
    type: screenFunction?.type || 'Screen' as ScreenFunctionType,
    description: screenFunction?.description || '',
    priority: screenFunction?.priority || 'Medium' as Priority,
    complexity: screenFunction?.complexity || 'Medium' as Complexity,
    estimatedEffort: initialEffort,
    displayOrder: screenFunction?.displayOrder ?? nextDisplayOrder,
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
      newErrors.name = t('screenFunction.form.validation.nameRequired');
    }

    if (!formData.type) {
      newErrors.type = t('screenFunction.form.validation.typeRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Convert effort from display unit back to man-hours for storage
    const effortInManHours = convertEffort(
      formData.estimatedEffort,
      effortUnit,
      'man-hour',
      workSettings
    );

    const submitData = {
      ...formData,
      estimatedEffort: effortInManHours,
      displayOrder: formData.displayOrder,
    };

    if (screenFunction) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate({ projectId, ...submitData });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const finalValue = (name === 'estimatedEffort' || name === 'displayOrder') ? parseFloat(value) || 0 : value;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const typeOptions: { value: ScreenFunctionType; label: string }[] = [
    { value: 'Screen', label: t('screenFunction.typeScreen') },
    { value: 'Function', label: t('screenFunction.typeFunction') },
  ];

  const priorityOptions: { value: Priority; label: string }[] = [
    { value: 'High', label: t('screenFunction.priorityHigh') },
    { value: 'Medium', label: t('screenFunction.priorityMedium') },
    { value: 'Low', label: t('screenFunction.priorityLow') },
  ];

  const complexityOptions: { value: Complexity; label: string }[] = [
    { value: 'Simple', label: t('screenFunction.complexitySimple') },
    { value: 'Medium', label: t('screenFunction.complexityMedium') },
    { value: 'Complex', label: t('screenFunction.complexityComplex') },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label={t('screenFunction.name')}
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        placeholder={t('screenFunction.form.namePlaceholder')}
        required
        disabled={isLoading}
      />

      <div className="grid grid-cols-4 gap-4">
        <Select
          label={t('screenFunction.type')}
          name="type"
          value={formData.type}
          onChange={handleChange}
          options={typeOptions}
          error={errors.type}
          required
          disabled={isLoading}
        />

        <Input
          label={t('screenFunction.displayOrder', { defaultValue: 'Order' })}
          name="displayOrder"
          type="number"
          min="0"
          step="1"
          value={formData.displayOrder}
          onChange={handleChange}
          disabled={isLoading}
        />

        <Select
          label={t('screenFunction.priority')}
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          options={priorityOptions}
          disabled={isLoading}
        />

        <Select
          label={t('screenFunction.complexity')}
          name="complexity"
          value={formData.complexity}
          onChange={handleChange}
          options={complexityOptions}
          disabled={isLoading}
        />
      </div>

      <div>
        <Input
          label={t('screenFunction.form.estimatedEffortLabel', {
            unit: `${EFFORT_UNIT_FULL_LABELS[effortUnit]}s`,
          })}
          name="estimatedEffort"
          type="number"
          step="0.01"
          min="0"
          value={formData.estimatedEffort}
          onChange={handleChange}
          placeholder={t('screenFunction.form.estimatedEffortPlaceholder')}
          disabled={isLoading}
        />
        {screenFunction && screenFunction.actualEffort > 0 && (
          <p className="text-xs text-amber-600 mt-1">
            {t('screenFunction.form.effortComputedFromSteps', {
              defaultValue: 'Note: Effort, progress, and status are automatically computed from linked Stage/Step tasks.',
            })}
          </p>
        )}
      </div>

      <TextArea
        label={t('screenFunction.description')}
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder={t('screenFunction.form.descriptionPlaceholder')}
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
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading}
        >
          {screenFunction ? t('common.update') : t('common.create')}
        </Button>
      </div>
    </form>
  );
};
