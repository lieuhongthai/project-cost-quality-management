import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { testingApi } from '@/services/api';
import { Button, Input } from '../common';
import type { Testing } from '@/types';
import { addDays, startOfWeek } from 'date-fns';

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
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Testing>) => testingApi.update(testing!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testing', phaseId] });
      onSuccess();
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.weekStartDate) {
      newErrors.weekStartDate = 'Week start date is required';
    }

    if (formData.totalTestCases <= 0) {
      newErrors.totalTestCases = 'Total test cases must be greater than 0';
    }

    if (formData.passedTestCases + formData.failedTestCases > formData.totalTestCases) {
      newErrors.passedTestCases = 'Passed + Failed cannot exceed total test cases';
    }

    if (formData.testingTime < 0) {
      newErrors.testingTime = 'Testing time cannot be negative';
    }

    if (formData.defectsDetected < 0) {
      newErrors.defectsDetected = 'Defects detected cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const weekStart = new Date(formData.weekStartDate);
    const weekEnd = addDays(weekStart, 6);
    const weekNumber = Math.ceil((weekStart.getTime() - startOfWeek(new Date(weekStart.getFullYear(), 0, 1)).getTime()) / (7 * 24 * 60 * 60 * 1000));

    const submitData = {
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

    if (testing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Week Start Date"
        name="weekStartDate"
        type="date"
        value={formData.weekStartDate}
        onChange={handleChange}
        error={errors.weekStartDate}
        required
        disabled={isLoading || !!testing}
        helperText="Select the Monday of the week"
      />

      <Input
        label="Total Test Cases"
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
          label="Passed Test Cases"
          name="passedTestCases"
          type="number"
          value={formData.passedTestCases}
          onChange={handleChange}
          error={errors.passedTestCases}
          disabled={isLoading}
        />

        <Input
          label="Failed Test Cases"
          name="failedTestCases"
          type="number"
          value={formData.failedTestCases}
          onChange={handleChange}
          disabled={isLoading}
        />
      </div>

      <Input
        label="Testing Time (Hours)"
        name="testingTime"
        type="number"
        step="0.1"
        value={formData.testingTime}
        onChange={handleChange}
        error={errors.testingTime}
        disabled={isLoading}
      />

      <Input
        label="Defects Detected"
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
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading}
        >
          {testing ? 'Update Testing Data' : 'Add Testing Data'}
        </Button>
      </div>
    </form>
  );
};
