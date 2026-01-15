import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { memberApi } from '@/services/api';
import { Button, Input, Select } from '../common';
import type { Member, MemberRole, MemberStatus, MemberAvailability } from '@/types';

interface MemberFormProps {
  projectId: number;
  member?: Member;
  onSuccess: () => void;
  onCancel: () => void;
}

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: 'PM', label: 'Project Manager (PM)' },
  { value: 'TL', label: 'Tech Lead (TL)' },
  { value: 'BA', label: 'Business Analyst (BA)' },
  { value: 'DEV', label: 'Developer (DEV)' },
  { value: 'QA', label: 'QA Engineer (QA)' },
  { value: 'Comtor', label: 'Comtor' },
  { value: 'Designer', label: 'Designer' },
  { value: 'DevOps', label: 'DevOps' },
  { value: 'Other', label: 'Other' },
];

const STATUS_OPTIONS: { value: MemberStatus; label: string }[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'On Leave', label: 'On Leave' },
];

const AVAILABILITY_OPTIONS: { value: MemberAvailability; label: string }[] = [
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Contract', label: 'Contract' },
];

export const MemberForm: React.FC<MemberFormProps> = ({
  projectId,
  member,
  onSuccess,
  onCancel,
}) => {
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
      newErrors.name = 'Name is required';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="Enter member name"
          required
          disabled={isLoading}
        />

        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="Enter email address"
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Select
          label="Role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          options={ROLE_OPTIONS}
          error={errors.role}
          required
          disabled={isLoading}
        />

        <Select
          label="Availability"
          name="availability"
          value={formData.availability}
          onChange={handleChange}
          options={AVAILABILITY_OPTIONS}
          disabled={isLoading}
        />

        <Select
          label="Status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          options={STATUS_OPTIONS}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Years of Experience"
          name="yearsOfExperience"
          type="number"
          min="0"
          step="0.5"
          value={formData.yearsOfExperience}
          onChange={handleChange}
          placeholder="Years of experience"
          disabled={isLoading}
        />

        <Input
          label="Hourly Rate"
          name="hourlyRate"
          type="number"
          min="0"
          step="0.01"
          value={formData.hourlyRate}
          onChange={handleChange}
          placeholder="Hourly rate"
          disabled={isLoading}
        />
      </div>

      <Input
        label="Skills (comma-separated)"
        name="skills"
        value={formData.skills}
        onChange={handleChange}
        placeholder="e.g., React, Node.js, TypeScript"
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
          {member ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
};
