import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi } from '@/services/api';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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
      <Card>
        <CardHeader title={t('metrics.configTitle')} />
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">{t('common.loading')}</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title={t('metrics.configTitle')} />
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('metrics.configDescription')}</Typography>

        {/* Initialize Button if no types exist */}
        {metricTypes.length === 0 && (
          <Box sx={{ bgcolor: 'primary.light', border: 1, borderColor: 'primary.main', borderRadius: 1, p: 2, mb: 2 }}>
            <Typography variant="body2" color="primary.dark" sx={{ mb: 1 }}>{t('metrics.initializeDefaultsDesc')}</Typography>
            <Button
              variant="contained"
              onClick={() => initializeMutation.mutate()}
              disabled={initializeMutation.isPending}
            >
              {initializeMutation.isPending ? t('common.saving') : t('metrics.initializeDefaults')}
            </Button>
          </Box>
        )}

        {/* Add Type Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="outlined" onClick={handleAddType}>
            + {t('metrics.addType')}
          </Button>
        </Box>

        {/* Metric Types List */}
        {metricTypes.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {metricTypes.map((type) => {
              const isProtectedType = type.name.trim().toLowerCase() === protectedTypeName;
              return (
                <Box key={type.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  {/* Type Header */}
                  <Box
                    sx={{ px: 2, py: 1.5, bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    onClick={() => toggleExpand(type.id)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton size="small">
                        {expandedTypes.includes(type.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                      <Typography fontWeight={500}>{type.name}</Typography>
                      {type.description && (
                        <Typography variant="body2" color="text.secondary">- {type.description}</Typography>
                      )}
                      <Chip label={`${type.categories?.length || 0} ${t('metrics.categories').toLowerCase()}`} size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                      {isProtectedType ? (
                        <Chip label={t('metrics.protectedType')} size="small" color="primary" />
                      ) : (
                        <>
                          <Button variant="outlined" size="small" onClick={() => handleEditType(type)}>
                            {t('common.edit')}
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => handleDeleteType(type)}
                            disabled={deleteTypeMutation.isPending}
                          >
                            {t('common.delete')}
                          </Button>
                        </>
                      )}
                    </Box>
                  </Box>

                  {/* Categories (Expanded) */}
                  <Collapse in={expandedTypes.includes(type.id)}>
                    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                      {type.categories && type.categories.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {type.categories.map((category) => {
                            const isProtectedCategory = isProtectedType
                              && protectedCategoryNames.has(category.name.trim().toLowerCase());
                            return (
                              <Box
                                key={category.id}
                                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, px: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}
                              >
                                <Box>
                                  <Typography variant="body2" fontWeight={500}>{category.name}</Typography>
                                  {category.description && (
                                    <Typography variant="body2" color="text.secondary">
                                      - {category.description}
                                    </Typography>
                                  )}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {isProtectedCategory ? (
                                    <Chip label={t('metrics.protectedCategory')} size="small" />
                                  ) : (
                                    <>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => handleEditCategory(category)}
                                      >
                                        {t('common.edit')}
                                      </Button>
                                      <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        onClick={() => handleDeleteCategory(category, type.name)}
                                        disabled={deleteCategoryMutation.isPending}
                                      >
                                        {t('common.delete')}
                                      </Button>
                                    </>
                                  )}
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">{t('metrics.noCategories')}</Typography>
                      )}
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ mt: 1.5 }}
                        onClick={() => handleAddCategory(type.id)}
                      >
                        + {t('metrics.addCategory')}
                      </Button>
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Box>
        ) : (
          !initializeMutation.isPending && (
            <Typography sx={{ textAlign: 'center', py: 2 }} color="text.secondary">{t('metrics.noMetricTypes')}</Typography>
          )
        )}
      </CardContent>

      {/* Add/Edit Type Modal */}
      <Dialog
        open={showAddType || !!editingType}
        onClose={() => {
          setShowAddType(false);
          setEditingType(null);
        }}
        maxWidth="sm"
        fullWidth
        disableScrollLock
      >
        <DialogTitle>{editingType ? t('metrics.editType') : t('metrics.addType')}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmitType} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={`${t('metrics.typeName')} *`}
              value={typeForm.name}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              required
              size="small"
              fullWidth
            />
            <TextField
              label={t('common.description')}
              value={typeForm.description}
              onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
              size="small"
              fullWidth
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 2 }}>
              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  setShowAddType(false);
                  setEditingType(null);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={createTypeMutation.isPending || updateTypeMutation.isPending}
              >
                {createTypeMutation.isPending || updateTypeMutation.isPending
                  ? t('common.saving')
                  : t('common.save')}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Category Modal */}
      <Dialog
        open={!!showAddCategory || !!editingCategory}
        onClose={() => {
          setShowAddCategory(null);
          setEditingCategory(null);
        }}
        maxWidth="sm"
        fullWidth
        disableScrollLock
      >
        <DialogTitle>{editingCategory ? t('metrics.editCategory') : t('metrics.addCategory')}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmitCategory} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={`${t('metrics.categoryName')} *`}
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              required
              size="small"
              fullWidth
            />
            <TextField
              label={t('common.description')}
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              size="small"
              fullWidth
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 2 }}>
              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  setShowAddCategory(null);
                  setEditingCategory(null);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              >
                {createCategoryMutation.isPending || updateCategoryMutation.isPending
                  ? t('common.saving')
                  : t('common.save')}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
