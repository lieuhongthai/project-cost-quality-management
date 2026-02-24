import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { taskWorkflowApi } from '@/services/api';
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

interface WorklogImportPanelProps {
  projectId: number;
}

export function WorklogImportPanel({ projectId }: WorklogImportPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchDetail, setBatchDetail] = useState<WorklogImportBatchDetail | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [commitResult, setCommitResult] = useState<null | {
    success: number;
    failed: number;
    skipped: number;
    total: number;
  }>(null);

  const previewMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error('Please select a CSV file');
      return taskWorkflowApi.previewWorklogImport(projectId, selectedFile);
    },
    onSuccess: (response) => {
      const data = response.data;
      setBatchDetail(data);
      setSelectedIds(data.items.filter((item) => item.isSelected).map((item) => item.id));
      setCommitResult(null);
    },
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!batchDetail) throw new Error('No preview data');
      const response = await taskWorkflowApi.commitWorklogImport({
        batchId: batchDetail.batch.id,
        selectedItemIds: selectedIds,
      });
      const refreshed = await taskWorkflowApi.getWorklogImportBatch(batchDetail.batch.id);
      setBatchDetail(refreshed.data);
      return response;
    },
    onSuccess: (response) => {
      setCommitResult(response.data);
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

  const selectableIds = useMemo(
    () => batchDetail?.items.filter((item) => item.status === 'ready' || item.status === 'needs_review').map((item) => item.id) || [],
    [batchDetail],
  );

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  const toggleSelected = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const getStatusColor = (status: string) => {
    if (status === 'ready' || status === 'committed') return 'success';
    if (status === 'needs_review') return 'warning';
    if (status === 'error' || status === 'unmapped') return 'error';
    return 'default';
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>Import CSV Worklog</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload CSV để preview, chọn record cần import vào StepScreenFunctionMember, sau đó xác nhận commit.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <Button
            variant="contained"
            onClick={() => previewMutation.mutate()}
            disabled={!selectedFile || previewMutation.isPending}
          >
            Preview
          </Button>
          {batchDetail && (
            <>
              <Button
                variant="contained"
                color="success"
                onClick={() => commitMutation.mutate()}
                disabled={selectedIds.length === 0 || commitMutation.isPending}
              >
                Commit Selected ({selectedIds.length})
              </Button>
              <Button
                variant="outlined"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
              >
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
              Select all ready / needs_review
            </Box>

            <TableContainer component={Paper} sx={{ maxHeight: 420 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Select</TableCell>
                    <TableCell>Day</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Work detail</TableCell>
                    <TableCell>Member</TableCell>
                    <TableCell>Stage/Step</TableCell>
                    <TableCell>Minutes</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batchDetail.items.map((item) => {
                    const canSelect = item.status === 'ready' || item.status === 'needs_review';
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(item.id)}
                            disabled={!canSelect}
                            onChange={(e) => toggleSelected(item.id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>{item.day || '-'}</TableCell>
                        <TableCell>{item.email || '-'}</TableCell>
                        <TableCell sx={{ maxWidth: 300 }}>{item.workDetail || '-'}</TableCell>
                        <TableCell>{item.member?.name || '-'}</TableCell>
                        <TableCell>{item.stage?.name || '-'} / {item.step?.name || '-'}</TableCell>
                        <TableCell>{item.minutes || 0}</TableCell>
                        <TableCell>
                          <Chip size="small" color={getStatusColor(item.status) as any} label={item.status} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>{item.reason || '-'}</TableCell>
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
