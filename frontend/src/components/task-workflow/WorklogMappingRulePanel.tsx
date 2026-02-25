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
import Checkbox from '@mui/material/Checkbox';
import TableSortLabel from '@mui/material/TableSortLabel';
import { useTranslation } from 'react-i18next';

interface Props {
  projectId: number;
}

export function WorklogMappingRulePanel({ projectId }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [stageId, setStageId] = useState<number | ''>('');
  const [stepId, setStepId] = useState<number | ''>('');
  const [priority, setPriority] = useState<number>(100);
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ keyword: string; stageId: number; stepId: number; confidence: number; reason?: string }>>([]);
  const [selectedSuggestionKeys, setSelectedSuggestionKeys] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'keyword' | 'stageStep'>('keyword');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
      if (!aiFile) throw new Error(t('worklogMapping.errors.selectCsv', { defaultValue: 'Please choose CSV file' }));
      return taskWorkflowApi.aiSuggestWorklogMappingRules(projectId, aiFile, false);
    },
    onSuccess: (res) => {
      const suggestions = res.data.suggestions || [];
      setAiSuggestions(suggestions);
      setSelectedSuggestionKeys(suggestions.map((s) => `${s.keyword}|${s.stageId}|${s.stepId}|${s.reason || ''}`));
    },
  });

  const suggestionKey = (suggestion: {
    keyword: string;
    stageId: number;
    stepId: number;
    reason?: string;
  }) => `${suggestion.keyword}|${suggestion.stageId}|${suggestion.stepId}|${suggestion.reason || ''}`;

  const selectedSuggestions = aiSuggestions.filter((s) =>
    selectedSuggestionKeys.includes(suggestionKey(s)),
  );

  const allSuggestionsSelected =
    aiSuggestions.length > 0 && selectedSuggestionKeys.length === aiSuggestions.length;

  const sortedAiSuggestions = useMemo(() => {
    const rows = [...aiSuggestions];
    rows.sort((a, b) => {
      const stageA = stageOptions.find((st: any) => st.id === a.stageId)?.name || String(a.stageId);
      const stepA = stageOptions.find((st: any) => st.id === a.stageId)?.steps?.find((sp: any) => sp.id === a.stepId)?.name || String(a.stepId);
      const stageB = stageOptions.find((st: any) => st.id === b.stageId)?.name || String(b.stageId);
      const stepB = stageOptions.find((st: any) => st.id === b.stageId)?.steps?.find((sp: any) => sp.id === b.stepId)?.name || String(b.stepId);

      const valueA = sortBy === 'keyword' ? a.keyword.toLowerCase() : `${stageA} / ${stepA}`.toLowerCase();
      const valueB = sortBy === 'keyword' ? b.keyword.toLowerCase() : `${stageB} / ${stepB}`.toLowerCase();

      const compared = valueA.localeCompare(valueB);
      return sortDirection === 'asc' ? compared : -compared;
    });
    return rows;
  }, [aiSuggestions, sortBy, sortDirection, stageOptions]);

  const handleSort = (field: 'keyword' | 'stageStep') => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const applyAiMutation = useMutation({
    mutationFn: async () => {
      let created = 0;
      for (const s of selectedSuggestions) {
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
      setSelectedSuggestionKeys([]);
    },
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Worklog Keyword Mapping (Stage → Step)</Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr auto' }, gap: 1.5, mb: 2 }}>
          <TextField label={t('worklogMapping.form.keyword', { defaultValue: 'Keyword' })} size="small" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <TextField select label={t('taskWorkflow.stage', { defaultValue: 'Stage' })} size="small" value={stageId} onChange={(e) => { setStageId(Number(e.target.value)); setStepId(''); }}>
            {stageOptions.map((stage: any) => <MenuItem key={stage.id} value={stage.id}>{stage.name}</MenuItem>)}
          </TextField>
          <TextField select label={t('taskWorkflow.step', { defaultValue: 'Step' })} size="small" value={stepId} onChange={(e) => setStepId(Number(e.target.value))}>
            {stepOptions.map((step: any) => <MenuItem key={step.id} value={step.id}>{step.name}</MenuItem>)}
          </TextField>
          <TextField type="number" label={t('common.priority', { defaultValue: 'Priority' })} size="small" value={priority} onChange={(e) => setPriority(Number(e.target.value) || 100)} />
          <Button variant="contained" onClick={() => createMutation.mutate()} disabled={!keyword || !stageId || !stepId || createMutation.isPending}>{t('common.add')}</Button>
        </Box>

        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>{t('worklogMapping.ai.title', { defaultValue: 'AI suggest keywords from CSV' })}</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="file" accept=".csv,text/csv" onChange={(e) => setAiFile(e.target.files?.[0] || null)} />
            <Button variant="outlined" onClick={() => aiSuggestMutation.mutate()} disabled={!aiFile || aiSuggestMutation.isPending}>{t('worklogMapping.ai.suggest', { defaultValue: 'Suggest' })}</Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => applyAiMutation.mutate()}
              disabled={selectedSuggestions.length === 0 || applyAiMutation.isPending}
            >
              {t('worklogMapping.ai.applySelected', { defaultValue: 'Apply selected' })} ({selectedSuggestions.length})
            </Button>
          </Box>
          {aiSuggestMutation.isError && <Alert severity="error" sx={{ mt: 1 }}>{t('worklogMapping.ai.failed', { defaultValue: 'AI suggest failed' })}</Alert>}
          {aiSuggestions.length > 0 && (
            <TableContainer component={Paper} sx={{ maxHeight: 240, mt: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={allSuggestionsSelected}
                        indeterminate={!allSuggestionsSelected && selectedSuggestionKeys.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSuggestionKeys(
                              aiSuggestions.map((s) => suggestionKey(s)),
                            );
                          } else {
                            setSelectedSuggestionKeys([]);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'keyword'}
                        direction={sortBy === 'keyword' ? sortDirection : 'asc'}
                        onClick={() => handleSort('keyword')}
                       >
                        {t('worklogMapping.table.keyword', { defaultValue: 'Keyword' })}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'stageStep'}
                        direction={sortBy === 'stageStep' ? sortDirection : 'asc'}
                        onClick={() => handleSort('stageStep')}
                       >
                        {t('worklogMapping.table.stageStep', { defaultValue: 'Stage/Step' })}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>{t('worklogMapping.ai.confidence', { defaultValue: 'Confidence' })}</TableCell>
                    <TableCell>{t('worklogImport.table.reason', { defaultValue: 'Reason' })}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedAiSuggestions.map((s) => {
                    const stage = stageOptions.find((st: any) => st.id === s.stageId);
                    const step = stage?.steps?.find((sp: any) => sp.id === s.stepId);
                    const key = suggestionKey(s);
                    return (
                      <TableRow key={key}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={selectedSuggestionKeys.includes(key)}
                            onChange={(e) => {
                              setSelectedSuggestionKeys((prev) =>
                                e.target.checked
                                  ? [...prev, key]
                                  : prev.filter((x) => x !== key),
                              );
                            }}
                          />
                        </TableCell>
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
                <TableCell>{t('worklogMapping.table.keyword', { defaultValue: 'Keyword' })}</TableCell>
                <TableCell>{t('worklogMapping.table.stageStep', { defaultValue: 'Stage/Step' })}</TableCell>
                <TableCell>{t('common.priority', { defaultValue: 'Priority' })}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="right">{t('worklogImport.table.action', { defaultValue: 'Action' })}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(rules || []).map((rule: any) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.keyword}</TableCell>
                  <TableCell>{rule.stage?.name || rule.stageId} / {rule.step?.name || rule.stepId}</TableCell>
                  <TableCell>{rule.priority}</TableCell>
                  <TableCell>{rule.isActive ? t('common.active', { defaultValue: 'Active' }) : t('common.inactive', { defaultValue: 'Inactive' })}</TableCell>
                  <TableCell align="right">
                    <Button color="error" size="small" onClick={() => deleteMutation.mutate(rule.id)}>{t('common.delete')}</Button>
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
