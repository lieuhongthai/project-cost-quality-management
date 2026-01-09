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
  const [language, setLanguage] = useState<string>('English');
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
    mutationFn: () => commentaryApi.generateAI(reportId, language),
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
    <div className="space-y-6">
      {/* AI Commentary Section */}
      {!commentary && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-5 border border-purple-200">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-3xl">🤖</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                AI-Generated Commentary
              </h3>
              <p className="text-sm text-gray-600">
                Let AI analyze your metrics and provide insights automatically
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Language
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setLanguage('English')}
                  disabled={isLoading}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    language === 'English'
                      ? 'border-purple-500 bg-purple-100 text-purple-900 font-semibold'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="text-xl">🇬🇧</span>
                  <span>English</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('Vietnamese')}
                  disabled={isLoading}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    language === 'Vietnamese'
                      ? 'border-purple-500 bg-purple-100 text-purple-900 font-semibold'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="text-xl">🇻🇳</span>
                  <span>Tiếng Việt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('Japanese')}
                  disabled={isLoading}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    language === 'Japanese'
                      ? 'border-purple-500 bg-purple-100 text-purple-900 font-semibold'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="text-xl">🇯🇵</span>
                  <span>日本語</span>
                </button>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGenerateAI}
              disabled={isLoading}
              loading={generateAIMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3"
            >
              <span className="flex items-center justify-center gap-2">
                <span>✨</span>
                <span>Generate AI Commentary</span>
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Divider */}
      {!commentary && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500 font-medium">OR</span>
          </div>
        </div>
      )}

      {/* Manual Commentary Section */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-3xl">✍️</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {commentary ? 'Update Commentary' : 'Write Manual Commentary'}
              </h3>
              <p className="text-sm text-gray-600">
                Provide your own analysis and recommendations
              </p>
            </div>
          </div>

          <div className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author (Optional)
              </label>
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleChange}
                className="input w-full"
                placeholder="Your name"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={createMutation.isPending || updateMutation.isPending}
            disabled={isLoading}
            className="px-6 bg-blue-600 hover:bg-blue-700"
          >
            {commentary ? '💾 Update Commentary' : '📝 Add Commentary'}
          </Button>
        </div>
      </form>
    </div>
  );
};
