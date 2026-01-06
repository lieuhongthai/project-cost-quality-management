import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commentaryApi } from '@/services/api';
import { Button, TextArea } from '../common';
import type { Commentary } from '@/types';

interface CommentaryFormProps {
  reportId: number;
  commentary?: Commentary;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CommentaryForm: React.FC<CommentaryFormProps> = ({
  reportId,
  commentary,
  onSuccess,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    content: commentary?.content || '',
    author: commentary?.author || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: Partial<Commentary>) => commentaryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commentaries', reportId] });
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Commentary>) => commentaryApi.update(commentary!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commentaries', reportId] });
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      onSuccess();
    },
  });

  const generateAIMutation = useMutation({
    mutationFn: () => commentaryApi.generateAI(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commentaries', reportId] });
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      onSuccess();
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.content.trim()) {
      newErrors.content = 'Commentary content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const submitData = {
      reportId,
      type: 'Manual' as const,
      content: formData.content,
      author: formData.author.trim() || undefined,
      version: commentary ? commentary.version + 1 : 1,
    };

    if (commentary) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleGenerateAI = () => {
    if (window.confirm('Generate AI commentary for this report?')) {
      generateAIMutation.mutate();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || generateAIMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextArea
        label="Commentary Content"
        name="content"
        value={formData.content}
        onChange={handleChange}
        error={errors.content}
        required
        disabled={isLoading}
        rows={8}
        helperText="Provide detailed analysis, observations, and recommendations"
      />

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Author (Optional)
          </label>
          <input
            type="text"
            name="author"
            value={formData.author}
            onChange={handleChange}
            className="input"
            placeholder="Your name"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <Button
          type="button"
          variant="secondary"
          onClick={handleGenerateAI}
          disabled={isLoading || !!commentary}
        >
          Generate AI Commentary
        </Button>

        <div className="flex gap-2">
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
            {commentary ? 'Update Commentary' : 'Add Commentary'}
          </Button>
        </div>
      </div>
    </form>
  );
};
