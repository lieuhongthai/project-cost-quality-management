import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi, projectApi } from '@/services/api';
import { Modal, Button, Input, DateInput } from '@/components/common';
import { Select } from '@/components/common/FormFields';
import type { StageOverviewData, StageStatus, EffortUnit, ProjectSettings } from '@/types';
import { convertEffort, EFFORT_UNIT_LABELS } from '@/utils/effortUtils';
import { DEFAULT_NON_WORKING_DAYS } from '@/types';
import { format } from 'date-fns';

interface StageEditModalProps {
  stage: StageOverviewData;
  projectId: number;
  effortUnit?: EffortUnit;
  workSettings?: Partial<ProjectSettings>;
  onClose: (saved?: boolean) => void;
}

export function StageEditModal({
  stage,
  projectId,
  effortUnit = 'man-hour',
  workSettings,
  onClose,
}: StageEditModalProps) {
  const { t } = useTranslation();

  // Convert effort from hours (stored) to display unit for editing
  const initialEstimatedEffort = stage.estimatedEffort
    ? convertEffort(stage.estimatedEffort, 'man-hour', effortUnit, workSettings)
    : 0;
  const initialActualEffort = stage.actualEffort
    ? convertEffort(stage.actualEffort, 'man-hour', effortUnit, workSettings)
    : 0;

  // Form state
  const [formData, setFormData] = useState({
    startDate: stage.startDate || '',
    endDate: stage.endDate || '',
    actualStartDate: stage.actualStartDate || '',
    actualEndDate: stage.actualEndDate || '',
    estimatedEffort: initialEstimatedEffort,
    actualEffort: initialActualEffort,
    status: stage.status || 'Good',
  });

  // Suggested date states
  const [suggestedEndDate, setSuggestedEndDate] = useState<string | null>(null);
  const [suggestedActualEndDate, setSuggestedActualEndDate] = useState<string | null>(null);
  const [isCalculatingEnd, setIsCalculatingEnd] = useState(false);
  const [isCalculatingActualEnd, setIsCalculatingActualEnd] = useState(false);
  const [showEstSuggestion, setShowEstSuggestion] = useState(false);
  const [showActSuggestion, setShowActSuggestion] = useState(false);
  const [estSuggestionUsed, setEstSuggestionUsed] = useState(false);
  const [actSuggestionUsed, setActSuggestionUsed] = useState(false);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      // Convert effort back to hours for storage
      const estimatedEffortHours = convertEffort(
        data.estimatedEffort,
        effortUnit,
        'man-hour',
        workSettings
      );
      const actualEffortHours = convertEffort(
        data.actualEffort,
        effortUnit,
        'man-hour',
        workSettings
      );

      return taskWorkflowApi.updateStage(stage.id, {
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        actualStartDate: data.actualStartDate || undefined,
        actualEndDate: data.actualEndDate || undefined,
        estimatedEffort: estimatedEffortHours || undefined,
        actualEffort: actualEffortHours || undefined,
        status: data.status as StageStatus,
      });
    },
    onSuccess: () => {
      onClose(true);
    },
  });

  // Calculate suggested end date for estimated dates
  const calculateSuggestedEndDate = useCallback(async () => {
    if (!formData.startDate || formData.estimatedEffort <= 0) {
      setSuggestedEndDate(null);
      return;
    }

    setIsCalculatingEnd(true);
    try {
      // Convert effort to man-days for calculation
      const effortInDays = convertEffort(
        formData.estimatedEffort,
        effortUnit,
        'man-day',
        workSettings
      );

      const wholeDays = Math.ceil(effortInDays);
      if (wholeDays <= 0) {
        setSuggestedEndDate(null);
        return;
      }

      const response = await projectApi.calculateEndDate({
        startDate: formData.startDate,
        estimatedEffortDays: wholeDays,
        projectId: projectId,
        nonWorkingDays: workSettings?.nonWorkingDays || DEFAULT_NON_WORKING_DAYS,
        holidays: workSettings?.holidays || [],
      });

      setSuggestedEndDate(response.data.endDate);
    } catch (error) {
      console.error('Error calculating end date:', error);
      setSuggestedEndDate(null);
    } finally {
      setIsCalculatingEnd(false);
    }
  }, [formData.startDate, formData.estimatedEffort, effortUnit, workSettings, projectId]);

  // Calculate suggested end date for actual dates
  const calculateSuggestedActualEndDate = useCallback(async () => {
    if (!formData.actualStartDate || formData.actualEffort <= 0) {
      setSuggestedActualEndDate(null);
      return;
    }

    setIsCalculatingActualEnd(true);
    try {
      // Convert effort to man-days for calculation
      const effortInDays = convertEffort(
        formData.actualEffort,
        effortUnit,
        'man-day',
        workSettings
      );

      const wholeDays = Math.ceil(effortInDays);
      if (wholeDays <= 0) {
        setSuggestedActualEndDate(null);
        return;
      }

      const response = await projectApi.calculateEndDate({
        startDate: formData.actualStartDate,
        estimatedEffortDays: wholeDays,
        projectId: projectId,
        nonWorkingDays: workSettings?.nonWorkingDays || DEFAULT_NON_WORKING_DAYS,
        holidays: workSettings?.holidays || [],
      });

      setSuggestedActualEndDate(response.data.endDate);
    } catch (error) {
      console.error('Error calculating actual end date:', error);
      setSuggestedActualEndDate(null);
    } finally {
      setIsCalculatingActualEnd(false);
    }
  }, [formData.actualStartDate, formData.actualEffort, effortUnit, workSettings, projectId]);

  // Calculate suggestion when start date or effort changes
  useEffect(() => {
    if (!showEstSuggestion) return;
    const debounceTimer = setTimeout(() => {
      calculateSuggestedEndDate();
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [calculateSuggestedEndDate, showEstSuggestion]);

  useEffect(() => {
    if (!showActSuggestion) return;
    const debounceTimer = setTimeout(() => {
      calculateSuggestedActualEndDate();
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [calculateSuggestedActualEndDate, showActSuggestion]);

  // Handle form field change
  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Show suggestion when start date or effort changes
    if (field === 'startDate' || field === 'estimatedEffort') {
      setShowEstSuggestion(true);
      setEstSuggestionUsed(false);
    }
    if (field === 'actualStartDate' || field === 'actualEffort') {
      setShowActSuggestion(true);
      setActSuggestionUsed(false);
    }
  };

  // Handle date change from DateInput
  const handleDateChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(field, e.target.value);
  };

  // Use suggested dates
  const useEstSuggestedDate = () => {
    if (suggestedEndDate) {
      setFormData((prev) => ({ ...prev, endDate: suggestedEndDate }));
      setEstSuggestionUsed(true);
    }
  };

  const useActSuggestedDate = () => {
    if (suggestedActualEndDate) {
      setFormData((prev) => ({ ...prev, actualEndDate: suggestedActualEndDate }));
      setActSuggestionUsed(true);
    }
  };

  // Format suggested date for display
  const formatSuggestedDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy (EEEE)');
    } catch {
      return dateStr;
    }
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

  // Get effort unit label
  const unitLabel = EFFORT_UNIT_LABELS[effortUnit];

  // Calculate working days for display
  const estWorkingDays = Math.ceil(convertEffort(formData.estimatedEffort, effortUnit, 'man-day', workSettings));
  const actWorkingDays = Math.ceil(convertEffort(formData.actualEffort, effortUnit, 'man-day', workSettings));

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
                {t('stages.estimatedEffort')} ({unitLabel})
              </label>
              <Input
                type="number"
                min={0}
                step="any"
                value={formData.estimatedEffort}
                onChange={(e) => handleChange('estimatedEffort', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('stages.actualEffort')} ({unitLabel})
              </label>
              <Input
                type="number"
                min={0}
                step="any"
                value={formData.actualEffort}
                onChange={(e) => handleChange('actualEffort', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Suggested End Date for Estimated */}
          {showEstSuggestion && formData.startDate && formData.estimatedEffort > 0 && (
            <div className={`mt-3 p-3 rounded-lg border transition-colors ${
              estSuggestionUsed
                ? 'bg-green-50 border-green-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className={`text-sm font-medium ${estSuggestionUsed ? 'text-green-700' : 'text-blue-700'}`}>
                    {estSuggestionUsed
                      ? t('stages.endDateApplied')
                      : t('stages.suggestedEndDate')}
                  </p>
                  {isCalculatingEnd ? (
                    <p className="text-sm text-blue-600">{t('common.loading')}</p>
                  ) : suggestedEndDate ? (
                    <p className={`text-lg font-semibold ${estSuggestionUsed ? 'text-green-800' : 'text-blue-800'}`}>
                      {formatSuggestedDate(suggestedEndDate)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">{t('stages.unableToCalculate')}</p>
                  )}
                  <p className={`text-xs mt-1 ${estSuggestionUsed ? 'text-green-500' : 'text-blue-500'}`}>
                    {t('stages.basedOnWorkingDays', { days: estWorkingDays })}
                  </p>
                </div>
                {suggestedEndDate && !estSuggestionUsed && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={useEstSuggestedDate}
                    disabled={isCalculatingEnd}
                  >
                    {t('stages.useThisDate')}
                  </Button>
                )}
                {estSuggestionUsed && (
                  <span className="text-green-600 text-sm font-medium">{t('common.applied')}</span>
                )}
              </div>
            </div>
          )}

          {/* Suggested End Date for Actual */}
          {showActSuggestion && formData.actualStartDate && formData.actualEffort > 0 && (
            <div className={`mt-3 p-3 rounded-lg border transition-colors ${
              actSuggestionUsed
                ? 'bg-green-50 border-green-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className={`text-sm font-medium ${actSuggestionUsed ? 'text-green-700' : 'text-blue-700'}`}>
                    {actSuggestionUsed
                      ? t('stages.actualEndDateApplied')
                      : t('stages.suggestedActualEndDate')}
                  </p>
                  {isCalculatingActualEnd ? (
                    <p className="text-sm text-blue-600">{t('common.loading')}</p>
                  ) : suggestedActualEndDate ? (
                    <p className={`text-lg font-semibold ${actSuggestionUsed ? 'text-green-800' : 'text-blue-800'}`}>
                      {formatSuggestedDate(suggestedActualEndDate)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">{t('stages.unableToCalculate')}</p>
                  )}
                  <p className={`text-xs mt-1 ${actSuggestionUsed ? 'text-green-500' : 'text-blue-500'}`}>
                    {t('stages.basedOnWorkingDays', { days: actWorkingDays })}
                  </p>
                </div>
                {suggestedActualEndDate && !actSuggestionUsed && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={useActSuggestedDate}
                    disabled={isCalculatingActualEnd}
                  >
                    {t('stages.useThisDate')}
                  </Button>
                )}
                {actSuggestionUsed && (
                  <span className="text-green-600 text-sm font-medium">{t('common.applied')}</span>
                )}
              </div>
            </div>
          )}
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
