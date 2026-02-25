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

interface WorklogImportPanelProps {
  projectId: number;
}

interface ItemOverride {
  stageId?: number;
  stepId?: number;
  screenFunctionId?: number;
}

export function WorklogImportPanel({ projectId }: WorklogImportPanelProps) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchDetail, setBatchDetail] = useState<WorklogImportBatchDetail | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [overrides, setOverrides] = useState<Record<number, ItemOverride>>({});
  const [editingItemIds, setEditingItemIds] = useState<number[]>([]);
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
      if (!selectedFile) throw new Error('Please select a CSV file');
      return taskWorkflowApi.previewWorklogImport(projectId, selectedFile);
    },
    onSuccess: (response) => {
      const data = response.data;
      setBatchDetail(data);
      setSelectedIds(data.items.filter((item) => item.isSelected).map((item) => item.id));
      setOverrides({});
      setEditingItemIds([]);
      setCommitResult(null);
    },
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!batchDetail) throw new Error('No preview data');
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
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!batchDetail) throw new Error('No batch to export');
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

  const startEditing = (itemId: number) => {
    setEditingItemIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
  };

  const stopEditing = (itemId: number) => {
    setEditingItemIds((prev) => prev.filter((id) => id !== itemId));
  };

  const cancelEditing = (itemId: number) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    stopEditing(itemId);
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

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>Import CSV Worklog</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload CSV để preview, chọn record cần import vào StepScreenFunctionMember, sau đó xác nhận commit.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
          <input type="file" accept=".csv,text/csv" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
          <Button variant="contained" onClick={() => previewMutation.mutate()} disabled={!selectedFile || previewMutation.isPending}>
            Preview
          </Button>
          {batchDetail && (
            <>
              <Button variant="contained" color="success" onClick={() => commitMutation.mutate()} disabled={selectedIds.length === 0 || commitMutation.isPending}>
                Commit Selected ({selectedIds.length})
              </Button>
              <Button variant="outlined" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
                Export Unselected
              </Button>
            </>
          )}
        </Box>

        {previewMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Preview failed</Alert>}
        {commitMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Commit failed</Alert>}

        {commitResult && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Commit result: success {commitResult.success}, failed {commitResult.failed}, skipped {commitResult.skipped}, total {commitResult.total}
          </Alert>
        )}

        {batchDetail && (
          <>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip label={`Total: ${batchDetail.summary.total}`} />
              <Chip color="success" label={`Ready: ${batchDetail.summary.ready}`} />
              <Chip color="warning" label={`Needs review: ${batchDetail.summary.needsReview}`} />
              <Chip color="error" label={`Unmapped: ${batchDetail.summary.unmapped}`} />
            </Box>

            <Box sx={{ mb: 1 }}>
              <Checkbox
                checked={allSelected}
                indeterminate={!allSelected && selectedIds.length > 0}
                onChange={(e) => setSelectedIds(e.target.checked ? selectableIds : [])}
              />
              Select all rows with enough mapping data (member + step + screen/function)
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Chỉ khi nhấn <strong>Edit</strong> ở từng dòng thì mới có thể chỉnh Stage/Step/Screen Function.
            </Typography>

            <TableContainer component={Paper} sx={{ maxHeight: 460 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Select</TableCell>
                    <TableCell>Day</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Work detail</TableCell>
                    <TableCell>Member</TableCell>
                    <TableCell>Stage</TableCell>
                    <TableCell>Step</TableCell>
                    <TableCell>Screen/Function</TableCell>
                    <TableCell>Minutes</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batchDetail.items.map((item) => {
                    const effectiveStageId = getEffectiveValue(item.id, 'stageId', item.stageId);
                    const effectiveStepId = getEffectiveValue(item.id, 'stepId', item.stepId);
                    const effectiveScreenFunctionId = getEffectiveValue(item.id, 'screenFunctionId', item.screenFunctionId);
                    const stage = stageOptions.find((s: any) => s.id === Number(effectiveStageId));
                    const stepOptions = stage?.steps || [];
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
                        <TableCell sx={{ minWidth: 170 }}>
                          {editingItemIds.includes(item.id) ? (
                            <TextField
                              select
                              size="small"
                              fullWidth
                              value={effectiveStageId || ''}
                              onChange={(e) => {
                                const nextStageId = parseOptionalNumber(e.target.value);
                                updateOverride(item.id, { stageId: nextStageId, stepId: undefined });
                              }}
                            >
                              <MenuItem value="">-</MenuItem>
                              {stageOptions.map((s: any) => (
                                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                              ))}
                            </TextField>
                          ) : (
                            <Typography variant="body2" sx={{ py: 1 }}>{stage?.name || '-'}</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ minWidth: 170 }}>
                          {editingItemIds.includes(item.id) ? (
                            <TextField
                              select
                              size="small"
                              fullWidth
                              value={effectiveStepId || ''}
                              onChange={(e) => updateOverride(item.id, { stepId: parseOptionalNumber(e.target.value) })}
                            >
                              <MenuItem value="">-</MenuItem>
                              {stepOptions.map((sp: any) => (
                                <MenuItem key={sp.id} value={sp.id}>{sp.name}</MenuItem>
                              ))}
                            </TextField>
                          ) : (
                            <Typography variant="body2" sx={{ py: 1 }}>
                              {stepOptions.find((sp: any) => sp.id === Number(effectiveStepId))?.name || item.step?.name || '-'}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ minWidth: 220 }}>
                          {editingItemIds.includes(item.id) ? (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <TextField
                                select
                                size="small"
                                fullWidth
                                value={effectiveScreenFunctionId || ''}
                                onChange={(e) => updateOverride(item.id, { screenFunctionId: parseOptionalNumber(e.target.value) })}
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
                                  createScreenFunctionMutation.mutate({
                                    itemId: item.id,
                                    suggestedName: buildSuggestedScreenFunctionName(item.workDetail),
                                  })
                                }
                                disabled={createScreenFunctionMutation.isPending}
                              >
                                +
                              </Button>
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ py: 1 }}>
                              {(screenFunctions || []).find((sf: any) => sf.id === Number(effectiveScreenFunctionId))?.name || item.screenFunction?.name || '-'}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{item.minutes || 0}</TableCell>
                        <TableCell>
                          <Chip size="small" color={getStatusColor(item.status) as any} label={item.status} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>{item.reason || '-'}</TableCell>
                        <TableCell align="center" sx={{ minWidth: 180 }}>
                          {!editingItemIds.includes(item.id) ? (
                            <Button size="small" variant="outlined" onClick={() => startEditing(item.id)}>Edit</Button>
                          ) : (
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                              <Button size="small" variant="contained" onClick={() => stopEditing(item.id)}>Done</Button>
                              <Button size="small" variant="text" color="inherit" onClick={() => cancelEditing(item.id)}>Cancel</Button>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
