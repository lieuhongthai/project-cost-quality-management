import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi } from '@/services/api';
import { Modal, Button, Input, DateInput } from '@/components/common';
import { Select } from '@/components/common/FormFields';
import type { StageOverviewData, StageStatus } from '@/types';

interface StageEditModalProps {
  stage: StageOverviewData;
  onClose: (saved?: boolean) => void;
}

export function StageEditModal({ stage, onClose }: StageEditModalProps) {
  const { t } = useTranslation();

  // Form state
  const [formData, setFormData] = useState({
    startDate: stage.startDate || '',
    endDate: stage.endDate || '',
    actualStartDate: stage.actualStartDate || '',
    actualEndDate: stage.actualEndDate || '',
    estimatedEffort: stage.estimatedEffort || 0,
    actualEffort: stage.actualEffort || 0,
    status: stage.status || 'Good',
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      taskWorkflowApi.updateStage(stage.id, {
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        actualStartDate: data.actualStartDate || undefined,
        actualEndDate: data.actualEndDate || undefined,
        estimatedEffort: data.estimatedEffort || undefined,
        actualEffort: data.actualEffort || undefined,
        status: data.status as StageStatus,
      }),
    onSuccess: () => {
      onClose(true);
    },
  });

  // Handle form field change
  const handleChange = (field: keyof typeof formData, value: string | number) => {
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
    updateMutation.mutate(formData);
  };

  // Status options for Select
  const statusOptions = [
    { value: 'Good', label: t('status.good') },
    { value: 'Warning', label: t('status.warning') },
    { value: 'At Risk', label: t('status.atRisk') },
  ];

  return (
    <Modal
      isOpen
      onClose={() => onClose()}
      title={t('stages.editStage')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Stage Name (readonly) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('stages.stageName')}
          </label>
          <Input
            value={stage.name}
            disabled
            className="bg-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('stages.stageNameReadonly')}
          </p>
        </div>

        {/* Dates Section */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">{t('stages.scheduleDates')}</h4>
          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label={t('stages.estimatedStartDate')}
              name="startDate"
              value={formData.startDate}
              onChange={handleDateChange('startDate')}
            />
            <DateInput
              label={t('stages.estimatedEndDate')}
              name="endDate"
              value={formData.endDate}
              onChange={handleDateChange('endDate')}
            />
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

        {/* Effort Section */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">{t('stages.effort')}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('stages.estimatedEffort')} ({t('common.hours')})
              </label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={formData.estimatedEffort}
                onChange={(e) => handleChange('estimatedEffort', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('stages.actualEffort')} ({t('common.hours')})
              </label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={formData.actualEffort}
                onChange={(e) => handleChange('actualEffort', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        {/* Status Section */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">{t('stages.manualStatus')}</h4>
          <div>
            <Select
              label={t('stages.status')}
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              options={statusOptions}
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('stages.statusAutoCalculated')}
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="border-t pt-4 bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">{t('stages.progress')}:</span>
              <span className="ml-1 font-medium">{stage.progress}%</span>
            </div>
            <div>
              <span className="text-gray-500">{t('stages.steps')}:</span>
              <span className="ml-1 font-medium">{stage.stepsCount}</span>
            </div>
            <div>
              <span className="text-gray-500">{t('stages.linkedScreens')}:</span>
              <span className="ml-1 font-medium">{stage.linkedScreensCount}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
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
