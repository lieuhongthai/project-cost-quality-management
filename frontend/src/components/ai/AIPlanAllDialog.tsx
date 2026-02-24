import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi, screenFunctionApi, memberApi, projectApi } from '@/services/api';
import { Modal, Button, LoadingSpinner } from '@/components/common';
import {
  BrainCircuit,
  CheckCircle2,
  AlertCircle,
  Rocket,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react';

interface AIPlanAllDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  stages: Array<{ id: number; name: string }>;
}

type Phase = 'readiness' | 'processing' | 'results';

const ROLE_OPTIONS = ['PM', 'TL', 'BA', 'DEV', 'QA', 'Comtor', 'Designer', 'DevOps', 'Other'];

function ReadinessItem({ ready, label, detail }: { ready: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2 py-1">
      {ready ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
      )}
      <div>
        <span className={`text-sm font-medium ${ready ? 'text-green-700' : 'text-amber-700'}`}>
          {label}
        </span>
        <p className="text-xs text-gray-500">{detail}</p>
      </div>
    </div>
  );
}

function QuickAddMembers({
  projectId,
  onAdded,
}: {
  projectId: number;
  onAdded: () => void;
}) {
  const [rows, setRows] = useState([{ name: '', role: 'DEV' }]);

  const addRow = () => setRows([...rows, { name: '', role: 'DEV' }]);
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: string, value: string) => {
    const next = [...rows];
    (next[i] as any)[field] = value;
    setRows(next);
  };

  const mutation = useMutation({
    mutationFn: () => {
      const validMembers = rows.filter((r) => r.name.trim());
      if (validMembers.length === 0) return Promise.resolve(null);
      return projectApi.quickSetup(projectId, { members: validMembers });
    },
    onSuccess: () => {
      setRows([{ name: '', role: 'DEV' }]);
      onAdded();
    },
  });

  return (
    <div className="mt-2 p-3 bg-amber-50 rounded border border-amber-200">
      <p className="text-sm font-medium text-amber-800 mb-2">Quick Add Members</p>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 mb-1">
          <input
            className="flex-1 px-2 py-1 text-sm border rounded"
            placeholder="Member name"
            value={row.name}
            onChange={(e) => updateRow(i, 'name', e.target.value)}
          />
          <select
            className="px-2 py-1 text-sm border rounded"
            value={row.role}
            onChange={(e) => updateRow(i, 'role', e.target.value)}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {rows.length > 1 && (
            <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <button
          onClick={addRow}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add row
        </button>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || rows.every((r) => !r.name.trim())}
          className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {mutation.isPending ? 'Adding...' : 'Add Members'}
        </button>
      </div>
    </div>
  );
}

function QuickAddScreenFunctions({
  projectId,
  onAdded,
}: {
  projectId: number;
  onAdded: () => void;
}) {
  const [text, setText] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const names = text
        .split('\n')
        .map((n) => n.trim())
        .filter(Boolean);
      if (names.length === 0) return Promise.resolve(null);
      const screenFunctions = names.map((name) => ({
        name,
        type: /api|service|function|logic/i.test(name) ? 'Function' : 'Screen',
        complexity: 'Medium' as const,
        priority: 'Medium' as const,
      }));
      return projectApi.quickSetup(projectId, { screenFunctions });
    },
    onSuccess: () => {
      setText('');
      onAdded();
    },
  });

  return (
    <div className="mt-2 p-3 bg-amber-50 rounded border border-amber-200">
      <p className="text-sm font-medium text-amber-800 mb-1">Quick Add Screen Functions</p>
      <p className="text-xs text-gray-500 mb-2">One per line. Names with "API/service/function" auto-detect as Function type.</p>
      <textarea
        className="w-full px-2 py-1 text-sm border rounded h-20 resize-none"
        placeholder="Login Screen&#10;Dashboard Screen&#10;User API&#10;Report Function"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !text.trim()}
        className="mt-1 text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {mutation.isPending ? 'Adding...' : 'Add Screen Functions'}
      </button>
    </div>
  );
}

function AccordionSection({
  title,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border rounded mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-sm font-medium"
      >
        <span>
          {title} {count !== undefined && <span className="text-gray-400">({count})</span>}
        </span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && <div className="px-3 py-2">{children}</div>}
    </div>
  );
}

