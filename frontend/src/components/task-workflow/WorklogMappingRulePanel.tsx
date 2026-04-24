import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi, screenFunctionApi, taskWorkflowApi } from '@/services/api';
import { DataTable } from '@/components/common/DataTable';
import type { ColumnDef } from '@/components/common/DataTable';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { useTranslation } from 'react-i18next';

interface Props {
  projectId: number;
}

interface CopyPreviewRow {
  keyword: string;
  priority: number;
  isActive: boolean;
  sourceStageName: string;
  sourceStepName: string;
  sourceScreenFunctionName: string;
  targetStageId: number | null;
  targetStepId: number | null;
  targetScreenFunctionId: number | null;
  matched: boolean;
}

export function WorklogMappingRulePanel({ projectId }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // ── manual add form ──────────────────────────────────────────────
  const [keyword, setKeyword] = useState('');
  const [stageId, setStageId] = useState<number | ''>('');
  const [stepId, setStepId] = useState<number | ''>('');
  const [screenFunctionId, setScreenFunctionId] = useState<number | ''>('');
  const [priority, setPriority] = useState<number>(100);

  // ── AI suggest ───────────────────────────────────────────────────
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ keyword: string; stageId: number; stepId: number; confidence: number; reason?: string }>>([]);
  const [selectedSuggestionKeys, setSelectedSuggestionKeys] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'keyword' | 'stageStep'>('keyword');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // ── rules table sort ─────────────────────────────────────────────
  const [ruleSortBy, setRuleSortBy] = useState<'keyword' | 'stageStep'>('keyword');
  const [ruleSortDirection, setRuleSortDirection] = useState<'asc' | 'desc'>('asc');

  // ── copy from project ────────────────────────────────────────────
  const [copySourceProjectId, setCopySourceProjectId] = useState<number | ''>('');
  const [copyPreviewRows, setCopyPreviewRows] = useState<CopyPreviewRow[]>([]);
  const [selectedCopyKeys, setSelectedCopyKeys] = useState<string[]>([]);
  const [copyApplyResult, setCopyApplyResult] = useState<{ added: number; overwritten: number; unmatched: number } | null>(null);

  // ── edit modal ───────────────────────────────────────────────────
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [editKeyword, setEditKeyword] = useState('');
  const [editStageId, setEditStageId] = useState<number | ''>('');
  const [editStepId, setEditStepId] = useState<number | ''>('');
  const [editScreenFunctionId, setEditScreenFunctionId] = useState<number | ''>('');
  const [editPriority, setEditPriority] = useState<number>(100);
  const [editIsActive, setEditIsActive] = useState(true);

  // ── queries ──────────────────────────────────────────────────────
  const { data: config } = useQuery({
    queryKey: ['workflowConfig', projectId],
    queryFn: async () => (await taskWorkflowApi.getConfiguration(projectId)).data,
  });

  const { data: rules } = useQuery({
    queryKey: ['worklogMappingRules', projectId],
    queryFn: async () => (await taskWorkflowApi.getWorklogMappingRules(projectId)).data,
  });

  const { data: allProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await projectApi.getAll()).data,
  });
  const { data: screenFunctions = [] } = useQuery({
    queryKey: ['screenFunctions', projectId],
    queryFn: async () => (await screenFunctionApi.getByProject(projectId)).data,
  });

  const stageOptions = config?.stages || [];
  const otherProjects = (allProjects || []).filter((p: any) => p.id !== projectId);
  const screenFunctionByName = useMemo(() => {
    const map = new Map<string, any>();
    (screenFunctions || []).forEach((sf: any) => {
      map.set(sf.name.trim().toLowerCase(), sf);
    });
    return map;
  }, [screenFunctions]);

  const stepOptions = useMemo(() => {
    const stage = stageOptions.find((s: any) => s.id === Number(stageId));
    return stage?.steps || [];
  }, [stageOptions, stageId]);

  const editStepOptions = useMemo(() => {
    const stage = stageOptions.find((s: any) => s.id === Number(editStageId));
    return stage?.steps || [];
  }, [stageOptions, editStageId]);

  // ── mutations ────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () => taskWorkflowApi.createWorklogMappingRule({
      projectId,
      keyword,
      stageId: stageId ? Number(stageId) : undefined,
      stepId: stepId ? Number(stepId) : undefined,
      screenFunctionId: screenFunctionId ? Number(screenFunctionId) : undefined,
      priority,
      isActive: true,
    }),
    onSuccess: () => {
      setKeyword('');
      setScreenFunctionId('');
      queryClient.invalidateQueries({ queryKey: ['worklogMappingRules', projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => taskWorkflowApi.deleteWorklogMappingRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['worklogMappingRules', projectId] }),
  });

  const updateMutation = useMutation({
    mutationFn: () => taskWorkflowApi.updateWorklogMappingRule(editingRule!.id, {
      keyword: editKeyword,
      stageId: editStageId ? Number(editStageId) : undefined,
      stepId: editStepId ? Number(editStepId) : undefined,
      screenFunctionId: editScreenFunctionId ? Number(editScreenFunctionId) : undefined,
      priority: editPriority,
      isActive: editIsActive,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklogMappingRules', projectId] });
      setEditingRule(null);
    },
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

  const applyAiMutation = useMutation({
    mutationFn: async () => {
      let created = 0;
      for (const s of selectedSuggestions) {
        await taskWorkflowApi.createWorklogMappingRule({
          projectId,
          keyword: s.keyword,
          stageId: s.stageId,
          stepId: s.stepId,
          screenFunctionId: undefined,
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

  // Load preview: fetch source rules and match by name against current project config
  const loadCopyPreviewMutation = useMutation({
    mutationFn: async () => {
      if (!copySourceProjectId) throw new Error('Select a source project');
      const sourceRules = (await taskWorkflowApi.getWorklogMappingRules(Number(copySourceProjectId))).data;

      const stageByName = new Map<string, any>();
      const stepByStageAndName = new Map<string, any>();
      stageOptions.forEach((stage: any) => {
        stageByName.set(stage.name.trim().toLowerCase(), stage);
        (stage.steps || []).forEach((step: any) => {
          stepByStageAndName.set(`${stage.id}::${step.name.trim().toLowerCase()}`, step);
        });
      });

      return (sourceRules as any[]).map((rule): CopyPreviewRow => {
        const sourceStageName = rule.stage?.name || '';
        const sourceStepName = rule.step?.name || '';
        const sourceScreenFunctionName = rule.screenFunction?.name || '';
        const targetStage = sourceStageName ? stageByName.get(sourceStageName.trim().toLowerCase()) : undefined;
        const targetStep = targetStage && sourceStepName
          ? stepByStageAndName.get(`${targetStage.id}::${sourceStepName.trim().toLowerCase()}`)
          : undefined;
        const targetScreenFunction = sourceScreenFunctionName
          ? screenFunctionByName.get(sourceScreenFunctionName.trim().toLowerCase())
          : undefined;
        return {
          keyword: rule.keyword,
          priority: rule.priority,
          isActive: rule.isActive,
          sourceStageName,
          sourceStepName,
          sourceScreenFunctionName,
          targetStageId: targetStage?.id ?? null,
          targetStepId: targetStep?.id ?? null,
          targetScreenFunctionId: targetScreenFunction?.id ?? null,
          matched: !!(targetStage && targetStep && (!sourceScreenFunctionName || targetScreenFunction)),
        };
      });
    },
    onSuccess: (rows) => {
      setCopyPreviewRows(rows);
      setSelectedCopyKeys(rows.map((r) => r.keyword));
      setCopyApplyResult(null);
    },
  });

  // Apply selected: upsert into target project
  const applyCopyMutation = useMutation({
    mutationFn: async () => {
      const selected = copyPreviewRows.filter((r) => selectedCopyKeys.includes(r.keyword));
      let added = 0;
      let overwritten = 0;
      let unmatched = 0;
      for (const row of selected) {
        if (!row.matched) unmatched++;
        const existingRule = (rules as any[] || []).find(
          (r: any) => r.keyword.toLowerCase() === row.keyword.toLowerCase(),
        );
        if (existingRule) {
          await taskWorkflowApi.updateWorklogMappingRule(existingRule.id, {
            stageId: row.targetStageId ?? undefined,
            stepId: row.targetStepId ?? undefined,
            screenFunctionId: row.targetScreenFunctionId ?? undefined,
            priority: row.priority,
          });
          overwritten++;
        } else {
          await taskWorkflowApi.createWorklogMappingRule({
            projectId,
            keyword: row.keyword,
            stageId: row.targetStageId ?? undefined,
            stepId: row.targetStepId ?? undefined,
            screenFunctionId: row.targetScreenFunctionId ?? undefined,
            priority: row.priority,
            isActive: row.isActive,
          });
          added++;
        }
      }
      return { added, overwritten, unmatched };
    },
    onSuccess: (result) => {
      setCopyApplyResult(result);
      queryClient.invalidateQueries({ queryKey: ['worklogMappingRules', projectId] });
      setCopyPreviewRows([]);
      setSelectedCopyKeys([]);
    },
  });

  // ── helpers ──────────────────────────────────────────────────────
  const suggestionKey = (s: { keyword: string; stageId: number; stepId: number; reason?: string }) =>
    `${s.keyword}|${s.stageId}|${s.stepId}|${s.reason || ''}`;

  const selectedSuggestions = aiSuggestions.filter((s) => selectedSuggestionKeys.includes(suggestionKey(s)));
  const sortedAiSuggestions = useMemo(() => {
    const rows = [...aiSuggestions];
    rows.sort((a, b) => {
      const stageA = stageOptions.find((st: any) => st.id === a.stageId)?.name || String(a.stageId);
      const stepA = stageOptions.find((st: any) => st.id === a.stageId)?.steps?.find((sp: any) => sp.id === a.stepId)?.name || String(a.stepId);
      const stageB = stageOptions.find((st: any) => st.id === b.stageId)?.name || String(b.stageId);
      const stepB = stageOptions.find((st: any) => st.id === b.stageId)?.steps?.find((sp: any) => sp.id === b.stepId)?.name || String(b.stepId);
      const valueA = sortBy === 'keyword' ? a.keyword.toLowerCase() : `${stageA} / ${stepA}`.toLowerCase();
      const valueB = sortBy === 'keyword' ? b.keyword.toLowerCase() : `${stageB} / ${stepB}`.toLowerCase();
      return sortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    });
    return rows;
  }, [aiSuggestions, sortBy, sortDirection, stageOptions]);

  const sortedRules = useMemo(() => {
    const rows = [...(rules as any[] || [])];
    rows.sort((a, b) => {
      const stageA = a.stage?.name || '';
      const stepA = a.step?.name || '';
      const stageB = b.stage?.name || '';
      const stepB = b.step?.name || '';
      const valueA = ruleSortBy === 'keyword' ? String(a.keyword || '').toLowerCase() : `${stageA} / ${stepA}`.toLowerCase();
      const valueB = ruleSortBy === 'keyword' ? String(b.keyword || '').toLowerCase() : `${stageB} / ${stepB}`.toLowerCase();
      return ruleSortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    });
    return rows;
  }, [rules, ruleSortBy, ruleSortDirection]);

  const openEdit = (rule: any) => {
    setEditingRule(rule);
    setEditKeyword(rule.keyword);
    setEditStageId(rule.stageId || '');
    setEditStepId(rule.stepId || '');
    setEditScreenFunctionId(rule.screenFunctionId || '');
    setEditPriority(rule.priority ?? 100);
    setEditIsActive(rule.isActive ?? true);
  };

  const isUnmappedRule = (rule: any) => (!rule.stageId || !rule.stepId) && !rule.screenFunctionId;

  // ── render ───────────────────────────────────────────────────────
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('worklogMapping.title', { defaultValue: 'Worklog Keyword Mapping (Stage → Step → Screen/Function)' })}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('worklogMapping.description', {
            defaultValue: 'Bạn có thể map Stage/Step và Screen/Function độc lập theo keyword. Mỗi phần nhận diện được xử lý riêng khi import CSV.',
          })}
        </Typography>

        {/* Manual add form */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr 1fr auto' }, gap: 1.5, mb: 2 }}>
          <TextField label={t('worklogMapping.form.keyword', { defaultValue: 'Keyword' })} size="small" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Autocomplete
            size="small"
            options={stageOptions}
            value={stageOptions.find((stage: any) => stage.id === stageId) || null}
            onChange={(_, value) => { setStageId(value?.id ?? ''); setStepId(''); }}
            getOptionLabel={(option: any) => option.name}
            isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
            renderInput={(params) => <TextField {...params} label={t('taskWorkflow.stage', { defaultValue: 'Stage' })} />}
          />
          <Autocomplete
            size="small"
            options={stepOptions}
            value={stepOptions.find((step: any) => step.id === stepId) || null}
            onChange={(_, value) => setStepId(value?.id ?? '')}
            getOptionLabel={(option: any) => option.name}
            isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
            renderInput={(params) => <TextField {...params} label={t('taskWorkflow.step', { defaultValue: 'Step' })} />}
          />
          <Autocomplete
            size="small"
            options={screenFunctions}
            value={(screenFunctions || []).find((sf: any) => sf.id === screenFunctionId) || null}
            onChange={(_, value: any) => setScreenFunctionId(value?.id ?? '')}
            getOptionLabel={(option: any) => option.name}
            isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
            renderInput={(params) => <TextField {...params} label={t('worklogImport.table.screenFunction', { defaultValue: 'Screen/Function' })} />}
          />
          <TextField type="number" label={t('common.priority', { defaultValue: 'Priority' })} size="small" value={priority} onChange={(e) => setPriority(Number(e.target.value) || 100)} />
          <Button variant="contained" onClick={() => createMutation.mutate()} disabled={!keyword || createMutation.isPending}>{t('common.add')}</Button>
        </Box>

        {/* AI suggest */}
        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>{t('worklogMapping.ai.title', { defaultValue: 'AI suggest keywords from CSV' })}</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="file" accept=".csv,text/csv" onChange={(e) => setAiFile(e.target.files?.[0] || null)} />
            <Button variant="outlined" onClick={() => aiSuggestMutation.mutate()} disabled={!aiFile || aiSuggestMutation.isPending}>{t('worklogMapping.ai.suggest', { defaultValue: 'Suggest' })}</Button>
            <Button variant="contained" color="success" onClick={() => applyAiMutation.mutate()} disabled={selectedSuggestions.length === 0 || applyAiMutation.isPending}>
              {t('worklogMapping.ai.applySelected', { defaultValue: 'Apply selected' })} ({selectedSuggestions.length})
            </Button>
          </Box>
          {aiSuggestMutation.isError && <Alert severity="error" sx={{ mt: 1 }}>{t('worklogMapping.ai.failed', { defaultValue: 'AI suggest failed' })}</Alert>}
          {aiSuggestions.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <DataTable
                columns={[
                  {
                    key: 'keyword',
                    header: t('worklogMapping.table.keyword', { defaultValue: 'Keyword' }),
                    sortable: true,
                    render: (s) => s.keyword,
                  },
                  {
                    key: 'stageStep',
                    header: t('worklogMapping.table.stageStep', { defaultValue: 'Stage/Step' }),
                    sortable: true,
                    render: (s) => {
                      const stage = stageOptions.find((st: any) => st.id === s.stageId);
                      const step = stage?.steps?.find((sp: any) => sp.id === s.stepId);
                      return `${stage?.name || s.stageId} / ${step?.name || s.stepId}`;
                    },
                  },
                  {
                    key: 'confidence',
                    header: t('worklogMapping.ai.confidence', { defaultValue: 'Confidence' }),
                    render: (s) => `${Math.round((s.confidence || 0) * 100)}%`,
                  },
                  {
                    key: 'reason',
                    header: t('worklogImport.table.reason', { defaultValue: 'Reason' }),
                    render: (s) => s.reason || '-',
                  },
                ] as ColumnDef<typeof aiSuggestions[0]>[]}
                data={sortedAiSuggestions}
                keyExtractor={(s) => suggestionKey(s)}
                stickyHeader
                maxHeight={240}
                selectable
                selectedKeys={selectedSuggestionKeys}
                onSelectionChange={(keys) => setSelectedSuggestionKeys(keys as string[])}
                sortBy={sortBy}
                sortOrder={sortDirection}
                onSort={(col) => {
                  if (sortBy === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                  else { setSortBy(col as 'keyword' | 'stageStep'); setSortDirection('asc'); }
                }}
              />
            </Box>
          )}
        </Box>

        {/* Copy from project */}
        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {t('worklogMapping.copyFromProject.title', { defaultValue: 'Copy keywords from another project' })}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Autocomplete
              size="small"
              options={otherProjects}
              value={otherProjects.find((p: any) => p.id === copySourceProjectId) || null}
              onChange={(_, value) => { setCopySourceProjectId(value?.id ?? ''); setCopyPreviewRows([]); setSelectedCopyKeys([]); setCopyApplyResult(null); }}
              sx={{ minWidth: 220 }}
              getOptionLabel={(option: any) => option.name}
              isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label={t('worklogMapping.copyFromProject.selectProject', { defaultValue: 'Source project' })} />}
            />
            <Button variant="outlined" onClick={() => loadCopyPreviewMutation.mutate()} disabled={!copySourceProjectId || loadCopyPreviewMutation.isPending}>
              {t('worklogMapping.copyFromProject.load', { defaultValue: 'Load keywords' })}
            </Button>
          </Box>
          {loadCopyPreviewMutation.isError && <Alert severity="error" sx={{ mt: 1 }}>{t('worklogMapping.copyFromProject.loadFailed', { defaultValue: 'Failed to load keywords from source project' })}</Alert>}

          {copyPreviewRows.length > 0 && (
            <>
              <Box sx={{ mt: 1.5 }}>
                <DataTable<CopyPreviewRow>
                  columns={[
                    {
                      key: 'keyword',
                      header: t('worklogMapping.table.keyword', { defaultValue: 'Keyword' }),
                      render: (row) => row.keyword,
                    },
                    {
                      key: 'sourceStageStep',
                      header: t('worklogMapping.copyFromProject.sourceStageStep', { defaultValue: 'Source Stage/Step' }),
                      render: (row) => (
                        <Box sx={{ color: 'text.secondary' }}>
                          {row.sourceStageName || '—'} / {row.sourceStepName || '—'}
                        </Box>
                      ),
                    },
                    {
                      key: 'sourceScreenFunction',
                      header: t('worklogImport.table.screenFunction', { defaultValue: 'Screen/Function' }),
                      render: (row) => row.sourceScreenFunctionName || '—',
                    },
                    {
                      key: 'targetStageStep',
                      header: t('worklogMapping.copyFromProject.targetStageStep', { defaultValue: 'Target Stage/Step' }),
                      render: (row) => {
                        const targetStageName = row.targetStageId
                          ? stageOptions.find((s: any) => s.id === row.targetStageId)?.name
                          : null;
                        const targetStepName = row.targetStageId && row.targetStepId
                          ? stageOptions.find((s: any) => s.id === row.targetStageId)?.steps?.find((sp: any) => sp.id === row.targetStepId)?.name
                          : null;
                        return row.matched
                          ? `${targetStageName || row.targetStageId} / ${targetStepName || row.targetStepId}`
                          : (
                            <Box component="span" sx={{ color: 'warning.main', fontStyle: 'italic' }}>
                              {t('worklogMapping.copyFromProject.noMatch', { defaultValue: 'No match — will save without stage/step/screen function' })}
                            </Box>
                          );
                      },
                    },
                    {
                      key: 'targetScreenFunction',
                      header: t('worklogMapping.copyFromProject.targetScreenFunction', { defaultValue: 'Target Screen/Function' }),
                      render: (row) => {
                        const targetScreenFunctionName = row.targetScreenFunctionId
                          ? (screenFunctions || []).find((sf: any) => sf.id === row.targetScreenFunctionId)?.name
                          : null;
                        if (!row.sourceScreenFunctionName) return '—';
                        return targetScreenFunctionName || (
                          <Box component="span" sx={{ color: 'warning.main', fontStyle: 'italic' }}>
                            {t('worklogMapping.copyFromProject.noScreenFunctionMatch', { defaultValue: 'No screen/function match' })}
                          </Box>
                        );
                      },
                    },
                  ]}
                  data={copyPreviewRows}
                  keyExtractor={(row) => row.keyword}
                  stickyHeader
                  maxHeight={260}
                  selectable
                  selectedKeys={selectedCopyKeys}
                  onSelectionChange={(keys) => setSelectedCopyKeys(keys as string[])}
                />
              </Box>
              <Box sx={{ mt: 1, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Button variant="contained" color="primary" onClick={() => applyCopyMutation.mutate()} disabled={selectedCopyKeys.length === 0 || applyCopyMutation.isPending}>
                  {t('worklogMapping.copyFromProject.applySelected', { defaultValue: 'Copy selected' })} ({selectedCopyKeys.length})
                </Button>
              </Box>
            </>
          )}

          {applyCopyMutation.isError && <Alert severity="error" sx={{ mt: 1 }}>{t('worklogMapping.copyFromProject.failed', { defaultValue: 'Copy failed' })}</Alert>}
          {copyApplyResult && (
            <Alert severity="success" sx={{ mt: 1 }}>
              {t('worklogMapping.copyFromProject.result', {
                defaultValue: 'Done: {{added}} added, {{overwritten}} overwritten. {{unmatched}} keyword(s) saved without full stage/step/screen-function match.',
                added: copyApplyResult.added,
                overwritten: copyApplyResult.overwritten,
                unmatched: copyApplyResult.unmatched,
              })}
            </Alert>
          )}
        </Box>

        {/* Existing rules table */}
        <DataTable
          columns={[
            {
              key: 'keyword',
              header: t('worklogMapping.table.keyword', { defaultValue: 'Keyword' }),
              sortable: true,
              render: (rule: any) => {
                const missing = isUnmappedRule(rule);
                return missing
                  ? <Box component="span" sx={{ color: 'warning.main' }}>{rule.keyword} *</Box>
                  : rule.keyword;
              },
            },
            {
              key: 'stageStep',
              header: t('worklogMapping.table.stageStep', { defaultValue: 'Stage/Step' }),
              sortable: true,
              render: (rule: any) => {
                const missing = !rule.stageId || !rule.stepId;
                return missing
                  ? <Box component="span" sx={{ color: 'warning.main', fontStyle: 'italic' }}>
                      {t('worklogMapping.noStageStep', { defaultValue: 'No stage/step assigned' })}
                    </Box>
                  : `${rule.stage?.name || rule.stageId} / ${rule.step?.name || rule.stepId}`;
              },
            },
            {
              key: 'screenFunction',
              header: t('worklogImport.table.screenFunction', { defaultValue: 'Screen/Function' }),
              render: (rule: any) => rule.screenFunction?.name || '—',
            },
            {
              key: 'priority',
              header: t('common.priority', { defaultValue: 'Priority' }),
              render: (rule: any) => rule.priority,
            },
            {
              key: 'isActive',
              header: t('common.status'),
              render: (rule: any) => rule.isActive
                ? t('common.active', { defaultValue: 'Active' })
                : t('common.inactive', { defaultValue: 'Inactive' }),
            },
            {
              key: 'actions',
              header: t('worklogImport.table.action', { defaultValue: 'Action' }),
              align: 'right',
              render: (rule: any) => (
                <Box sx={{ whiteSpace: 'nowrap' }}>
                  <Button size="small" onClick={() => openEdit(rule)} sx={{ mr: 0.5 }}>
                    {t('common.edit', { defaultValue: 'Edit' })}
                  </Button>
                  <Button color="error" size="small" onClick={() => deleteMutation.mutate(rule.id)}>
                    {t('common.delete')}
                  </Button>
                </Box>
              ),
            },
          ] as ColumnDef<any>[]}
          data={sortedRules}
          keyExtractor={(rule: any) => rule.id}
          stickyHeader
          maxHeight={320}
          sortBy={ruleSortBy}
          sortOrder={ruleSortDirection}
          onSort={(col) => {
            if (ruleSortBy === col) setRuleSortDirection(d => d === 'asc' ? 'desc' : 'asc');
            else { setRuleSortBy(col as 'keyword' | 'stageStep'); setRuleSortDirection('asc'); }
          }}
        />
      </CardContent>

      {/* Edit modal */}
      <Dialog open={!!editingRule} onClose={() => setEditingRule(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('worklogMapping.edit.title', { defaultValue: 'Edit keyword rule' })}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label={t('worklogMapping.form.keyword', { defaultValue: 'Keyword' })}
            size="small"
            fullWidth
            value={editKeyword}
            onChange={(e) => setEditKeyword(e.target.value)}
          />
          <Autocomplete
            size="small"
            fullWidth
            options={[{ id: '', name: t('common.none', { defaultValue: '— None —' }) }, ...stageOptions]}
            value={[{ id: '', name: t('common.none', { defaultValue: '— None —' }) }, ...stageOptions].find((stage: any) => stage.id === editStageId) || null}
            onChange={(_, value: any) => { setEditStageId(value?.id ? Number(value.id) : ''); setEditStepId(''); }}
            getOptionLabel={(option: any) => option.name}
            isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
            renderInput={(params) => <TextField {...params} label={t('taskWorkflow.stage', { defaultValue: 'Stage' })} />}
          />
          <Autocomplete
            size="small"
            fullWidth
            options={[{ id: '', name: t('common.none', { defaultValue: '— None —' }) }, ...editStepOptions]}
            value={[{ id: '', name: t('common.none', { defaultValue: '— None —' }) }, ...editStepOptions].find((step: any) => step.id === editStepId) || null}
            onChange={(_, value: any) => setEditStepId(value?.id ? Number(value.id) : '')}
            getOptionLabel={(option: any) => option.name}
            isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
            disabled={!editStageId}
            renderInput={(params) => <TextField {...params} label={t('taskWorkflow.step', { defaultValue: 'Step' })} />}
          />
          <Autocomplete
            size="small"
            fullWidth
            options={[{ id: '', name: t('common.none', { defaultValue: '— None —' }) }, ...(screenFunctions || [])]}
            value={[{ id: '', name: t('common.none', { defaultValue: '— None —' }) }, ...(screenFunctions || [])].find((sf: any) => sf.id === editScreenFunctionId) || null}
            onChange={(_, value: any) => setEditScreenFunctionId(value?.id ? Number(value.id) : '')}
            getOptionLabel={(option: any) => option.name}
            isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
            renderInput={(params) => <TextField {...params} label={t('worklogImport.table.screenFunction', { defaultValue: 'Screen/Function' })} />}
          />
          <TextField
            type="number"
            label={t('common.priority', { defaultValue: 'Priority' })}
            size="small"
            fullWidth
            value={editPriority}
            onChange={(e) => setEditPriority(Number(e.target.value) || 100)}
          />
          <FormControlLabel
            control={<Switch checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />}
            label={t('common.active', { defaultValue: 'Active' })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingRule(null)}>{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
          <Button variant="contained" onClick={() => updateMutation.mutate()} disabled={!editKeyword || updateMutation.isPending}>
            {t('common.save', { defaultValue: 'Save' })}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
