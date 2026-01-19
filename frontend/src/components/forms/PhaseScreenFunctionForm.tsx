import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { phaseScreenFunctionApi, memberApi } from '@/services/api';
import { Button, Input, Select, TextArea } from '../common';
import type { PhaseScreenFunction, PhaseScreenFunctionStatus, EffortUnit, ProjectSettings } from '@/types';
import { EFFORT_UNIT_FULL_LABELS, EFFORT_UNIT_LABELS, convertEffort, formatEffort } from '@/utils/effortUtils';
import { useTranslation } from 'react-i18next';

interface PhaseScreenFunctionFormProps {
  phaseId: number;
  projectId: number;
  phaseScreenFunction: PhaseScreenFunction;
  effortUnit?: EffortUnit;
  workSettings?: Partial<ProjectSettings>;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PhaseScreenFunctionForm: React.FC<PhaseScreenFunctionFormProps> = ({
  phaseId,
  projectId,
  phaseScreenFunction,
  effortUnit = 'man-hour',
  workSettings,
  onSuccess,
  onCancel,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Convert existing effort from man-hours to display unit for editing
  const initialEstimated = phaseScreenFunction.estimatedEffort
    ? convertEffort(phaseScreenFunction.estimatedEffort, 'man-hour', effortUnit, workSettings)
    : 0;
  const initialActual = phaseScreenFunction.actualEffort
    ? convertEffort(phaseScreenFunction.actualEffort, 'man-hour', effortUnit, workSettings)
    : 0;

  const [formData, setFormData] = useState({
    estimatedEffort: initialEstimated,
    actualEffort: initialActual,
    progress: phaseScreenFunction.progress || 0,
    status: phaseScreenFunction.status || 'Not Started' as PhaseScreenFunctionStatus,
    note: phaseScreenFunction.note || '',
    assigneeId: phaseScreenFunction.assigneeId || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch project members for assignee dropdown
  const { data: members } = useQuery({
    queryKey: ['members', projectId],
    queryFn: async () => {
      const response = await memberApi.getByProject(projectId);
      return response.data;
    },
  });

  // Create member options for select dropdown
  const memberOptions = [
    { value: '', label: t('phase.detail.screenFunctions.unassigned') },
    ...(members?.filter(m => m.status === 'Active').map(m => ({
      value: String(m.id),
      label: `${m.name} (${m.role})`,
    })) || []),
  ];

  const updateMutation = useMutation({
    mutationFn: (data: Partial<PhaseScreenFunction>) =>
      phaseScreenFunctionApi.update(phaseScreenFunction.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phaseScreenFunctions', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['phaseScreenFunctionSummary', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['screenFunction', phaseScreenFunction.screenFunctionId] });
      queryClient.invalidateQueries({ queryKey: ['projectWorkload', projectId] });
      // Invalidate phase to update Progress and Actual Effort in header
      queryClient.invalidateQueries({ queryKey: ['phase', phaseId] });
      // Also invalidate project in case it cascades
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      onSuccess();
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (formData.estimatedEffort < 0) {
      newErrors.estimatedEffort = t('phaseScreenFunction.form.validation.estimatedNonNegative');
    }

    if (formData.actualEffort < 0) {
      newErrors.actualEffort = t('phaseScreenFunction.form.validation.actualNonNegative');
    }

    if (formData.progress < 0 || formData.progress > 100) {
      newErrors.progress = t('phaseScreenFunction.form.validation.progressRange');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Convert effort from display unit back to man-hours for storage
    const estimatedInManHours = convertEffort(
      formData.estimatedEffort,
      effortUnit,
      'man-hour',
      workSettings
    );
    const actualInManHours = convertEffort(
      formData.actualEffort,
      effortUnit,
      'man-hour',
      workSettings
    );

    updateMutation.mutate({
      estimatedEffort: estimatedInManHours,
      actualEffort: actualInManHours,
      progress: Number(formData.progress) || 0,
      status: formData.status,
      note: formData.note,
      assigneeId: formData.assigneeId ? Number(formData.assigneeId) : undefined,
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

  const screenFunctionName = phaseScreenFunction.screenFunction?.name || t('common.unknown');
  const screenFunctionType = phaseScreenFunction.screenFunction?.type || 'Screen';

  const statusOptions: { value: PhaseScreenFunctionStatus; label: string }[] = [
    { value: 'Not Started', label: t('screenFunction.statusNotStarted') },
    { value: 'In Progress', label: t('screenFunction.statusInProgress') },
    { value: 'Completed', label: t('screenFunction.statusCompleted') },
    { value: 'Skipped', label: t('screenFunction.statusSkipped') },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-3 rounded-lg mb-4">
        <p className="text-sm text-gray-500">{t('screenFunction.title')}</p>
        <p className="font-medium">
          {screenFunctionName}
          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
            {screenFunctionType === 'Screen' ? t('screenFunction.typeScreen') : t('screenFunction.typeFunction')}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('phaseScreenFunction.form.estimatedEffortLabel', {
            unit: `${EFFORT_UNIT_FULL_LABELS[effortUnit]}s`,
          })}
          name="estimatedEffort"
          type="number"
          step="0.01"
          min="0"
          value={formData.estimatedEffort}
          onChange={handleChange}
          error={errors.estimatedEffort}
          disabled={isLoading}
        />

        <Input
          label={t('phaseScreenFunction.form.actualEffortLabel', {
            unit: `${EFFORT_UNIT_FULL_LABELS[effortUnit]}s`,
          })}
          name="actualEffort"
          type="number"
          step="0.01"
          min="0"
          value={formData.actualEffort}
          onChange={handleActualEffortChange}
          error={errors.actualEffort}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('phaseScreenFunction.form.progress')}
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
          label={t('common.status')}
          name="status"
          value={formData.status}
          onChange={handleChange}
          options={statusOptions}
          disabled={isLoading}
        />
      </div>

      <Select
        label={t('screenFunction.assignee')}
        name="assigneeId"
        value={String(formData.assigneeId)}
        onChange={handleChange}
        options={memberOptions}
        disabled={isLoading}
      />

      {/* Variance indicator */}
      {formData.estimatedEffort > 0 && (
        <div className={`p-2 rounded text-sm ${
          formData.actualEffort > formData.estimatedEffort
            ? 'bg-red-50 text-red-700'
            : 'bg-green-50 text-green-700'
        }`}>
          {t('phaseScreenFunction.form.variance', {
            effort: `${formatEffort(formData.actualEffort - formData.estimatedEffort, effortUnit)} ${EFFORT_UNIT_LABELS[effortUnit]}`,
            percent: formData.estimatedEffort > 0
              ? (((formData.actualEffort - formData.estimatedEffort) / formData.estimatedEffort) * 100).toFixed(1)
              : '0',
          })}
        </div>
      )}

      <TextArea
        label={t('screenFunction.note')}
        name="note"
        value={formData.note}
        onChange={handleChange}
        placeholder={t('phaseScreenFunction.form.notePlaceholder')}
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
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading}
        >
          {t('common.update')}
        </Button>
      </div>
    </form>
  );
};