export function AIPlanAllDialog({ open, onClose, projectId, stages }: AIPlanAllDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>('readiness');
  const [language, setLanguage] = useState('English');
  const [planResult, setPlanResult] = useState<any>(null);
  const [processingStep, setProcessingStep] = useState('');

  const { data: screenFunctions, refetch: refetchSF } = useQuery({
    queryKey: ['screenFunctions', projectId],
    queryFn: async () => (await screenFunctionApi.getByProject(projectId)).data,
    enabled: open,
  });

  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ['members', projectId],
    queryFn: async () => (await memberApi.getByProject(projectId)).data,
    enabled: open,
  });

  const { data: settings } = useQuery({
    queryKey: ['projectSettings', projectId],
    queryFn: async () => (await projectApi.getSettings(projectId)).data,
    enabled: open,
  });

  const sfCount = screenFunctions?.length || 0;
  const memberCount = members?.length || 0;
  const activeMembers = members?.filter((m: any) => m.status === 'Active').length || 0;
  const hasStages = stages.length > 0;

  const allReady = sfCount > 0 && memberCount > 0 && hasStages;

  const planAllMutation = useMutation({
    mutationFn: async () => {
      setPhase('processing');
      setProcessingStep(t('ai.step.estimatingSF', 'Estimating screen function effort...'));
      const res = await taskWorkflowApi.aiPlanAll({
        projectId,
        language,
        autoApply: true,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setPlanResult(data);
      setPhase('results');
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['screenFunctions', projectId] });
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['stagesOverview', projectId] });
      queryClient.invalidateQueries({ queryKey: ['taskWorkflow', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: () => {
      setPhase('readiness');
    },
  });

  const handleClose = () => {
    setPhase('readiness');
    setPlanResult(null);
    setProcessingStep('');
    onClose();
  };

  const handleRefresh = () => {
    refetchSF();
    refetchMembers();
  };

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={handleClose} title={t('ai.planAllTitle', 'AI Plan Everything')}>
      <div className="w-full max-w-4xl">
        {/* Phase 1: Readiness Check */}
        {phase === 'readiness' && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit className="w-5 h-5 text-purple-500" />
              <p className="text-sm text-gray-600">
                {t(
                  'ai.planAllDesc',
                  'One-click AI planning: estimates effort for all screen functions, stages, and generates schedules for all stages automatically.'
                )}
              </p>
            </div>

            {/* Language selector */}
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-600 mb-1 block">{t('ai.language', 'Language')}</label>
              <select
                className="px-3 py-1.5 text-sm border rounded w-48"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="English">English</option>
                <option value="Vietnamese">Tieng Viet</option>
                <option value="Japanese">Japanese</option>
              </select>
            </div>

            {/* Readiness checklist */}
            <div className="bg-gray-50 rounded p-3 mb-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {t('ai.prereq.title', 'Prerequisites')}
              </h4>
              <ReadinessItem
                ready={sfCount > 0}
                label={`Screen Functions: ${sfCount}`}
                detail={sfCount > 0 ? 'Ready' : 'Add at least one screen function'}
              />
              {sfCount === 0 && (
                <QuickAddScreenFunctions projectId={projectId} onAdded={handleRefresh} />
              )}

              <ReadinessItem
                ready={activeMembers > 0}
                label={`Active Members: ${activeMembers}/${memberCount}`}
                detail={activeMembers > 0 ? 'Ready' : 'Add at least one active member'}
              />
              {memberCount === 0 && (
                <QuickAddMembers projectId={projectId} onAdded={handleRefresh} />
              )}

              <ReadinessItem
                ready={hasStages}
                label={`Workflow Stages: ${stages.length}`}
                detail={hasStages ? 'Ready (auto-initialized)' : 'No stages found'}
              />
              <ReadinessItem
                ready={!!settings}
                label="Project Settings"
                detail={settings ? `${settings.workingHoursPerDay || 8}h/day, ${settings.workingDaysPerMonth || 20}d/month` : 'Using defaults'}
              />
            </div>

            {/* Action button */}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleClose}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={() => planAllMutation.mutate()}
                disabled={!allReady || planAllMutation.isPending}
              >
                <Rocket className="w-4 h-4 mr-1" />
                {t('ai.planAll', 'Plan Everything')}
              </Button>
            </div>
          </div>
        )}

        {/* Phase 2: Processing */}
        {phase === 'processing' && (
          <div className="flex flex-col items-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sm text-gray-600">
              {t('ai.processing', 'AI is analyzing your project...')}
            </p>
            <p className="mt-1 text-xs text-gray-400">{processingStep}</p>
            <div className="mt-4 flex flex-col gap-1 text-xs text-gray-400">
              <span>1. {t('ai.step.estimatingSF', 'Estimating screen function effort...')}</span>
              <span>2. {t('ai.step.estimatingStages', 'Estimating stage effort & dates...')}</span>
              <span>3. {t('ai.step.scheduling', 'Generating schedules for all stages...')}</span>
            </div>
          </div>
        )}

        {/* Phase 3: Results */}
        {phase === 'results' && planResult && (
          <div>
            <div className="flex items-center gap-2 mb-3 bg-green-50 p-2 rounded">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-700 font-medium">
                {t('ai.planAllDone', 'AI planning complete! All results have been applied.')}
              </span>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-blue-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {planResult.summary?.totalScreenFunctions || 0}
                </div>
                <div className="text-xs text-gray-500">Screen Functions Estimated</div>
              </div>
              <div className="bg-purple-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {planResult.summary?.totalStages || 0}
                </div>
                <div className="text-xs text-gray-500">Stages Planned</div>
              </div>
              <div className="bg-green-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-green-600">
                  {planResult.summary?.totalAssignments || 0}
                </div>
                <div className="text-xs text-gray-500">Task Assignments</div>
              </div>
            </div>

            {/* Screen Function Estimates */}
            {planResult.estimation?.data?.estimates && (
              <AccordionSection
                title="Screen Function Estimates"
                count={planResult.estimation.data.estimates.length}
                defaultOpen
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-1 pr-2">Name</th>
                        <th className="py-1 pr-2">Hours</th>
                        <th className="py-1 pr-2">Confidence</th>
                        <th className="py-1">Reasoning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planResult.estimation.data.estimates.map((e: any, i: number) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-1 pr-2 font-medium">{e.screenFunctionName || e.name}</td>
                          <td className="py-1 pr-2">{e.estimatedEffortHours}h</td>
                          <td className="py-1 pr-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                e.confidence === 'high'
                                  ? 'bg-green-100 text-green-700'
                                  : e.confidence === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {e.confidence}
                            </span>
                          </td>
                          <td className="py-1 text-gray-500 max-w-[200px] truncate">{e.reasoning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {planResult.estimation.data.totalEstimatedHours && (
                    <div className="mt-2 text-xs text-gray-500">
                      Total: {planResult.estimation.data.totalEstimatedHours}h (
                      {planResult.estimation.data.totalEstimatedManMonths?.toFixed(1)} man-months)
                    </div>
                  )}
                </div>
              </AccordionSection>
            )}

            {/* Stage Estimates */}
            {planResult.stageEstimation?.data?.estimates && (
              <AccordionSection
                title="Stage Effort & Dates"
                count={planResult.stageEstimation.data.estimates.length}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-1 pr-2">Stage</th>
                        <th className="py-1 pr-2">Hours</th>
                        <th className="py-1 pr-2">Share</th>
                        <th className="py-1 pr-2">Start</th>
                        <th className="py-1 pr-2">End</th>
                        <th className="py-1">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planResult.stageEstimation.data.estimates.map((e: any, i: number) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-1 pr-2 font-medium">{e.stageName}</td>
                          <td className="py-1 pr-2">{e.estimatedEffortHours}h</td>
                          <td className="py-1 pr-2">{e.effortDistribution}</td>
                          <td className="py-1 pr-2">{e.suggestedStartDate}</td>
                          <td className="py-1 pr-2">{e.suggestedEndDate}</td>
                          <td className="py-1">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                e.confidence === 'high'
                                  ? 'bg-green-100 text-green-700'
                                  : e.confidence === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {e.confidence}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AccordionSection>
            )}

            {/* Per-stage Schedules */}
            {planResult.schedules?.length > 0 &&
              planResult.schedules.map((schedule: any, idx: number) => (
                <AccordionSection
                  key={idx}
                  title={`Schedule: ${schedule.stageName}`}
                  count={schedule.data?.assignments?.length}
                >
                  {schedule.data?.assignments ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="py-1 pr-2">Task</th>
                            <th className="py-1 pr-2">Member</th>
                            <th className="py-1 pr-2">Hours</th>
                            <th className="py-1 pr-2">Start</th>
                            <th className="py-1">End</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schedule.data.assignments.map((a: any, i: number) => (
                            <tr key={i} className="border-b border-gray-100">
                              <td className="py-1 pr-2">{a.taskName}</td>
                              <td className="py-1 pr-2 font-medium">{a.memberName}</td>
                              <td className="py-1 pr-2">{a.estimatedEffort}h</td>
                              <td className="py-1 pr-2">{a.estimatedStartDate}</td>
                              <td className="py-1">{a.estimatedEndDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {schedule.data.timeline && (
                        <div className="mt-1 text-xs text-gray-400">
                          Timeline: {schedule.data.timeline.startDate} ~ {schedule.data.timeline.endDate} (
                          {schedule.data.timeline.totalWorkingDays} working days)
                        </div>
                      )}
                      {schedule.data.warnings?.length > 0 && (
                        <div className="mt-1 text-xs text-amber-600">
                          {schedule.data.warnings.map((w: string, wi: number) => (
                            <div key={wi}>Warning: {w}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">
                      {schedule.error || 'No assignments generated for this stage'}
                    </div>
                  )}
                </AccordionSection>
              ))}

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="primary" onClick={handleClose}>
                {t('common.done', 'Done')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
