import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskWorkflowApi, screenFunctionApi } from '@/services/api';
import type { WorklogImportBatchDetail } from '@/types';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { Modal } from '@/components/common/Modal';
import { useTranslation } from 'react-i18next';

interface WorklogImportPanelProps {
  projectId: number;
}

interface ItemOverride {
  stageId?: number;
  stepId?: number;
  screenFunctionId?: number;
}

export function WorklogImportPanel({ projectId }: WorklogImportPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchDetail, setBatchDetail] = useState<WorklogImportBatchDetail | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [overrides, setOverrides] = useState<Record<number, ItemOverride>>({});
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ItemOverride>({});
  const [commitResult, setCommitResult] = useState<null | {
    success: number;
    failed: number;
    skipped: number;
    total: number;
  }>(null);

  const { data: config } = useQuery({
    queryKey: ['workflowConfig', projectId],
    queryFn: async () => (await taskWorkflowApi.getConfiguration(projectId)).data,
  });

  const { data: screenFunctions } = useQuery({
    queryKey: ['screenFunctions', projectId],
    queryFn: async () => (await screenFunctionApi.getByProject(projectId)).data,
  });

  const previewMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error(t('worklogImport.errors.selectCsv', { defaultValue: 'Please select a CSV file' }));
      return taskWorkflowApi.previewWorklogImport(projectId, selectedFile);
    },
    onSuccess: (response) => {
      const data = response.data;
      setBatchDetail(data);
      setSelectedIds(data.items.filter((item) => item.isSelected).map((item) => item.id));
      setOverrides({});
      setEditingItemId(null);
      setEditDraft({});
      setCommitResult(null);
    },
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!batchDetail) throw new Error(t('worklogImport.errors.noPreviewData', { defaultValue: 'No preview data' }));
      const overridePayload = Object.entries(overrides)
        .map(([itemId, value]) => ({ itemId: Number(itemId), ...value }))
        .filter((x) => x.stageId || x.stepId || x.screenFunctionId);

      const response = await taskWorkflowApi.commitWorklogImport({
        batchId: batchDetail.batch.id,
        selectedItemIds: selectedIds,
        overrides: overridePayload,
      });
      const refreshed = await taskWorkflowApi.getWorklogImportBatch(batchDetail.batch.id);
      setBatchDetail(refreshed.data);
      return response;
    },
    onSuccess: (response) => {
      setCommitResult(response.data);
    },
  });

  const createScreenFunctionMutation = useMutation({
    mutationFn: async ({ itemId, suggestedName }: { itemId: number; suggestedName: string }) => {
      const defaultOrder = (screenFunctions?.length || 0) + 1;
      const response = await screenFunctionApi.create({
        projectId,
        name: suggestedName,
        type: 'Function',
        priority: 'Medium',
        complexity: 'Medium',
        estimatedEffort: 0,
        actualEffort: 0,
        progress: 0,
        status: 'Not Started',
        displayOrder: defaultOrder,
      });
      await queryClient.invalidateQueries({ queryKey: ['screenFunctions', projectId] });
      return { itemId, createdId: response.data.id };
    },
    onSuccess: ({ itemId, createdId }) => {
      setOverrides((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          screenFunctionId: createdId,
        },
      }));
      if (editingItemId === itemId) {
        setEditDraft((prev) => ({ ...prev, screenFunctionId: createdId }));
      }
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!batchDetail) throw new Error(t('worklogImport.errors.noBatchToExport', { defaultValue: 'No batch to export' }));
      const response = await taskWorkflowApi.exportUnselectedWorklogImport(batchDetail.batch.id);
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `worklog-import-unselected-${batchDetail.batch.id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });

  const stageOptions = config?.stages || [];

  const getEffectiveValue = (itemId: number, key: keyof ItemOverride, fallback?: number) =>
    overrides[itemId]?.[key] ?? fallback;

  const itemCanSelect = (item: any) => {
    const effectiveStepId = getEffectiveValue(item.id, 'stepId', item.stepId);
    const effectiveScreenFunctionId = getEffectiveValue(item.id, 'screenFunctionId', item.screenFunctionId);
    return !!item.memberId && !!effectiveStepId && !!effectiveScreenFunctionId;
  };

  const selectableIds = useMemo(
    () => batchDetail?.items.filter((item) => itemCanSelect(item)).map((item) => item.id) || [],
    [batchDetail, overrides],
  );

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  const toggleSelected = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const updateOverride = (itemId: number, patch: ItemOverride) => {
    setOverrides((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        ...patch,
      },
    }));
  };

  const parseOptionalNumber = (value: string): number | undefined => {
    if (!value) return undefined;
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  };

  const getStatusColor = (status: string) => {
    if (status === 'ready' || status === 'committed') return 'success';
    if (status === 'needs_review') return 'warning';
    if (status === 'error' || status === 'unmapped') return 'error';
    return 'default';
  };

  const buildSuggestedScreenFunctionName = (workDetail?: string) => {
    const normalized = (workDetail || '')
      .replace(/\bgsl-\d+\b/gi, '')
      .replace(/\[[^\]]+\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return normalized.slice(0, 120) || `Imported Function ${Date.now()}`;
  };

  const openEditModal = (item: any) => {
    setEditingItemId(item.id);
    setEditDraft({
      stageId: getEffectiveValue(item.id, 'stageId', item.stageId),
      stepId: getEffectiveValue(item.id, 'stepId', item.stepId),
      screenFunctionId: getEffectiveValue(item.id, 'screenFunctionId', item.screenFunctionId),
    });
  };

  const closeEditModal = () => {
    setEditingItemId(null);
    setEditDraft({});
  };

  const saveEditModal = () => {
    if (!editingItemId) return;
    updateOverride(editingItemId, editDraft);
    closeEditModal();
  };

  const editingItem = batchDetail?.items.find((item) => item.id === editingItemId) || null;
  const editingStage = stageOptions.find((s: any) => s.id === Number(editDraft.stageId));
  const editingStepOptions = editingStage?.steps || [];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>{t('worklogImport.title', { defaultValue: 'Import CSV Worklog' })}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('worklogImport.description', { defaultValue: 'Upload CSV to preview, select records to import into StepScreenFunctionMember, then confirm commit.' })}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
          <input type="file" accept=".csv,text/csv" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
          <Button variant="contained" onClick={() => previewMutation.mutate()} disabled={!selectedFile || previewMutation.isPending}>
            {t('worklogImport.actions.preview', { defaultValue: 'Preview' })}
          </Button>
          {batchDetail && (
            <>
              <Button variant="contained" color="success" onClick={() => commitMutation.mutate()} disabled={selectedIds.length === 0 || commitMutation.isPending}>
                {t('worklogImport.actions.commitSelected', { defaultValue: 'Commit Selected' })} ({selectedIds.length})
              </Button>
              <Button variant="outlined" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
                {t('worklogImport.actions.exportUnselected', { defaultValue: 'Export Unselected' })}
              </Button>
            </>
          )}
        </Box>

        {previewMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{t('worklogImport.errors.previewFailed', { defaultValue: 'Preview failed' })}</Alert>}
        {commitMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{t('worklogImport.errors.commitFailed', { defaultValue: 'Commit failed' })}</Alert>}

        {commitResult && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('worklogImport.commitResult', { defaultValue: 'Commit result: success {{success}}, failed {{failed}}, skipped {{skipped}}, total {{total}}', success: commitResult.success, failed: commitResult.failed, skipped: commitResult.skipped, total: commitResult.total })}
          </Alert>
        )}

        {batchDetail && (
          <>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip label={t('worklogImport.summary.total', { defaultValue: 'Total: {{value}}', value: batchDetail.summary.total })} />
              <Chip color="success" label={t('worklogImport.summary.ready', { defaultValue: 'Ready: {{value}}', value: batchDetail.summary.ready })} />
              <Chip color="warning" label={t('worklogImport.summary.needsReview', { defaultValue: 'Needs review: {{value}}', value: batchDetail.summary.needsReview })} />
              <Chip color="error" label={t('worklogImport.summary.unmapped', { defaultValue: 'Unmapped: {{value}}', value: batchDetail.summary.unmapped })} />
            </Box>

            <Box sx={{ mb: 1 }}>
              <Checkbox
                checked={allSelected}
                indeterminate={!allSelected && selectedIds.length > 0}
                onChange={(e) => setSelectedIds(e.target.checked ? selectableIds : [])}
              />
              {t('worklogImport.selectAllMappable', { defaultValue: 'Select all rows with enough mapping data (member + step + screen/function)' })}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {t('worklogImport.hintUseEditModal', { defaultValue: 'Click Edit to open popup for Stage/Step/Screen Function mapping per row.' })}
            </Typography>

            <TableContainer component={Paper} sx={{ maxHeight: 460 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('worklogImport.table.select', { defaultValue: 'Select' })}</TableCell>
                    <TableCell>{t('worklogImport.table.day', { defaultValue: 'Day' })}</TableCell>
                    <TableCell>{t('worklogImport.table.email', { defaultValue: 'Email' })}</TableCell>
                    <TableCell>{t('worklogImport.table.workDetail', { defaultValue: 'Work detail' })}</TableCell>
                    <TableCell>{t('worklogImport.table.member', { defaultValue: 'Member' })}</TableCell>
                    <TableCell>{t('worklogImport.table.stageStep', { defaultValue: 'Stage / Step' })}</TableCell>
                    <TableCell>{t('worklogImport.table.screenFunction', { defaultValue: 'Screen/Function' })}</TableCell>
                    <TableCell>{t('worklogImport.table.minutes', { defaultValue: 'Minutes' })}</TableCell>
                    <TableCell>{t('worklogImport.table.status', { defaultValue: 'Status' })}</TableCell>
                    <TableCell>{t('worklogImport.table.reason', { defaultValue: 'Reason' })}</TableCell>
                    <TableCell align="center">{t('worklogImport.table.action', { defaultValue: 'Action' })}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batchDetail.items.map((item) => {
                    const effectiveStageId = getEffectiveValue(item.id, 'stageId', item.stageId);
                    const effectiveStepId = getEffectiveValue(item.id, 'stepId', item.stepId);
                    const effectiveScreenFunctionId = getEffectiveValue(item.id, 'screenFunctionId', item.screenFunctionId);
                    const stage = stageOptions.find((s: any) => s.id === Number(effectiveStageId));
                    const stepName = stage?.steps?.find((sp: any) => sp.id === Number(effectiveStepId))?.name || item.step?.name || '-';
                    const screenFunctionName =
                      (screenFunctions || []).find((sf: any) => sf.id === Number(effectiveScreenFunctionId))?.name || item.screenFunction?.name || '-';
                    const canSelect = itemCanSelect(item);

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox checked={selectedIds.includes(item.id)} disabled={!canSelect} onChange={(e) => toggleSelected(item.id, e.target.checked)} />
                        </TableCell>
                        <TableCell>{item.day || '-'}</TableCell>
                        <TableCell>{item.email || '-'}</TableCell>
                        <TableCell sx={{ maxWidth: 320 }}>{item.workDetail || '-'}</TableCell>
                        <TableCell>{item.member?.name || '-'}</TableCell>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{stage?.name || '-'}</Typography>
                          <Typography variant="caption" color="text.secondary">{stepName}</Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Typography variant="body2">{screenFunctionName}</Typography>
                        </TableCell>
                        <TableCell>{item.minutes || 0}</TableCell>
                        <TableCell>
                          <Chip size="small" color={getStatusColor(item.status) as any} label={item.status} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>{item.reason || '-'}</TableCell>
                        <TableCell align="center" sx={{ minWidth: 120 }}>
                          <Button size="small" variant="outlined" onClick={() => openEditModal(item)}>{t('common.edit')}</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        <Modal
          isOpen={!!editingItem}
          onClose={closeEditModal}
          title={t('worklogImport.editModal.title', { defaultValue: 'Edit mapping for row #{{row}}', row: editingItem?.rowNumber || '-' })}
          size="sm"
          footer={(
            <>
              <Button color="inherit" onClick={closeEditModal}>{t('common.cancel')}</Button>
              <Button variant="contained" onClick={saveEditModal}>{t('common.save')}</Button>
            </>
          )}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {editingItem?.workDetail || '-'}
          </Typography>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              select
              size="small"
              label={t('taskWorkflow.stage', { defaultValue: 'Stage' })}
              value={editDraft.stageId || ''}
              onChange={(e) => setEditDraft((prev) => ({
                ...prev,
                stageId: parseOptionalNumber(e.target.value),
                stepId: undefined,
              }))}
            >
              <MenuItem value="">-</MenuItem>
              {stageOptions.map((s: any) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label={t('taskWorkflow.step', { defaultValue: 'Step' })}
              value={editDraft.stepId || ''}
              onChange={(e) => setEditDraft((prev) => ({ ...prev, stepId: parseOptionalNumber(e.target.value) }))}
            >
              <MenuItem value="">-</MenuItem>
              {editingStepOptions.map((sp: any) => (
                <MenuItem key={sp.id} value={sp.id}>{sp.name}</MenuItem>
              ))}
            </TextField>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                select
                size="small"
                label={t('worklogImport.table.screenFunction', { defaultValue: 'Screen/Function' })}
                fullWidth
                value={editDraft.screenFunctionId || ''}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, screenFunctionId: parseOptionalNumber(e.target.value) }))}
              >
                <MenuItem value="">-</MenuItem>
                {(screenFunctions || []).map((sf: any) => (
                  <MenuItem key={sf.id} value={sf.id}>{sf.name}</MenuItem>
                ))}
              </TextField>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  editingItem && createScreenFunctionMutation.mutate({
                    itemId: editingItem.id,
                    suggestedName: buildSuggestedScreenFunctionName(editingItem.workDetail),
                  })
                }
                disabled={createScreenFunctionMutation.isPending || !editingItem}
              >
                +
              </Button>
            </Box>
          </Box>
        </Modal>
      </CardContent>
    </Card>
  );
}
