import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportApi, projectApi, phaseApi } from '@/services/api';
import { Button, Input, Select } from '../common';
import type { Report } from '@/types';

interface ReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const SCOPE_OPTIONS = [
  { value: 'Project', label: 'Project Report' },
  { value: 'Phase', label: 'Phase Report' },
  { value: 'Weekly', label: 'Weekly Report' },
];

export const ReportForm: React.FC<ReportFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    projectId: 0,
    scope: 'Project' as 'Weekly' | 'Phase' | 'Project',
    phaseId: 0,
    weekNumber: 1,
    year: new Date().getFullYear(),
    title: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectApi.getAll();
      return response.data;
    },
  });

  const { data: phases } = useQuery({
    queryKey: ['phases', formData.projectId],
    queryFn: async () => {
      if (!formData.projectId) return [];
      const response = await phaseApi.getByProject(formData.projectId);
      return response.data;
    },
    enabled: !!formData.projectId && (formData.scope === 'Phase' || formData.scope === 'Weekly'),
  });

  // Auto-generate title based on selection
  useEffect(() => {
    if (!formData.projectId) return;

    const project = projects?.find(p => p.id === formData.projectId);
    if (!project) return;

    let title = '';
    if (formData.scope === 'Project') {
      title = `${project.name} - Project Report`;
    } else if (formData.scope === 'Phase' && formData.phaseId) {
      const phase = phases?.find(p => p.id === formData.phaseId);
      if (phase) {
        title = `${project.name} - ${phase.name} Report`;
      }
    } else if (formData.scope === 'Weekly' && formData.phaseId) {
      const phase = phases?.find(p => p.id === formData.phaseId);
      if (phase) {
        title = `${project.name} - ${phase.name} - Week ${formData.weekNumber}, ${formData.year}`;
      }
    }

    if (title) {
      setFormData(prev => ({ ...prev, title }));
    }
  }, [formData.projectId, formData.scope, formData.phaseId, formData.weekNumber, formData.year, projects, phases]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Report>) => reportApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      onSuccess();
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectId) {
      newErrors.projectId = 'Project is required';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if ((formData.scope === 'Phase' || formData.scope === 'Weekly') && !formData.phaseId) {
      newErrors.phaseId = 'Phase is required for Phase and Weekly reports';
    }

    if (formData.scope === 'Weekly') {
      if (formData.weekNumber < 1 || formData.weekNumber > 53) {
        newErrors.weekNumber = 'Week number must be between 1 and 53';
      }
      if (formData.year < 2000) {
        newErrors.year = 'Please enter a valid year';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const phase = phases?.find(p => p.id === formData.phaseId);

    const submitData: any = {
      projectId: formData.projectId,
      scope: formData.scope,
      reportDate: new Date().toISOString(),
      title: formData.title,
    };

    if (formData.scope === 'Phase' || formData.scope === 'Weekly') {
      submitData.phaseName = phase?.name;
    }

    if (formData.scope === 'Weekly') {
      submitData.weekNumber = formData.weekNumber;
      submitData.year = formData.year;
    }

    createMutation.mutate(submitData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue: any = value;

    if (name === 'projectId' || name === 'phaseId' || name === 'weekNumber' || name === 'year') {
      finalValue = parseInt(value) || 0;
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const isLoading = createMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Project"
        name="projectId"
        value={formData.projectId}
        onChange={handleChange}
        options={projects?.map(p => ({ value: p.id, label: p.name })) || []}
        error={errors.projectId}
        required
        disabled={isLoading}
      />

      <Select
        label="Report Scope"
        name="scope"
        value={formData.scope}
        onChange={handleChange}
        options={SCOPE_OPTIONS}
        error={errors.scope}
        required
        disabled={isLoading}
      />

      {(formData.scope === 'Phase' || formData.scope === 'Weekly') && formData.projectId > 0 && (
        <Select
          label="Phase"
          name="phaseId"
          value={formData.phaseId}
          onChange={handleChange}
          options={phases?.map(p => ({ value: p.id, label: p.name })) || []}
          error={errors.phaseId}
          required
          disabled={isLoading}
        />
      )}

      {formData.scope === 'Weekly' && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Week Number"
            name="weekNumber"
            type="number"
            min="1"
            max="53"
            value={formData.weekNumber}
            onChange={handleChange}
            error={errors.weekNumber}
            required
            disabled={isLoading}
          />

          <Input
            label="Year"
            name="year"
            type="number"
            min="2000"
            value={formData.year}
            onChange={handleChange}
            error={errors.year}
            required
            disabled={isLoading}
          />
        </div>
      )}

      <Input
        label="Report Title"
        name="title"
        type="text"
        value={formData.title}
        onChange={handleChange}
        error={errors.title}
        required
        disabled={isLoading}
        helperText="Auto-generated based on your selection, but you can customize it"
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
          Generate Report
        </Button>
      </div>
    </form>
  );
};
