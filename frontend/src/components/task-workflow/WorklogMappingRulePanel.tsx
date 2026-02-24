import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskWorkflowApi } from '@/services/api';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';

interface Props {
  projectId: number;
}

export function WorklogMappingRulePanel({ projectId }: Props) {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [stageId, setStageId] = useState<number | ''>('');
  const [stepId, setStepId] = useState<number | ''>('');
  const [priority, setPriority] = useState<number>(100);
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ keyword: string; stageId: number; stepId: number; confidence: number; reason?: string }>>([]);

  const { data: config } = useQuery({
    queryKey: ['workflowConfig', projectId],
    queryFn: async () => (await taskWorkflowApi.getConfiguration(projectId)).data,
  });

  const { data: rules } = useQuery({
    queryKey: ['worklogMappingRules', projectId],
    queryFn: async () => (await taskWorkflowApi.getWorklogMappingRules(projectId)).data,
  });

  const stageOptions = config?.stages || [];
  const stepOptions = useMemo(() => {
    const stage = stageOptions.find((s: any) => s.id === Number(stageId));
    return stage?.steps || [];
  }, [stageOptions, stageId]);

  const createMutation = useMutation({
    mutationFn: () => taskWorkflowApi.createWorklogMappingRule({
      projectId,
      keyword,
      stageId: Number(stageId),
      stepId: Number(stepId),
      priority,
      isActive: true,
    }),
    onSuccess: () => {
      setKeyword('');
      queryClient.invalidateQueries({ queryKey: ['worklogMappingRules', projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => taskWorkflowApi.deleteWorklogMappingRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['worklogMappingRules', projectId] }),
  });

  const aiSuggestMutation = useMutation({
    mutationFn: () => {
      if (!aiFile) throw new Error('Please choose csv file');
      return taskWorkflowApi.aiSuggestWorklogMappingRules(projectId, aiFile, false);
    },
    onSuccess: (res) => {
      setAiSuggestions(res.data.suggestions || []);
    },
  });

  const applyAiMutation = useMutation({
    mutationFn: async () => {
      let created = 0;
      for (const s of aiSuggestions) {
        await taskWorkflowApi.createWorklogMappingRule({
          projectId,
          keyword: s.keyword,
          stageId: s.stageId,
          stepId: s.stepId,
          priority: Math.round((s.confidence || 0.7) * 100),
          isActive: true,
        });
        created += 1;
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklogMappingRules', projectId] });
      setAiSuggestions([]);
    },
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Worklog Keyword Mapping (Stage → Step)</Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr auto' }, gap: 1.5, mb: 2 }}>
          <TextField label="Keyword" size="small" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <TextField select label="Stage" size="small" value={stageId} onChange={(e) => { setStageId(Number(e.target.value)); setStepId(''); }}>
            {stageOptions.map((stage: any) => <MenuItem key={stage.id} value={stage.id}>{stage.name}</MenuItem>)}
          </TextField>
          <TextField select label="Step" size="small" value={stepId} onChange={(e) => setStepId(Number(e.target.value))}>
            {stepOptions.map((step: any) => <MenuItem key={step.id} value={step.id}>{step.name}</MenuItem>)}
          </TextField>
          <TextField type="number" label="Priority" size="small" value={priority} onChange={(e) => setPriority(Number(e.target.value) || 100)} />
          <Button variant="contained" onClick={() => createMutation.mutate()} disabled={!keyword || !stageId || !stepId || createMutation.isPending}>Add</Button>
        </Box>

        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>AI suggest keywords from CSV</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="file" accept=".csv,text/csv" onChange={(e) => setAiFile(e.target.files?.[0] || null)} />
            <Button variant="outlined" onClick={() => aiSuggestMutation.mutate()} disabled={!aiFile || aiSuggestMutation.isPending}>Suggest</Button>
            <Button variant="contained" color="success" onClick={() => applyAiMutation.mutate()} disabled={aiSuggestions.length === 0 || applyAiMutation.isPending}>Apply suggestions ({aiSuggestions.length})</Button>
          </Box>
          {aiSuggestMutation.isError && <Alert severity="error" sx={{ mt: 1 }}>AI suggest failed</Alert>}
          {aiSuggestions.length > 0 && (
            <TableContainer component={Paper} sx={{ maxHeight: 240, mt: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Keyword</TableCell>
                    <TableCell>Stage/Step</TableCell>
                    <TableCell>Confidence</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aiSuggestions.map((s, idx) => {
                    const stage = stageOptions.find((st: any) => st.id === s.stageId);
                    const step = stage?.steps?.find((sp: any) => sp.id === s.stepId);
                    return (
                      <TableRow key={`${s.keyword}-${idx}`}>
                        <TableCell>{s.keyword}</TableCell>
                        <TableCell>{stage?.name || s.stageId} / {step?.name || s.stepId}</TableCell>
                        <TableCell>{Math.round((s.confidence || 0) * 100)}%</TableCell>
                        <TableCell>{s.reason || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        <TableContainer component={Paper} sx={{ maxHeight: 320 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Keyword</TableCell>
                <TableCell>Stage/Step</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(rules || []).map((rule: any) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.keyword}</TableCell>
                  <TableCell>{rule.stage?.name || rule.stageId} / {rule.step?.name || rule.stepId}</TableCell>
                  <TableCell>{rule.priority}</TableCell>
                  <TableCell>{rule.isActive ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell align="right">
                    <Button color="error" size="small" onClick={() => deleteMutation.mutate(rule.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
