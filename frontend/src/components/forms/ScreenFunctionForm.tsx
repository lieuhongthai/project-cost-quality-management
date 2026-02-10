import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { screenFunctionApi, memberApi } from '@/services/api';
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
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch project members
  const { data: members } = useQuery({
    queryKey: ['members', projectId],
    queryFn: async () => {
      const response = await memberApi.getByProjectWithUser(projectId);
      return response.data;
    },
  });

  // Fetch existing default members when editing
  const { data: existingDefaultMembers } = useQuery({
    queryKey: ['sfDefaultMembers', screenFunction?.id],
    queryFn: async () => {
      const response = await screenFunctionApi.getDefaultMembers(screenFunction!.id);
      return response.data;
    },
    enabled: !!screenFunction,
  });

  // Initialize selected members when editing
  useEffect(() => {
    if (existingDefaultMembers) {
      setSelectedMemberIds(existingDefaultMembers.map(dm => dm.memberId));
    }
  }, [existingDefaultMembers]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<ScreenFunction>) => screenFunctionApi.create(data),
    onSuccess: async (response) => {
      const newSf = response.data;
      // Save default members for the new screen function
      if (selectedMemberIds.length > 0) {
        await screenFunctionApi.setDefaultMembers(newSf.id, selectedMemberIds);
      }
      queryClient.invalidateQueries({ queryKey: ['screenFunctions', projectId] });
      queryClient.invalidateQueries({ queryKey: ['screenFunctionSummary', projectId] });
      queryClient.invalidateQueries({ queryKey: ['sfDefaultMembers'] });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ScreenFunction>) => screenFunctionApi.update(screenFunction!.id, data),
    onSuccess: async () => {
      // Update default members
      await screenFunctionApi.setDefaultMembers(screenFunction!.id, selectedMemberIds);
      queryClient.invalidateQueries({ queryKey: ['screenFunctions', projectId] });
      queryClient.invalidateQueries({ queryKey: ['screenFunction', screenFunction!.id] });
      queryClient.invalidateQueries({ queryKey: ['screenFunctionSummary', projectId] });
      queryClient.invalidateQueries({ queryKey: ['sfDefaultMembers'] });
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

  const toggleMember = (memberId: number) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const activeMembers = members?.filter(m => m.status === 'Active') || [];

  const typeOptions: { value: ScreenFunctionType; label: string }[] = [
    { value: 'Screen', label: t('screenFunction.typeScreen') },
    { value: 'Function', label: t('screenFunction.typeFunction') },
    { value: 'Other', label: t('screenFunction.typeOther', { defaultValue: 'Other' }) },
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

      {/* Default Assignees */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('screenFunction.defaultAssignees', { defaultValue: 'Default Assignees' })}
        </label>
        <p className="text-xs text-gray-500 mb-2">
          {t('screenFunction.defaultAssigneesHint', { defaultValue: 'These members will be automatically assigned when using Quick Link.' })}
        </p>
        {activeMembers.length > 0 ? (
          <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
            {activeMembers.map(member => {
              const isChecked = selectedMemberIds.includes(member.id);
              return (
                <label
                  key={member.id}
                  className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${isChecked ? 'bg-indigo-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleMember(member.id)}
                    className="mr-3 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    disabled={isLoading}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">{member.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{member.role}</span>
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            {t('screenFunction.noActiveMembers', { defaultValue: 'No active members in this project.' })}
          </p>
        )}
        {selectedMemberIds.length > 0 && (
          <p className="text-xs text-indigo-600 mt-1">
            {selectedMemberIds.length} {t('screenFunction.membersSelected', { defaultValue: 'member(s) selected' })}
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
