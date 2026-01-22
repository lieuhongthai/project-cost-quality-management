import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '@/services/api';
import { Button, DateInput, Input } from '../common';
import { Select, TextArea } from '../common/FormFields';
import type { Review, PhaseScreenFunction, Member } from '@/types';
import { useTranslation } from 'react-i18next';

interface ReviewFormProps {
  phaseId: number;
  review?: Review;
  phaseScreenFunctions: PhaseScreenFunction[];
  members: Member[];
  onSuccess: () => void;
  onCancel: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  phaseId,
  review,
  phaseScreenFunctions,
  members,
  onSuccess,
  onCancel,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    phaseScreenFunctionId: review?.phaseScreenFunctionId || 0,
    reviewerId: review?.reviewerId || 0,
    reviewRound: review?.reviewRound || 1,
    reviewEffort: review?.reviewEffort || 0,
    defectsFound: review?.defectsFound || 0,
    reviewDate: review?.reviewDate ? review.reviewDate.split('T')[0] : '',
    note: review?.note || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: Partial<Review>) => reviewApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['review-summary', phaseId] });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Review>) => reviewApi.update(review!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', phaseId] });
      queryClient.invalidateQueries({ queryKey: ['review-summary', phaseId] });
      onSuccess();
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.phaseScreenFunctionId) {
      newErrors.phaseScreenFunctionId = t('review.form.validation.screenFunctionRequired');
    }

    if (!formData.reviewDate) {
      newErrors.reviewDate = t('review.form.validation.reviewDateRequired');
    }

    if (formData.reviewRound <= 0) {
      newErrors.reviewRound = t('review.form.validation.reviewRoundPositive');
    }

    if (formData.reviewEffort < 0) {
      newErrors.reviewEffort = t('review.form.validation.reviewEffortNonNegative');
    }

    if (formData.defectsFound < 0) {
      newErrors.defectsFound = t('review.form.validation.defectsNonNegative');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const payload = {
      phaseId,
      phaseScreenFunctionId: formData.phaseScreenFunctionId,
      reviewerId: formData.reviewerId || undefined,
      reviewRound: Number(formData.reviewRound),
      reviewEffort: Number(formData.reviewEffort),
      defectsFound: Number(formData.defectsFound),
      reviewDate: new Date(formData.reviewDate).toISOString(),
      note: formData.note || undefined,
    };

    if (review) {
      const updateData = { ...payload };
      delete (updateData as Partial<Review>).phaseId;
      delete (updateData as Partial<Review>).phaseScreenFunctionId;
      updateMutation.mutate(updateData);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    const intFields = ['phaseScreenFunctionId', 'reviewerId', 'reviewRound', 'defectsFound'];
    const floatFields = ['reviewEffort'];

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

  const screenFunctionOptions = phaseScreenFunctions.map((psf) => ({
    value: psf.id,
    label: psf.screenFunction?.name || t('common.unknown'),
  }));

  const memberOptions = [
    { value: 0, label: t('review.form.unassigned') },
    ...members.map((member) => ({
      value: member.id,
      label: `${member.name} (${member.role})`,
    })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label={t('review.screenFunction')}
        name="phaseScreenFunctionId"
        value={formData.phaseScreenFunctionId || ''}
        onChange={handleChange}
        options={screenFunctionOptions}
        error={errors.phaseScreenFunctionId}
        required
        disabled={isLoading || !!review}
      />

      <Select
        label={t('review.reviewer')}
        name="reviewerId"
        value={formData.reviewerId}
        onChange={handleChange}
        options={memberOptions}
        disabled={isLoading}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('review.reviewRound')}
          name="reviewRound"
          type="number"
          value={formData.reviewRound}
          onChange={handleChange}
          error={errors.reviewRound}
          required
          disabled={isLoading}
          min={1}
        />

        <Input
          label={t('review.reviewEffort')}
          name="reviewEffort"
          type="number"
          step="0.1"
          value={formData.reviewEffort}
          onChange={handleChange}
          error={errors.reviewEffort}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('review.defectsFound')}
          name="defectsFound"
          type="number"
          value={formData.defectsFound}
          onChange={handleChange}
          error={errors.defectsFound}
          disabled={isLoading}
          min={0}
        />

        <DateInput
          label={t('review.reviewDate')}
          name="reviewDate"
          value={formData.reviewDate}
          onChange={handleChange}
          error={errors.reviewDate}
          required
          disabled={isLoading}
        />
      </div>

      <TextArea
        label={t('review.note')}
        name="note"
        value={formData.note}
        onChange={handleChange}
        disabled={isLoading}
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={isLoading} disabled={isLoading}>
          {review ? t('review.form.update') : t('review.form.add')}
        </Button>
      </div>
    </form>
  );
};
