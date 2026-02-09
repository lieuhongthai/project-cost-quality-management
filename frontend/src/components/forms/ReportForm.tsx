import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportApi, projectApi, taskWorkflowApi } from '@/services/api';
import { Button, Input, Select } from '../common';
import type { Report } from '@/types';
import { useTranslation } from 'react-i18next';

interface ReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    projectId: 0,
    scope: 'Project' as 'Stage' | 'Project',
    stageId: 0,
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

  const { data: stages } = useQuery({
    queryKey: ['stages', formData.projectId],
    queryFn: async () => {
      if (!formData.projectId) return [];
      const response = await taskWorkflowApi.getStages(formData.projectId);
      return response.data;
    },
    enabled: !!formData.projectId && formData.scope === 'Stage',
  });

  // Auto-generate title based on selection
  useEffect(() => {
    if (!formData.projectId) return;

    const project = projects?.find(p => p.id === formData.projectId);
    if (!project) return;

    let title = '';
    if (formData.scope === 'Project') {
      title = t('report.form.titleProject', { project: project.name });
    } else if (formData.scope === 'Stage' && formData.stageId) {
      const stage = stages?.find(s => s.id === formData.stageId);
      if (stage) {
        title = t('report.form.titleStage', { project: project.name, stage: stage.name });
      }
    }

    if (title) {
      setFormData(prev => ({ ...prev, title }));
    }
  }, [formData.projectId, formData.scope, formData.stageId, projects, stages, t]);

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
      newErrors.projectId = t('report.validation.projectRequired');
    }

    if (!formData.title.trim()) {
      newErrors.title = t('report.validation.titleRequired');
    }

    if (formData.scope === 'Stage' && !formData.stageId) {
      newErrors.stageId = t('report.validation.stageRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const stage = stages?.find(s => s.id === formData.stageId);

    const submitData: any = {
      projectId: formData.projectId,
      scope: formData.scope,
      reportDate: new Date().toISOString(),
      title: formData.title,
    };

    if (formData.scope === 'Stage') {
      submitData.stageId = formData.stageId;
      submitData.stageName = stage?.name;
    }

    createMutation.mutate(submitData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue: any = value;

    if (name === 'projectId' || name === 'stageId') {
      finalValue = parseInt(value) || 0;
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const isLoading = createMutation.isPending;

  const scopeOptions = [
    { value: 'Project', label: t('report.scopeProjectReport') },
    { value: 'Stage', label: t('report.scopeStageReport') },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label={t('report.scopeProject')}
        name="projectId"
        value={formData.projectId}
        onChange={handleChange}
        options={projects?.map(p => ({ value: p.id, label: p.name })) || []}
        error={errors.projectId}
        required
        disabled={isLoading}
      />

      <Select
        label={t('report.scope')}
        name="scope"
        value={formData.scope}
        onChange={handleChange}
        options={scopeOptions}
        error={errors.scope}
        required
        disabled={isLoading}
      />

      {formData.scope === 'Stage' && formData.projectId > 0 && (
        <Select
          label={t('stages.title')}
          name="stageId"
          value={formData.stageId}
          onChange={handleChange}
          options={stages?.map(s => ({ value: s.id, label: s.name })) || []}
          error={errors.stageId}
          required
          disabled={isLoading}
        />
      )}

      <Input
        label={t('report.reportTitle')}
        name="title"
        type="text"
        value={formData.title}
        onChange={handleChange}
        error={errors.title}
        required
        disabled={isLoading}
        helperText={t('report.form.titleHelper')}
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
          {t('report.form.generate')}
        </Button>
      </div>
    </form>
  );
};
