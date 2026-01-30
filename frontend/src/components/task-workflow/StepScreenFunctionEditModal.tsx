import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi } from '@/services/api';
import { Modal, Button, Input, DateInput } from '@/components/common';
import { Select, TextArea } from '@/components/common/FormFields';
import type { StepScreenFunctionStatus, Member, ScreenFunction } from '@/types';

interface StepScreenFunctionData {
  id: number;
  screenFunction?: ScreenFunction;
  assignee?: Member;
  estimatedEffort: number;
  actualEffort: number;
  progress: number;
  status: StepScreenFunctionStatus;
  note?: string;
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
}

interface StepScreenFunctionEditModalProps {
  data: StepScreenFunctionData;
  members: Member[];
  onClose: (saved?: boolean) => void;
}

export function StepScreenFunctionEditModal({
  data,
  members,
  onClose,
}: StepScreenFunctionEditModalProps) {
  const { t } = useTranslation();

  // Form state
  const [formData, setFormData] = useState({
    assigneeId: data.assignee?.id ?? null,
    estimatedEffort: data.estimatedEffort || 0,
    actualEffort: data.actualEffort || 0,
    progress: data.progress || 0,
    status: data.status || 'Not Started',
    note: data.note || '',
    estimatedStartDate: data.estimatedStartDate || '',
    estimatedEndDate: data.estimatedEndDate || '',
    actualStartDate: data.actualStartDate || '',
    actualEndDate: data.actualEndDate || '',
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: () =>
      taskWorkflowApi.updateStepScreenFunction(data.id, {
        assigneeId: formData.assigneeId ?? undefined,
        estimatedEffort: formData.estimatedEffort,
        actualEffort: formData.actualEffort,
        progress: formData.progress,
        status: formData.status as StepScreenFunctionStatus,
        note: formData.note || undefined,
        estimatedStartDate: formData.estimatedStartDate || undefined,
        estimatedEndDate: formData.estimatedEndDate || undefined,
        actualStartDate: formData.actualStartDate || undefined,
        actualEndDate: formData.actualEndDate || undefined,
      }),
    onSuccess: () => {
      onClose(true);
    },
  });

  // Handle form field change
  const handleChange = (field: keyof typeof formData, value: string | number | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle date change from DateInput
  const handleDateChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(field, e.target.value);
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  // Status options
  const statusOptions = [
    { value: 'Not Started', label: t('screenFunction.statusNotStarted') },
    { value: 'In Progress', label: t('screenFunction.statusInProgress') },
    { value: 'Completed', label: t('screenFunction.statusCompleted') },
    { value: 'Skipped', label: t('screenFunction.statusSkipped') },
  ];

  return (
    <Modal
      isOpen
      onClose={() => onClose()}
      title={t('stages.editScreenFunction')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Screen/Function Info (readonly) */}
        <div className="bg-gray-50 -mx-6 -mt-2 px-6 py-4 border-b">
          <h4 className="text-sm font-medium text-gray-500">{t('screenFunction.name')}</h4>
          <p className="mt-1 text-lg font-medium text-gray-900">
            {data.screenFunction?.name || t('common.unknown')}
          </p>
          <span className={`inline-flex mt-2 px-2 py-0.5 text-xs rounded ${
            data.screenFunction?.type === 'Screen'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {data.screenFunction?.type || '-'}
          </span>
        </div>

        {/* Assignee and Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('screenFunction.assignee')}
            </label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              value={formData.assigneeId ?? ''}
              onChange={(e) => handleChange('assigneeId', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t('stages.unassigned')}</option>
              {members?.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
          </div>
          <Select
            label={t('screenFunction.status')}
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            options={statusOptions}
          />
        </div>

        {/* Progress and Effort */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('screenFunction.progress')} (%)
            </label>
            <Input
              type="number"
              min={0}
              max={100}
              value={formData.progress}
              onChange={(e) => handleChange('progress', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('screenFunction.estimatedEffort')} (h)
            </label>
            <Input
              type="number"
              min={0}
              step="any"
              value={formData.estimatedEffort}
              onChange={(e) => handleChange('estimatedEffort', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('screenFunction.actualEffort')} (h)
            </label>
            <Input
              type="number"
              min={0}
              step="any"
              value={formData.actualEffort}
              onChange={(e) => handleChange('actualEffort', Number(e.target.value))}
            />
          </div>
        </div>

        {/* Estimated Dates */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">{t('stages.estimatedSchedule')}</h4>
          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label={t('stages.estimatedStartDate')}
              name="estimatedStartDate"
              value={formData.estimatedStartDate}
              onChange={handleDateChange('estimatedStartDate')}
            />
            <DateInput
              label={t('stages.estimatedEndDate')}
              name="estimatedEndDate"
              value={formData.estimatedEndDate}
              onChange={handleDateChange('estimatedEndDate')}
            />
          </div>
        </div>

        {/* Actual Dates */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">{t('stages.actualSchedule')}</h4>
          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label={t('stages.actualStartDate')}
              name="actualStartDate"
              value={formData.actualStartDate}
              onChange={handleDateChange('actualStartDate')}
            />
            <DateInput
              label={t('stages.actualEndDate')}
              name="actualEndDate"
              value={formData.actualEndDate}
              onChange={handleDateChange('actualEndDate')}
            />
          </div>
        </div>

        {/* Note */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('common.note')}
          </label>
          <TextArea
            value={formData.note}
            onChange={(e) => handleChange('note', e.target.value)}
            rows={3}
            placeholder={t('stages.notePlaceholder')}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onClose()}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>

        {/* Error display */}
        {updateMutation.isError && (
          <div className="text-red-600 text-sm mt-2">
            {t('common.error')}: {(updateMutation.error as Error).message}
          </div>
        )}
      </form>
    </Modal>
  );
}
