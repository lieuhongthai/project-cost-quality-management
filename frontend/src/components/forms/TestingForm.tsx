import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { testingApi } from '@/services/api';
import { Button, Input, DateInput } from '../common';
import type { Testing } from '@/types';
import { addDays, startOfWeek } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface TestingFormProps {
  phaseId: number;
  testing?: Testing;
  onSuccess: () => void;
  onCancel: () => void;
}

export const TestingForm: React.FC<TestingFormProps> = ({
  phaseId,
  testing,
  onSuccess,
  onCancel,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    weekStartDate: testing?.weekStartDate ? testing.weekStartDate.split('T')[0] : '',
    totalTestCases: testing?.totalTestCases || 0,
    passedTestCases: testing?.passedTestCases || 0,
    failedTestCases: testing?.failedTestCases || 0,
    testingTime: testing?.testingTime || 0,
    defectsDetected: testing?.defectsDetected || 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: Partial<Testing>) => testingApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testing', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['testing-summary', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['phase', phaseId] });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Testing>) => testingApi.update(testing!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testing', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['testing-summary', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['phase', phaseId] });
      onSuccess();
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.weekStartDate) {
      newErrors.weekStartDate = t('testing.form.validation.weekStartRequired');
    }

    if (formData.totalTestCases <= 0) {
      newErrors.totalTestCases = t('testing.form.validation.totalTestCasesPositive');
    }

    if (formData.passedTestCases + formData.failedTestCases > formData.totalTestCases) {
      newErrors.passedTestCases = t('testing.form.validation.passFailTotal');
    }

    if (formData.testingTime < 0) {
      newErrors.testingTime = t('testing.form.validation.testingTimeNonNegative');
    }

    if (formData.defectsDetected < 0) {
      newErrors.defectsDetected = t('testing.form.validation.defectsNonNegative');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    if (testing) {
      // When updating, only send the editable fields
      const updateData = {
        totalTestCases: parseInt(formData.totalTestCases.toString()),
        passedTestCases: parseInt(formData.passedTestCases.toString()),
        failedTestCases: parseInt(formData.failedTestCases.toString()),
        testingTime: parseFloat(formData.testingTime.toString()),
        defectsDetected: parseInt(formData.defectsDetected.toString()),
      };
      updateMutation.mutate(updateData);
    } else {
      // When creating, send all required fields
      const weekStart = new Date(formData.weekStartDate);
      const weekEnd = addDays(weekStart, 6);
      const weekNumber = Math.ceil((weekStart.getTime() - startOfWeek(new Date(weekStart.getFullYear(), 0, 1)).getTime()) / (7 * 24 * 60 * 60 * 1000));

      const createData = {
        phaseId,
        weekNumber,
        year: weekStart.getFullYear(),
        weekStartDate: weekStart.toISOString(),
        weekEndDate: weekEnd.toISOString(),
        totalTestCases: parseInt(formData.totalTestCases.toString()),
        passedTestCases: parseInt(formData.passedTestCases.toString()),
        failedTestCases: parseInt(formData.failedTestCases.toString()),
        testingTime: parseFloat(formData.testingTime.toString()),
        defectsDetected: parseInt(formData.defectsDetected.toString()),
      };
      createMutation.mutate(createData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Convert number fields to actual numbers
    const intFields = ['totalTestCases', 'passedTestCases', 'failedTestCases', 'defectsDetected'];
    const floatFields = ['testingTime'];
    let finalValue: string | number = value;
    if (intFields.includes(name)) {
      finalValue = parseInt(value) || 0;
    } else if (floatFields.includes(name)) {
      finalValue = parseFloat(value) || 0;
    }
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DateInput
        label={t('testing.form.weekStartDate')}
        name="weekStartDate"
        value={formData.weekStartDate}
        onChange={handleChange}
        error={errors.weekStartDate}
        required
        disabled={isLoading || !!testing}
        helperText={t('testing.form.weekStartHelper')}
      />

      <Input
        label={t('testing.totalTestCases')}
        name="totalTestCases"
        type="number"
        value={formData.totalTestCases}
        onChange={handleChange}
        error={errors.totalTestCases}
        required
        disabled={isLoading}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('testing.passed')}
          name="passedTestCases"
          type="number"
          value={formData.passedTestCases}
          onChange={handleChange}
          error={errors.passedTestCases}
          disabled={isLoading}
        />

        <Input
          label={t('testing.failed')}
          name="failedTestCases"
          type="number"
          value={formData.failedTestCases}
          onChange={handleChange}
          disabled={isLoading}
        />
      </div>

      <Input
        label={t('testing.form.testingTimeHours')}
        name="testingTime"
        type="number"
        step="0.1"
        value={formData.testingTime}
        onChange={handleChange}
        error={errors.testingTime}
        disabled={isLoading}
      />

      <Input
        label={t('testing.defects')}
        name="defectsDetected"
        type="number"
        value={formData.defectsDetected}
        onChange={handleChange}
        error={errors.defectsDetected}
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
          {testing ? t('testing.form.update') : t('testing.form.add')}
        </Button>
      </div>
    </form>
  );
};
