import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { phaseApi, projectApi } from '@/services/api';
import { Button, Input, DateInput } from '../common';
import type { Phase, EffortUnit, ProjectSettings } from '@/types';
import { EFFORT_UNIT_FULL_LABELS, convertEffort } from '@/utils/effortUtils';
import { DEFAULT_NON_WORKING_DAYS } from '@/types';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Convert existing effort from man-months to display unit for editing
  const initialEffort = phase?.estimatedEffort
    ? convertEffort(phase.estimatedEffort, 'man-month', effortUnit, workSettings)
    : 0;

  const [formData, setFormData] = useState({
    name: phase?.name || '',
    startDate: phase?.startDate ? phase.startDate.split('T')[0] : '',
    endDate: phase?.endDate ? phase.endDate.split('T')[0] : '',
    actualStartDate: phase?.actualStartDate ? phase.actualStartDate.split('T')[0] : '',
    actualEndDate: phase?.actualEndDate ? phase.actualEndDate.split('T')[0] : '',
    estimatedEffort: initialEffort,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Suggested end date (shown as reference, not auto-filled)
  const [suggestedEndDate, setSuggestedEndDate] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionUsed, setSuggestionUsed] = useState(false);

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

  // Calculate suggested end date
  const calculateSuggestedEndDate = useCallback(async () => {
    if (!formData.startDate || formData.estimatedEffort <= 0) {
      setSuggestedEndDate(null);
      return;
    }

    setIsCalculating(true);
    try {
      // Convert effort to man-days for calculation
      const effortInDays = convertEffort(
        formData.estimatedEffort,
        effortUnit,
        'man-day',
        workSettings
      );

      // Round to whole days
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
      setIsCalculating(false);
    }
  }, [formData.startDate, formData.estimatedEffort, effortUnit, workSettings, projectId]);

  // Calculate suggestion when start date or effort changes
  useEffect(() => {
    if (!showSuggestion) return;

    const debounceTimer = setTimeout(() => {
      calculateSuggestedEndDate();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [calculateSuggestedEndDate, showSuggestion]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = t('phase.validation.nameRequired');
    }

    if (!formData.startDate) {
      newErrors.startDate = t('phase.validation.startDateRequired');
    }

    if (formData.estimatedEffort <= 0) {
      newErrors.estimatedEffort = t('phase.validation.estimatedEffortPositive');
    }

    if (formData.endDate && formData.startDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        newErrors.endDate = t('phase.validation.endDateAfterStart');
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
      actualStartDate: formData.actualStartDate ? new Date(formData.actualStartDate).toISOString() : undefined,
      actualEndDate: formData.actualEndDate ? new Date(formData.actualEndDate).toISOString() : undefined,
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

    // Show suggestion when start date or effort changes
    if (name === 'startDate' || name === 'estimatedEffort') {
      setShowSuggestion(true);
      setSuggestionUsed(false);
    }
  };

  // Use suggested end date
  const useSuggestedDate = () => {
    if (suggestedEndDate) {
      setFormData((prev) => {
        return { ...prev, endDate: suggestedEndDate };
      });
      setSuggestionUsed(true);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Format suggested date for display
  const formatSuggestedDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy (EEEE)');
    } catch {
      return dateStr;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('phase.name')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          list="phase-suggestions"
          placeholder={t('phase.form.namePlaceholder')}
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
          {t('phase.form.nameHelper')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DateInput
          label={t('phase.startDate')}
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          error={errors.startDate}
          required
          disabled={isLoading}
        />

        <DateInput
          label={t('phase.endDate')}
          name="endDate"
          value={formData.endDate}
          onChange={handleChange}
          error={errors.endDate}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DateInput
          label={t('phase.actualStartDate')}
          name="actualStartDate"
          value={formData.actualStartDate}
          onChange={handleChange}
          error={errors.actualStartDate}
          disabled={isLoading}
        />

        <DateInput
          label={t('phase.actualEndDate')}
          name="actualEndDate"
          value={formData.actualEndDate}
          onChange={handleChange}
          error={errors.actualEndDate}
          disabled={isLoading}
        />
      </div>

      <Input
        label={t('phase.form.estimatedEffortLabel', {
          unit: `${EFFORT_UNIT_FULL_LABELS[effortUnit]}s`,
        })}
        name="estimatedEffort"
        type="number"
        step="0.01"
        value={formData.estimatedEffort}
        onChange={handleChange}
        error={errors.estimatedEffort}
        required
        disabled={isLoading}
      />

      {/* Suggested End Date - shown as reference (fixed height to prevent flickering) */}
      {showSuggestion && formData.startDate && formData.estimatedEffort > 0 && (
        <div className={`p-3 rounded-lg border transition-colors ${
          suggestionUsed
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200'
        }`} style={{ minHeight: '80px' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className={`text-sm font-medium ${suggestionUsed ? 'text-green-700' : 'text-blue-700'}`}>
                {suggestionUsed
                  ? t('phase.form.endDateApplied')
                  : t('phase.form.suggestedEndDate')}
              </p>
              {isCalculating ? (
                <p className="text-sm text-blue-600">{t('common.loading')}</p>
              ) : suggestedEndDate ? (
                <p className={`text-lg font-semibold ${suggestionUsed ? 'text-green-800' : 'text-blue-800'}`}>
                  {formatSuggestedDate(suggestedEndDate)}
                </p>
              ) : (
                <p className="text-sm text-gray-500">{t('phase.form.unableToCalculate')}</p>
              )}
              <p className={`text-xs mt-1 ${suggestionUsed ? 'text-green-500' : 'text-blue-500'}`}>
                {t('phase.form.suggestedEndDateHint', {
                  days: Math.ceil(convertEffort(formData.estimatedEffort, effortUnit, 'man-day', workSettings)),
                })}
              </p>
            </div>
            {suggestedEndDate && !suggestionUsed && (
              <Button
                type="button"
                size="sm"
                onClick={useSuggestedDate}
                disabled={isCalculating}
              >
                {t('phase.form.useSuggestedDate')}
              </Button>
            )}
            {suggestionUsed && (
              <span className="text-green-600 text-sm font-medium">{t('phase.form.applied')}</span>
            )}
          </div>
        </div>
      )}

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
          {phase ? t('phase.form.update') : t('phase.form.create')}
        </Button>
      </div>
    </form>
  );
};
