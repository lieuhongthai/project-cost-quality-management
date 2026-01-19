import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { memberApi } from '@/services/api';
import { Button, Input, Select } from '../common';
import type { Member, MemberRole, MemberStatus, MemberAvailability } from '@/types';
import { useTranslation } from 'react-i18next';

interface MemberFormProps {
  projectId: number;
  member?: Member;
  onSuccess: () => void;
  onCancel: () => void;
}

export const MemberForm: React.FC<MemberFormProps> = ({
  projectId,
  member,
  onSuccess,
  onCancel,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: member?.name || '',
    email: member?.email || '',
    role: member?.role || 'DEV' as MemberRole,
    yearsOfExperience: member?.yearsOfExperience || '',
    skills: member?.skills?.join(', ') || '',
    hourlyRate: member?.hourlyRate || '',
    availability: member?.availability || 'Full-time' as MemberAvailability,
    status: member?.status || 'Active' as MemberStatus,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: Partial<Member>) => memberApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['memberSummary', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projectWorkload', projectId] });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Member>) => memberApi.update(member!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['member', member!.id] });
      queryClient.invalidateQueries({ queryKey: ['memberSummary', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projectWorkload', projectId] });
      onSuccess();
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('member.form.validation.nameRequired');
    }

    if (!formData.role) {
      newErrors.role = t('member.form.validation.roleRequired');
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('member.form.validation.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const submitData: Partial<Member> = {
      name: formData.name,
      email: formData.email || undefined,
      role: formData.role,
      yearsOfExperience: formData.yearsOfExperience ? Number(formData.yearsOfExperience) : undefined,
      skills: formData.skills ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : undefined,
      availability: formData.availability,
      status: formData.status,
    };

    if (member) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate({ projectId, ...submitData });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const roleOptions: { value: MemberRole; label: string }[] = [
    { value: 'PM', label: t('member.rolePM') },
    { value: 'TL', label: t('member.roleTL') },
    { value: 'BA', label: t('member.roleBA') },
    { value: 'DEV', label: t('member.roleDEV') },
    { value: 'QA', label: t('member.roleQA') },
    { value: 'Comtor', label: t('member.roleComtor') },
    { value: 'Designer', label: t('member.roleDesigner') },
    { value: 'DevOps', label: t('member.roleDevOps') },
    { value: 'Other', label: t('member.roleOther') },
  ];

  const statusOptions: { value: MemberStatus; label: string }[] = [
    { value: 'Active', label: t('member.statusActive') },
    { value: 'Inactive', label: t('member.statusInactive') },
    { value: 'On Leave', label: t('member.statusOnLeave') },
  ];

  const availabilityOptions: { value: MemberAvailability; label: string }[] = [
    { value: 'Full-time', label: t('member.availabilityFullTime') },
    { value: 'Part-time', label: t('member.availabilityPartTime') },
    { value: 'Contract', label: t('member.availabilityContract') },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('member.name')}
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          placeholder={t('member.form.namePlaceholder')}
          required
          disabled={isLoading}
        />

        <Input
          label={t('member.email')}
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          placeholder={t('member.form.emailPlaceholder')}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Select
          label={t('member.role')}
          name="role"
          value={formData.role}
          onChange={handleChange}
          options={roleOptions}
          error={errors.role}
          required
          disabled={isLoading}
        />

        <Select
          label={t('member.availability')}
          name="availability"
          value={formData.availability}
          onChange={handleChange}
          options={availabilityOptions}
          disabled={isLoading}
        />

        <Select
          label={t('member.status')}
          name="status"
          value={formData.status}
          onChange={handleChange}
          options={statusOptions}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('member.yearsOfExperience')}
          name="yearsOfExperience"
          type="number"
          min="0"
          step="0.5"
          value={formData.yearsOfExperience}
          onChange={handleChange}
          placeholder={t('member.form.yearsPlaceholder')}
          disabled={isLoading}
        />

        <Input
          label={t('member.hourlyRate')}
          name="hourlyRate"
          type="number"
          min="0"
          step="0.01"
          value={formData.hourlyRate}
          onChange={handleChange}
          placeholder={t('member.form.hourlyRatePlaceholder')}
          disabled={isLoading}
        />
      </div>

      <Input
        label={t('member.skills')}
        name="skills"
        value={formData.skills}
        onChange={handleChange}
        placeholder={t('member.form.skillsPlaceholder')}
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
          {member ? t('common.update') : t('common.create')}
        </Button>
      </div>
    </form>
  );
};
