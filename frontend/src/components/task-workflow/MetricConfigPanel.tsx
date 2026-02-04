import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi } from '@/services/api';
import { Card, Button, Modal, Input } from '@/components/common';
import type { MetricType, MetricCategory } from '@/types';

interface MetricConfigPanelProps {
  projectId: number;
}

export function MetricConfigPanel({ projectId }: MetricConfigPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const protectedTypeName = 'test cases';
  const protectedCategoryNames = new Set(['total', 'passed', 'failed']);

  // State for modals
  const [showAddType, setShowAddType] = useState(false);
  const [editingType, setEditingType] = useState<MetricType | null>(null);
  const [showAddCategory, setShowAddCategory] = useState<number | null>(null); // metricTypeId
  const [editingCategory, setEditingCategory] = useState<MetricCategory | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<number[]>([]);

  // Form state
  const [typeForm, setTypeForm] = useState({ name: '', description: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  // Queries
  const { data: metricTypes = [], isLoading } = useQuery({
    queryKey: ['metricTypes', projectId],
    queryFn: async () => {
      const response = await taskWorkflowApi.getMetricTypes(projectId);
      return response.data;
    },
  });

  // Mutations
  const initializeMutation = useMutation({
    mutationFn: () => taskWorkflowApi.initializeProjectMetrics(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metricTypes', projectId] });
    },
  });

  const createTypeMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      taskWorkflowApi.createMetricType({ projectId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metricTypes', projectId] });
      setShowAddType(false);
      setTypeForm({ name: '', description: '' });
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; description?: string }) =>
      taskWorkflowApi.updateMetricType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metricTypes', projectId] });
      setEditingType(null);
      setTypeForm({ name: '', description: '' });
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: number) => taskWorkflowApi.deleteMetricType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metricTypes', projectId] });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: { metricTypeId: number; name: string; description?: string }) =>
      taskWorkflowApi.createMetricCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metricTypes', projectId] });
      setShowAddCategory(null);
      setCategoryForm({ name: '', description: '' });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; description?: string }) =>
      taskWorkflowApi.updateMetricCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metricTypes', projectId] });
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => taskWorkflowApi.deleteMetricCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metricTypes', projectId] });
    },
  });

  const toggleExpand = (typeId: number) => {
    setExpandedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  };

  const handleAddType = () => {
    setTypeForm({ name: '', description: '' });
    setShowAddType(true);
  };

  const handleEditType = (type: MetricType) => {
    setTypeForm({ name: type.name, description: type.description || '' });
    setEditingType(type);
  };

  const handleDeleteType = (type: MetricType) => {
    if (type.name.trim().toLowerCase() === protectedTypeName) return;
    if (confirm(t('metrics.confirmDeleteType'))) {
      deleteTypeMutation.mutate(type.id);
    }
  };

  const handleAddCategory = (metricTypeId: number) => {
    setCategoryForm({ name: '', description: '' });
    setShowAddCategory(metricTypeId);
  };

  const handleEditCategory = (category: MetricCategory) => {
    setCategoryForm({ name: category.name, description: category.description || '' });
    setEditingCategory(category);
  };

  const handleDeleteCategory = (category: MetricCategory, metricTypeName: string) => {
    if (metricTypeName.trim().toLowerCase() === protectedTypeName
      && protectedCategoryNames.has(category.name.trim().toLowerCase())) {
      return;
    }
    if (confirm(t('metrics.confirmDeleteCategory'))) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const handleSubmitType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeForm.name.trim()) return;

    if (editingType) {
      updateTypeMutation.mutate({
        id: editingType.id,
        name: typeForm.name,
        description: typeForm.description || undefined,
      });
    } else {
      createTypeMutation.mutate({
        name: typeForm.name,
        description: typeForm.description || undefined,
      });
    }
  };

  const handleSubmitCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        name: categoryForm.name,
        description: categoryForm.description || undefined,
      });
    } else if (showAddCategory) {
      createCategoryMutation.mutate({
        metricTypeId: showAddCategory,
        name: categoryForm.name,
        description: categoryForm.description || undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <Card title={t('metrics.configTitle')}>
        <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
      </Card>
    );
  }

  return (
    <Card title={t('metrics.configTitle')}>
      <p className="text-sm text-gray-500 mb-4">{t('metrics.configDescription')}</p>

      {/* Initialize Button if no types exist */}
      {metricTypes.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800 mb-2">{t('metrics.initializeDefaultsDesc')}</p>
          <Button
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
          >
            {initializeMutation.isPending ? t('common.saving') : t('metrics.initializeDefaults')}
          </Button>
        </div>
      )}

      {/* Add Type Button */}
      <div className="flex justify-end mb-4">
        <Button variant="secondary" onClick={handleAddType}>
          + {t('metrics.addType')}
        </Button>
      </div>

      {/* Metric Types List */}
      {metricTypes.length > 0 ? (
        <div className="space-y-3">
          {metricTypes.map((type) => {
            const isProtectedType = type.name.trim().toLowerCase() === protectedTypeName;
            return (
              <div key={type.id} className="border rounded-lg">
                {/* Type Header */}
                <div
                  className="px-4 py-3 bg-gray-50 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(type.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">
                      {expandedTypes.includes(type.id) ? '▼' : '▶'}
                    </span>
                    <span className="font-medium">{type.name}</span>
                    {type.description && (
                      <span className="text-sm text-gray-500">- {type.description}</span>
                    )}
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                      {type.categories?.length || 0} {t('metrics.categories').toLowerCase()}
                    </span>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="secondary" size="sm" onClick={() => handleEditType(type)}>
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteType(type)}
                      disabled={deleteTypeMutation.isPending || isProtectedType}
                      title={isProtectedType ? t('metrics.protectedType') : undefined}
                    >
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>

                {/* Categories (Expanded) */}
                {expandedTypes.includes(type.id) && (
                  <div className="p-4 border-t">
                    {type.categories && type.categories.length > 0 ? (
                      <div className="space-y-2">
                        {type.categories.map((category) => {
                          const isProtectedCategory = isProtectedType
                            && protectedCategoryNames.has(category.name.trim().toLowerCase());
                          return (
                            <div
                              key={category.id}
                              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                            >
                              <div>
                                <span className="font-medium">{category.name}</span>
                                {category.description && (
                                  <span className="text-sm text-gray-500 ml-2">
                                    - {category.description}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleEditCategory(category)}
                                >
                                  {t('common.edit')}
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeleteCategory(category, type.name)}
                                  disabled={deleteCategoryMutation.isPending || isProtectedCategory}
                                  title={isProtectedCategory ? t('metrics.protectedCategory') : undefined}
                                >
                                  {t('common.delete')}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">{t('metrics.noCategories')}</p>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => handleAddCategory(type.id)}
                    >
                      + {t('metrics.addCategory')}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !initializeMutation.isPending && (
          <p className="text-center py-4 text-gray-500">{t('metrics.noMetricTypes')}</p>
        )
      )}

      {/* Add/Edit Type Modal */}
      <Modal
        isOpen={showAddType || !!editingType}
        onClose={() => {
          setShowAddType(false);
          setEditingType(null);
        }}
        title={editingType ? t('metrics.editType') : t('metrics.addType')}
      >
        <form onSubmit={handleSubmitType} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('metrics.typeName')} *
            </label>
            <Input
              value={typeForm.name}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.description')}
            </label>
            <Input
              value={typeForm.description}
              onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddType(false);
                setEditingType(null);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createTypeMutation.isPending || updateTypeMutation.isPending}
            >
              {createTypeMutation.isPending || updateTypeMutation.isPending
                ? t('common.saving')
                : t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Category Modal */}
      <Modal
        isOpen={!!showAddCategory || !!editingCategory}
        onClose={() => {
          setShowAddCategory(null);
          setEditingCategory(null);
        }}
        title={editingCategory ? t('metrics.editCategory') : t('metrics.addCategory')}
      >
        <form onSubmit={handleSubmitCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('metrics.categoryName')} *
            </label>
            <Input
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.description')}
            </label>
            <Input
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddCategory(null);
                setEditingCategory(null);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending || updateCategoryMutation.isPending
                ? t('common.saving')
                : t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
