import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi, screenFunctionApi, memberApi, projectApi } from '@/services/api';
import { Modal, Button, LoadingSpinner } from '@/components/common';
import {
  BrainCircuit,
  CalendarDays,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Info,
  Layers,
  TrendingUp,
  RefreshCw,
  Pencil,
  Lock,
} from 'lucide-react';

interface AISchedulingDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  stages: Array<{ id: number; name: string }>;
}

type TabType = 'estimate' | 'schedule' | 'variance';

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

function VarianceBadge({ variance }: { variance: number }) {
  if (variance === 0) return <span className="text-xs text-gray-400">—</span>;
  const isOver = variance > 0;
  const absVal = Math.abs(variance);
  const color = absVal <= 10
    ? 'bg-green-100 text-green-700'
    : absVal <= 25
    ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {isOver ? '+' : '-'}{absVal}%
    </span>
  );
}

export function AISchedulingDialog({ open, onClose, projectId, stages }: AISchedulingDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('estimate');
  const [estimateMode, setEstimateMode] = useState<'screenFunction' | 'stage'>('screenFunction');
  const [selectedStageId, setSelectedStageId] = useState<number | undefined>(stages[0]?.id);
  const [language, setLanguage] = useState<string>('English');
  const [estimationResult, setEstimationResult] = useState<any>(null);
  const [stageEstimationResult, setStageEstimationResult] = useState<any>(null);
  const [scheduleResult, setScheduleResult] = useState<any>(null);

  // Feature 2: Editable copies of AI results (for inline edit before Apply)
  const [editedEstimates, setEditedEstimates] = useState<any[]>([]);
  const [editedStageEstimates, setEditedStageEstimates] = useState<any[]>([]);
  // Edit mode toggles (off by default — user must explicitly enable)
  const [isSFEditMode, setIsSFEditMode] = useState(false);
  const [isStageEditMode, setIsStageEditMode] = useState(false);
  const [isReEditMode, setIsReEditMode] = useState(false);

  // Feature 3 (updated): Re-estimation state
  const [reEstimationResult, setReEstimationResult] = useState<any>(null);
  const [editedReEstimates, setEditedReEstimates] = useState<any[]>([]);

  // Stage selection for targeted estimation (new)
  const [selectedStageIds, setSelectedStageIds] = useState<Set<number>>(
    new Set(stages.map(s => s.id))
  );

  // Reset stage selection when stages prop changes
  useEffect(() => {
    setSelectedStageIds(new Set(stages.map(s => s.id)));
  }, [stages]);

  // Fetch data for readiness check
  const { data: screenFunctions } = useQuery({
    queryKey: ['screenFunctions', projectId],
    queryFn: async () => {
      const res = await screenFunctionApi.getByProject(projectId);
      return res.data;
    },
    enabled: open,
  });

  const { data: members } = useQuery({
    queryKey: ['members', projectId],
    queryFn: async () => {
      const res = await memberApi.getByProject(projectId);
      return res.data;
    },
    enabled: open,
  });

  const { data: settings } = useQuery({
    queryKey: ['projectSettings', projectId],
    queryFn: async () => {
      const res = await projectApi.getSettings(projectId);
      return res.data;
    },
    enabled: open,
  });

  // Feature 1: Fetch stages overview for Variance Dashboard
  const { data: stagesOverview } = useQuery({
    queryKey: ['stagesOverview', projectId],
    queryFn: async () => {
      const res = await taskWorkflowApi.getStagesOverview(projectId);
      return res.data;
    },
    enabled: open,
  });

  // Initialize editable estimates when AI results arrive (Feature 2)
  useEffect(() => {
    if (estimationResult?.data?.estimates) {
      setEditedEstimates(estimationResult.data.estimates.map((e: any) => ({ ...e })));
    }
  }, [estimationResult]);

  useEffect(() => {
    if (stageEstimationResult?.data?.estimates) {
      setEditedStageEstimates(stageEstimationResult.data.estimates.map((e: any) => ({ ...e })));
    }
  }, [stageEstimationResult]);

  useEffect(() => {
    if (reEstimationResult?.data?.estimates) {
      setEditedReEstimates(reEstimationResult.data.estimates.map((e: any) => ({ ...e })));
    }
  }, [reEstimationResult]);

  // Calculate readiness
  const sfCount = screenFunctions?.length || 0;
  const sfWithComplexity = screenFunctions?.filter((sf: any) => sf.complexity && sf.complexity !== 'Medium').length || 0;
  const memberCount = members?.length || 0;
  const activeMembers = members?.filter((m: any) => m.status === 'Active').length || 0;
  const membersWithRole = members?.filter((m: any) => m.role).length || 0;
  const membersWithSkills = members?.filter((m: any) => m.skills && m.skills.length > 0).length || 0;
  const membersWithRate = members?.filter((m: any) => m.hourlyRate && m.hourlyRate > 0).length || 0;
  const hasSettings = !!settings;
  const hasStages = stages.length > 0;

  // Readiness scores
  const estimateReady = sfCount > 0 && memberCount > 0;
  const stageEstimateReady = hasStages && sfCount > 0;
  const scheduleReady = estimateReady && hasStages;

  const estimateMutation = useMutation({
    mutationFn: () =>
      taskWorkflowApi.aiEstimateEffort({ projectId, language }),
    onSuccess: (res) => {
      setEstimationResult(res.data);
      setIsSFEditMode(false);
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: () => {
      if (!selectedStageId) throw new Error('Please select a stage');
      return taskWorkflowApi.aiGenerateSchedule({ projectId, stageId: selectedStageId, language });
    },
    onSuccess: (res) => {
      setScheduleResult(res.data);
    },
  });

  const stageEstimateMutation = useMutation({
    mutationFn: () => {
      const stageIds = Array.from(selectedStageIds);
      return taskWorkflowApi.aiEstimateStageEffort({
        projectId,
        language,
        stageIds: stageIds.length < stages.length ? stageIds : undefined,
      });
    },
    onSuccess: (res) => {
      setStageEstimationResult(res.data);
      setIsStageEditMode(false);
    },
  });

  // Feature 2: Apply uses editedEstimates instead of raw AI result
  const applyEstimationMutation = useMutation({
    mutationFn: () => {
      if (!editedEstimates.length) return Promise.resolve(null);
      return taskWorkflowApi.aiApplyEstimation({
        projectId,
        estimates: editedEstimates.map((e: any) => ({
          screenFunctionId: e.screenFunctionId,
          estimatedEffortHours: Number(e.estimatedEffortHours),
        })),
      });
    },
    onSuccess: () => {
      setEstimationResult(null);
      setEditedEstimates([]);
    },
  });

  // Feature 2: Apply uses editedStageEstimates
  const applyStageEstimationMutation = useMutation({
    mutationFn: () => {
      if (!editedStageEstimates.length) return Promise.resolve(null);
      return taskWorkflowApi.aiApplyStageEstimation({
        projectId,
        estimates: editedStageEstimates.map((e: any) => ({
          stageId: e.stageId,
          estimatedEffortHours: Number(e.estimatedEffortHours),
          startDate: e.suggestedStartDate,
          endDate: e.suggestedEndDate,
        })),
      });
    },
    onSuccess: () => {
      setStageEstimationResult(null);
      setEditedStageEstimates([]);
    },
  });

  const applyScheduleMutation = useMutation({
    mutationFn: () => {
      if (!scheduleResult?.data?.assignments) return Promise.resolve(null);
      return taskWorkflowApi.aiApplySchedule({
        assignments: scheduleResult.data.assignments.map((a: any) => ({
          stepScreenFunctionId: a.stepScreenFunctionId,
          memberId: a.memberId,
          estimatedEffort: a.estimatedEffort,
          estimatedStartDate: a.estimatedStartDate,
          estimatedEndDate: a.estimatedEndDate,
        })),
      });
    },
    onSuccess: () => {
      setScheduleResult(null);
    },
  });

  // Feature 3: Re-estimation mutations
  const reEstimateMutation = useMutation({
    mutationFn: () => {
      const stageIds = Array.from(selectedStageIds);
      return taskWorkflowApi.aiReEstimateUncompleted({
        projectId,
        language,
        stageIds: stageIds.length < stages.length ? stageIds : undefined,
      });
    },
    onSuccess: (res) => {
      setReEstimationResult(res.data);
      setIsReEditMode(false);
    },
  });

  const applyReEstimationMutation = useMutation({
    mutationFn: () => {
      if (!editedReEstimates.length) return Promise.resolve(null);
      return taskWorkflowApi.aiApplyStageEstimation({
        projectId,
        estimates: editedReEstimates.map((e: any) => ({
          stageId: e.stageId,
          estimatedEffortHours: Number(e.estimatedEffortHours),
        })),
      });
    },
    onSuccess: () => {
      setReEstimationResult(null);
      setEditedReEstimates([]);
    },
  });

  // Helpers for editable cells (Feature 2)
  const updateEditedEstimate = (idx: number, field: string, value: any) => {
    setEditedEstimates(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const updateEditedStageEstimate = (idx: number, field: string, value: any) => {
    setEditedStageEstimates(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const updateEditedReEstimate = (idx: number, field: string, value: any) => {
    setEditedReEstimates(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  // Variance dashboard computations (Feature 1)
  const varianceData = stagesOverview?.map((stage: any) => {
    const estimated = stage.estimatedEffort || 0;
    const actual = stage.actualEffort || 0;
    const variance = estimated > 0
      ? Math.round(((actual - estimated) / estimated) * 100)
      : 0;
    return { ...stage, variance };
  }) || [];

  const totalEstimated = varianceData.reduce((s: number, r: any) => s + (r.estimatedEffort || 0), 0);
  const totalActual = varianceData.reduce((s: number, r: any) => s + (r.actualEffort || 0), 0);
  const overallVariance = totalEstimated > 0
    ? Math.round(((totalActual - totalEstimated) / totalEstimated) * 100)
    : 0;

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={onClose} title={t('ai.title')}>
      <div className="w-full max-w-4xl">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'estimate'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('estimate')}
          >
            <Sparkles className="w-4 h-4 inline mr-1.5" />
            {t('ai.estimateEffort')}
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'schedule'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('schedule')}
          >
            <CalendarDays className="w-4 h-4 inline mr-1.5" />
            {t('ai.generateSchedule')}
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'variance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('variance')}
          >
            <TrendingUp className="w-4 h-4 inline mr-1.5" />
            {t('ai.varianceDashboard')}
          </button>
        </div>

        {/* Language selector */}
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">{t('ai.language')}:</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5"
          >
            <option value="English">English</option>
            <option value="Vietnamese">Tiếng Việt</option>
            <option value="Japanese">日本語</option>
          </select>
        </div>

        {/* ===== ESTIMATE TAB ===== */}
        {activeTab === 'estimate' && (
          <div>
            {/* Estimate Mode Selector */}
            <div className="mb-4 flex items-center gap-2">
              <button
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  estimateMode === 'screenFunction'
                    ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setEstimateMode('screenFunction')}
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                {t('ai.estimateSF')}
              </button>
              <button
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  estimateMode === 'stage'
                    ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setEstimateMode('stage')}
              >
                <Layers className="w-3.5 h-3.5 inline mr-1" />
                {t('ai.estimateStage')}
              </button>
            </div>

            {/* ---- Screen Function Estimation ---- */}
            {estimateMode === 'screenFunction' && (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  {t('ai.estimateDescription')}
                </p>

                <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-blue-500" />
                    <h4 className="text-sm font-semibold text-slate-700">{t('ai.prereq.title')}</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                    <ReadinessItem ready={sfCount > 0} label={t('ai.prereq.screenFunctions', { count: sfCount })} detail={t('ai.prereq.screenFunctionsDetail')} />
                    <ReadinessItem ready={activeMembers > 0} label={t('ai.prereq.activeMembers', { count: activeMembers })} detail={t('ai.prereq.activeMembersDetail')} />
                    <ReadinessItem ready={sfWithComplexity > 0 || sfCount === 0} label={t('ai.prereq.complexity', { count: sfWithComplexity, total: sfCount })} detail={t('ai.prereq.complexityDetail')} />
                    <ReadinessItem ready={membersWithRole === memberCount && memberCount > 0} label={t('ai.prereq.memberRoles', { count: membersWithRole, total: memberCount })} detail={t('ai.prereq.memberRolesDetail')} />
                    <ReadinessItem ready={membersWithSkills > 0} label={t('ai.prereq.memberSkills', { count: membersWithSkills, total: memberCount })} detail={t('ai.prereq.memberSkillsDetail')} />
                    <ReadinessItem ready={hasSettings} label={t('ai.prereq.projectSettings')} detail={t('ai.prereq.projectSettingsDetail')} />
                  </div>
                  {!estimateReady && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      {t('ai.prereq.estimateNotReady')}
                    </div>
                  )}
                </div>

                <Button onClick={() => estimateMutation.mutate()} disabled={estimateMutation.isPending || !estimateReady}>
                  <BrainCircuit className="w-4 h-4 mr-1.5 inline" />
                  {estimateMutation.isPending ? t('ai.analyzing') : t('ai.runEstimation')}
                </Button>

                {estimateMutation.isPending && (
                  <div className="mt-4 flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-gray-500">{t('ai.processingAI')}</span>
                  </div>
                )}

                {estimationResult && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{t('ai.estimationResults')}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {t('ai.source')}: {estimationResult.source}
                        </span>
                        {/* Edit mode toggle */}
                        <button
                          onClick={() => setIsSFEditMode(v => !v)}
                          className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
                            isSFEditMode
                              ? 'bg-amber-50 border-amber-300 text-amber-700'
                              : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                          }`}
                          title={isSFEditMode ? t('ai.editModeOn') : t('ai.editModeOff')}
                        >
                          {isSFEditMode ? <Pencil className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {isSFEditMode ? t('ai.editingOn') : t('ai.editingOff')}
                        </button>
                      </div>
                    </div>

                    {editedEstimates.length > 0 && (
                      <>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left">{t('ai.screenFunction')}</th>
                                <th className="px-3 py-2 text-right">{t('ai.hours')}</th>
                                <th className="px-3 py-2 text-center">{t('ai.confidence')}</th>
                                <th className="px-3 py-2 text-left">{t('ai.reasoning')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {editedEstimates.map((est: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-3 py-2">{est.screenFunctionName}</td>
                                  <td className="px-3 py-2 text-right">
                                    {isSFEditMode ? (
                                      <input
                                        type="number"
                                        min={0}
                                        step={0.5}
                                        value={est.estimatedEffortHours}
                                        onChange={e => updateEditedEstimate(idx, 'estimatedEffortHours', parseFloat(e.target.value) || 0)}
                                        className="w-20 text-right border border-amber-300 bg-amber-50 rounded px-1.5 py-0.5 text-sm font-medium focus:ring-1 focus:ring-amber-400 focus:outline-none"
                                      />
                                    ) : (
                                      <span className="font-medium">{est.estimatedEffortHours}</span>
                                    )}
                                    <span className="ml-1 text-gray-500 text-xs">h</span>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      est.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                      est.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {est.confidence}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-500 text-xs">{est.reasoning}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50 font-medium">
                              <tr>
                                <td className="px-3 py-2">{t('ai.total')}</td>
                                <td className="px-3 py-2 text-right">
                                  {editedEstimates.reduce((s, e) => s + (Number(e.estimatedEffortHours) || 0), 0).toFixed(1)}h
                                </td>
                                <td colSpan={2} className="px-3 py-2 text-gray-500 text-xs">
                                  ~{((editedEstimates.reduce((s, e) => s + (Number(e.estimatedEffortHours) || 0), 0)) / ((settings?.workingHoursPerDay || 8) * (settings?.workingDaysPerMonth || 20))).toFixed(2)} man-months
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button onClick={() => applyEstimationMutation.mutate()} disabled={applyEstimationMutation.isPending}>
                            {applyEstimationMutation.isPending ? t('ai.applying') : t('ai.applyEstimates')}
                          </Button>
                          <Button variant="secondary" onClick={() => { setEstimationResult(null); setEditedEstimates([]); setIsSFEditMode(false); }}>
                            {t('ai.discard')}
                          </Button>
                        </div>
                        {applyEstimationMutation.isSuccess && (
                          <p className="mt-2 text-sm text-green-600">{t('ai.estimatesApplied')}</p>
                        )}
                      </>
                    )}

                    {estimationResult.data?.assumptions && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-600">
                        <p className="font-medium mb-1">{t('ai.assumptions')}:</p>
                        <ul className="list-disc list-inside">
                          {estimationResult.data.assumptions.map((a: string, i: number) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ---- Stage Estimation ---- */}
            {estimateMode === 'stage' && (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  {t('ai.stageEstimateDescription')}
                </p>

                <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-blue-500" />
                    <h4 className="text-sm font-semibold text-slate-700">{t('ai.prereq.titleStage')}</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                    <ReadinessItem ready={hasStages} label={t('ai.prereq.stages', { count: stages.length })} detail={t('ai.prereq.stagesEstimateDetail')} />
                    <ReadinessItem ready={sfCount > 0} label={t('ai.prereq.screenFunctions', { count: sfCount })} detail={t('ai.prereq.sfForStageDetail')} />
                    <ReadinessItem ready={activeMembers > 0} label={t('ai.prereq.activeMembers', { count: activeMembers })} detail={t('ai.prereq.activeMembersDetail')} />
                    <ReadinessItem ready={hasSettings} label={t('ai.prereq.projectSettings')} detail={t('ai.prereq.projectSettingsDetail')} />
                  </div>
                  {!stageEstimateReady && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      {t('ai.prereq.stageEstimateNotReady')}
                    </div>
                  )}
                </div>

                {/* Stage selection checkboxes */}
                {stages.length > 0 && (
                  <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{t('ai.selectStagesToEstimate')}</span>
                      <div className="flex gap-2 text-xs">
                        <button
                          className="text-blue-600 hover:underline"
                          onClick={() => setSelectedStageIds(new Set(stages.map(s => s.id)))}
                        >
                          {t('ai.selectAll')}
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          className="text-gray-500 hover:underline"
                          onClick={() => setSelectedStageIds(new Set())}
                        >
                          {t('ai.selectNone')}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {stages.map(stage => {
                        const checked = selectedStageIds.has(stage.id);
                        return (
                          <label
                            key={stage.id}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer select-none transition-colors ${
                              checked
                                ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                                : 'bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={e => {
                                setSelectedStageIds(prev => {
                                  const next = new Set(prev);
                                  e.target.checked ? next.add(stage.id) : next.delete(stage.id);
                                  return next;
                                });
                              }}
                            />
                            <span className={`w-1.5 h-1.5 rounded-full ${checked ? 'bg-blue-500' : 'bg-gray-300'}`} />
                            {stage.name}
                          </label>
                        );
                      })}
                    </div>
                    {selectedStageIds.size === 0 && (
                      <p className="mt-2 text-xs text-amber-600">{t('ai.noStagesSelected')}</p>
                    )}
                    {selectedStageIds.size > 0 && selectedStageIds.size < stages.length && (
                      <p className="mt-1.5 text-xs text-blue-600">
                        {t('ai.stagesSelectedCount', { count: selectedStageIds.size, total: stages.length })}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => stageEstimateMutation.mutate()}
                    disabled={stageEstimateMutation.isPending || !stageEstimateReady || selectedStageIds.size === 0}
                  >
                    <BrainCircuit className="w-4 h-4 mr-1.5 inline" />
                    {stageEstimateMutation.isPending ? t('ai.analyzing') : t('ai.runStageEstimation')}
                  </Button>

                  {/* Re-estimate uncompleted stages */}
                  <Button
                    variant="secondary"
                    onClick={() => reEstimateMutation.mutate()}
                    disabled={reEstimateMutation.isPending || !stageEstimateReady || selectedStageIds.size === 0}
                  >
                    <RefreshCw className="w-4 h-4 mr-1.5 inline" />
                    {reEstimateMutation.isPending ? t('ai.analyzing') : t('ai.reEstimate')}
                  </Button>
                </div>

                {(stageEstimateMutation.isPending || reEstimateMutation.isPending) && (
                  <div className="mt-4 flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-gray-500">{t('ai.processingAI')}</span>
                  </div>
                )}

                {/* Stage Estimation Results (with inline edit toggle) */}
                {stageEstimationResult && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{t('ai.stageEstimationResults')}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {t('ai.source')}: {stageEstimationResult.source}
                        </span>
                        {/* Edit mode toggle */}
                        <button
                          onClick={() => setIsStageEditMode(v => !v)}
                          className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
                            isStageEditMode
                              ? 'bg-amber-50 border-amber-300 text-amber-700'
                              : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {isStageEditMode ? <Pencil className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {isStageEditMode ? t('ai.editingOn') : t('ai.editingOff')}
                        </button>
                      </div>
                    </div>

                    {editedStageEstimates.length > 0 && (
                      <>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left">{t('ai.stageName')}</th>
                                <th className="px-3 py-2 text-right">{t('ai.hours')}</th>
                                <th className="px-3 py-2 text-center">{t('ai.effortShare')}</th>
                                <th className="px-3 py-2 text-center">{t('ai.startDate')}</th>
                                <th className="px-3 py-2 text-center">{t('ai.endDate')}</th>
                                <th className="px-3 py-2 text-center">{t('ai.confidence')}</th>
                                <th className="px-3 py-2 text-left">{t('ai.reasoning')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {editedStageEstimates.map((est: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 font-medium">{est.stageName}</td>
                                  <td className="px-3 py-2 text-right">
                                    {isStageEditMode ? (
                                      <input
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={est.estimatedEffortHours}
                                        onChange={e => updateEditedStageEstimate(idx, 'estimatedEffortHours', parseFloat(e.target.value) || 0)}
                                        className="w-20 text-right border border-amber-300 bg-amber-50 rounded px-1.5 py-0.5 text-sm font-medium focus:ring-1 focus:ring-amber-400 focus:outline-none"
                                      />
                                    ) : (
                                      <span className="font-medium">{est.estimatedEffortHours}</span>
                                    )}
                                    <span className="ml-1 text-gray-500 text-xs">h</span>
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-500">{est.effortDistribution}</td>
                                  <td className="px-3 py-2 text-center">
                                    {isStageEditMode ? (
                                      <input
                                        type="date"
                                        value={est.suggestedStartDate || ''}
                                        onChange={e => updateEditedStageEstimate(idx, 'suggestedStartDate', e.target.value)}
                                        className="text-xs border border-amber-300 bg-amber-50 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                                      />
                                    ) : (
                                      <span className="text-xs">{est.suggestedStartDate || '—'}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {isStageEditMode ? (
                                      <input
                                        type="date"
                                        value={est.suggestedEndDate || ''}
                                        onChange={e => updateEditedStageEstimate(idx, 'suggestedEndDate', e.target.value)}
                                        className="text-xs border border-amber-300 bg-amber-50 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                                      />
                                    ) : (
                                      <span className="text-xs">{est.suggestedEndDate || '—'}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      est.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                      est.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {est.confidence}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-500 text-xs">{est.reasoning}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50 font-medium">
                              <tr>
                                <td className="px-3 py-2">{t('ai.total')}</td>
                                <td className="px-3 py-2 text-right">
                                  {editedStageEstimates.reduce((s, e) => s + (Number(e.estimatedEffortHours) || 0), 0).toFixed(0)}h
                                </td>
                                <td className="px-3 py-2 text-center">100%</td>
                                <td colSpan={4} className="px-3 py-2 text-gray-500 text-xs">
                                  ~{(editedStageEstimates.reduce((s, e) => s + (Number(e.estimatedEffortHours) || 0), 0) / ((settings?.workingHoursPerDay || 8) * (settings?.workingDaysPerMonth || 20))).toFixed(2)} man-months
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button onClick={() => applyStageEstimationMutation.mutate()} disabled={applyStageEstimationMutation.isPending}>
                            {applyStageEstimationMutation.isPending ? t('ai.applying') : t('ai.applyStageEstimates')}
                          </Button>
                          <Button variant="secondary" onClick={() => { setStageEstimationResult(null); setEditedStageEstimates([]); setIsStageEditMode(false); }}>
                            {t('ai.discard')}
                          </Button>
                        </div>
                        {applyStageEstimationMutation.isSuccess && (
                          <p className="mt-2 text-sm text-green-600">{t('ai.stageEstimatesApplied')}</p>
                        )}
                      </>
                    )}

                    {stageEstimationResult.data?.assumptions && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-600">
                        <p className="font-medium mb-1">{t('ai.assumptions')}:</p>
                        <ul className="list-disc list-inside">
                          {stageEstimationResult.data.assumptions.map((a: string, i: number) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Feature 3: Re-estimation Results */}
                {reEstimationResult && !stageEstimationResult && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{t('ai.reEstimateResults')}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          {t('ai.source')}: {reEstimationResult.source}
                        </span>
                        <button
                          onClick={() => setIsReEditMode(v => !v)}
                          className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
                            isReEditMode
                              ? 'bg-amber-50 border-amber-300 text-amber-700'
                              : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {isReEditMode ? <Pencil className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {isReEditMode ? t('ai.editingOn') : t('ai.editingOff')}
                        </button>
                      </div>
                    </div>

                    {reEstimationResult.data?.calibrationInsight && (
                      <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded text-sm text-purple-800">
                        <Info className="w-4 h-4 inline mr-1.5" />
                        {reEstimationResult.data.calibrationInsight}
                      </div>
                    )}

                    {editedReEstimates.length > 0 && (
                      <>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left">{t('ai.stageName')}</th>
                                <th className="px-3 py-2 text-right">{t('ai.originalHours')}</th>
                                <th className="px-3 py-2 text-right">{t('ai.actualSoFar')}</th>
                                <th className="px-3 py-2 text-center">{t('ai.progress')}</th>
                                <th className="px-3 py-2 text-right">{t('ai.revisedHours')}</th>
                                <th className="px-3 py-2 text-center">{t('ai.diff')}</th>
                                <th className="px-3 py-2 text-left">{t('ai.reasoning')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {editedReEstimates.map((est: any, idx: number) => {
                                const diff = Number(est.estimatedEffortHours) - (est.originalEstimatedHours || 0);
                                return (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 font-medium">{est.stageName}</td>
                                    <td className="px-3 py-2 text-right text-gray-500">{est.originalEstimatedHours || 0}h</td>
                                    <td className="px-3 py-2 text-right text-blue-600">{est.currentActualHours || 0}h</td>
                                    <td className="px-3 py-2 text-center">
                                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">
                                        {est.currentProgress || 0}%
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      {isReEditMode ? (
                                        <input
                                          type="number"
                                          min={0}
                                          step={1}
                                          value={est.estimatedEffortHours}
                                          onChange={e => updateEditedReEstimate(idx, 'estimatedEffortHours', parseFloat(e.target.value) || 0)}
                                          className="w-20 text-right border border-amber-300 bg-amber-50 rounded px-1.5 py-0.5 text-sm font-medium focus:ring-1 focus:ring-amber-400 focus:outline-none"
                                        />
                                      ) : (
                                        <span className="font-medium">{est.estimatedEffortHours}</span>
                                      )}
                                      <span className="ml-1 text-gray-500 text-xs">h</span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className={`text-xs font-medium ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                        {diff > 0 ? `+${diff.toFixed(0)}` : diff < 0 ? diff.toFixed(0) : '±0'}h
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-gray-500 text-xs">{est.reasoning}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-gray-50 font-medium">
                              <tr>
                                <td className="px-3 py-2">{t('ai.total')}</td>
                                <td className="px-3 py-2 text-right text-gray-500">
                                  {editedReEstimates.reduce((s, e) => s + (e.originalEstimatedHours || 0), 0)}h
                                </td>
                                <td className="px-3 py-2 text-right text-blue-600">
                                  {editedReEstimates.reduce((s, e) => s + (e.currentActualHours || 0), 0)}h
                                </td>
                                <td></td>
                                <td className="px-3 py-2 text-right">
                                  {editedReEstimates.reduce((s, e) => s + (Number(e.estimatedEffortHours) || 0), 0).toFixed(0)}h
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {(() => {
                                    const totalDiff = editedReEstimates.reduce((s, e) => s + (Number(e.estimatedEffortHours) - (e.originalEstimatedHours || 0)), 0);
                                    return <span className={`text-xs font-medium ${totalDiff > 0 ? 'text-red-600' : totalDiff < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                      {totalDiff > 0 ? `+${totalDiff.toFixed(0)}` : totalDiff.toFixed(0)}h
                                    </span>;
                                  })()}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button onClick={() => applyReEstimationMutation.mutate()} disabled={applyReEstimationMutation.isPending}>
                            {applyReEstimationMutation.isPending ? t('ai.applying') : t('ai.applyReEstimates')}
                          </Button>
                          <Button variant="secondary" onClick={() => { setReEstimationResult(null); setEditedReEstimates([]); setIsReEditMode(false); }}>
                            {t('ai.discard')}
                          </Button>
                        </div>
                        {applyReEstimationMutation.isSuccess && (
                          <p className="mt-2 text-sm text-green-600">{t('ai.reEstimatesApplied')}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== SCHEDULE TAB ===== */}
        {activeTab === 'schedule' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              {t('ai.scheduleDescription')}
            </p>

            <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-blue-500" />
                <h4 className="text-sm font-semibold text-slate-700">{t('ai.prereq.titleSchedule')}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                <ReadinessItem ready={hasStages} label={t('ai.prereq.stages', { count: stages.length })} detail={t('ai.prereq.stagesDetail')} />
                <ReadinessItem ready={activeMembers > 0} label={t('ai.prereq.activeMembers', { count: activeMembers })} detail={t('ai.prereq.activeMembersScheduleDetail')} />
                <ReadinessItem ready={sfCount > 0} label={t('ai.prereq.stepScreenLinks')} detail={t('ai.prereq.stepScreenLinksDetail')} />
                <ReadinessItem ready={membersWithRate > 0} label={t('ai.prereq.hourlyRates', { count: membersWithRate, total: memberCount })} detail={t('ai.prereq.hourlyRatesDetail')} />
                <ReadinessItem ready={hasSettings} label={t('ai.prereq.workingCalendar')} detail={t('ai.prereq.workingCalendarDetail')} />
                <ReadinessItem ready={membersWithSkills > 0} label={t('ai.prereq.memberSkills', { count: membersWithSkills, total: memberCount })} detail={t('ai.prereq.memberSkillsScheduleDetail')} />
              </div>
              {!scheduleReady && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  {t('ai.prereq.scheduleNotReady')}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-1">{t('ai.selectStage')}:</label>
              <select
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(Number(e.target.value))}
                className="text-sm border border-gray-300 rounded-md px-3 py-1.5 w-full max-w-xs"
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            <Button onClick={() => scheduleMutation.mutate()} disabled={scheduleMutation.isPending || !selectedStageId || !scheduleReady}>
              <BrainCircuit className="w-4 h-4 mr-1.5 inline" />
              {scheduleMutation.isPending ? t('ai.analyzing') : t('ai.runSchedule')}
            </Button>

            {scheduleMutation.isPending && (
              <div className="mt-4 flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-gray-500">{t('ai.processingAI')}</span>
              </div>
            )}

            {scheduleResult && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">{t('ai.scheduleResults')}</h3>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {t('ai.source')}: {scheduleResult.source}
                  </span>
                </div>

                {scheduleResult.data?.assignments && (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">{t('ai.task')}</th>
                            <th className="px-3 py-2 text-left">{t('ai.member')}</th>
                            <th className="px-3 py-2 text-right">{t('ai.hours')}</th>
                            <th className="px-3 py-2 text-center">{t('ai.startDate')}</th>
                            <th className="px-3 py-2 text-center">{t('ai.endDate')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {scheduleResult.data.assignments.map((a: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-3 py-2">{a.taskName || `Task #${a.stepScreenFunctionId}`}</td>
                              <td className="px-3 py-2">{a.memberName || `Member #${a.memberId}`}</td>
                              <td className="px-3 py-2 text-right font-medium">{a.estimatedEffort}h</td>
                              <td className="px-3 py-2 text-center">{a.estimatedStartDate}</td>
                              <td className="px-3 py-2 text-center">{a.estimatedEndDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {scheduleResult.data?.timeline && (
                      <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                        <p><strong>{t('ai.timeline')}:</strong> {scheduleResult.data.timeline.startDate} → {scheduleResult.data.timeline.endDate}</p>
                        {scheduleResult.data.timeline.totalWorkingDays && (
                          <p className="text-gray-600">{t('ai.workingDays')}: {scheduleResult.data.timeline.totalWorkingDays}</p>
                        )}
                      </div>
                    )}

                    {scheduleResult.data?.warnings && scheduleResult.data.warnings.length > 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded text-sm">
                        <p className="font-medium text-yellow-800 mb-1">{t('ai.warnings')}:</p>
                        <ul className="list-disc list-inside text-yellow-700">
                          {scheduleResult.data.warnings.map((w: string, i: number) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <Button onClick={() => applyScheduleMutation.mutate()} disabled={applyScheduleMutation.isPending}>
                        {applyScheduleMutation.isPending ? t('ai.applying') : t('ai.applySchedule')}
                      </Button>
                      <Button variant="secondary" onClick={() => setScheduleResult(null)}>
                        {t('ai.discard')}
                      </Button>
                    </div>

                    {applyScheduleMutation.isSuccess && (
                      <p className="mt-2 text-sm text-green-600">{t('ai.scheduleApplied')}</p>
                    )}
                  </>
                )}

                {scheduleResult.data?.summary && (
                  <p className="mt-3 text-sm text-gray-600 italic">{scheduleResult.data.summary}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== VARIANCE DASHBOARD TAB (Feature 1) ===== */}
        {activeTab === 'variance' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              {t('ai.varianceDescription')}
            </p>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <p className="text-xs text-blue-600 font-medium mb-1">{t('ai.totalEstimated')}</p>
                <p className="text-lg font-bold text-blue-800">{totalEstimated.toFixed(0)}h</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <p className="text-xs text-slate-600 font-medium mb-1">{t('ai.totalActual')}</p>
                <p className="text-lg font-bold text-slate-800">{totalActual.toFixed(0)}h</p>
              </div>
              <div className={`p-3 border rounded-lg text-center ${
                overallVariance === 0 ? 'bg-gray-50 border-gray-200' :
                Math.abs(overallVariance) <= 10 ? 'bg-green-50 border-green-200' :
                Math.abs(overallVariance) <= 25 ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
              }`}>
                <p className="text-xs font-medium mb-1">{t('ai.overallVariance')}</p>
                <p className={`text-lg font-bold ${
                  overallVariance === 0 ? 'text-gray-600' :
                  Math.abs(overallVariance) <= 10 ? 'text-green-700' :
                  Math.abs(overallVariance) <= 25 ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {overallVariance > 0 ? `+${overallVariance}` : overallVariance}%
                </p>
              </div>
            </div>

            {varianceData.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{t('ai.noVarianceData')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">{t('ai.stageName')}</th>
                      <th className="px-3 py-2 text-right">{t('ai.estimated')}</th>
                      <th className="px-3 py-2 text-right">{t('ai.actual')}</th>
                      <th className="px-3 py-2 text-center">{t('ai.variance')}</th>
                      <th className="px-3 py-2 text-center">{t('ai.progress')}</th>
                      <th className="px-3 py-2 text-center">{t('ai.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {varianceData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">
                          <div className="flex items-center gap-2">
                            {row.color && (
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: row.color }}
                              />
                            )}
                            {row.name}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.estimatedEffort > 0 ? `${row.estimatedEffort.toFixed(0)}h` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.actualEffort > 0 ? `${row.actualEffort.toFixed(0)}h` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.estimatedEffort > 0
                            ? <VarianceBadge variance={row.variance} />
                            : <span className="text-xs text-gray-300">{t('ai.noEstimate')}</span>
                          }
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, row.progress || 0)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{row.progress || 0}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            row.status === 'Good' ? 'bg-green-100 text-green-700' :
                            row.status === 'Warning' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-medium">
                    <tr>
                      <td className="px-3 py-2">{t('ai.total')}</td>
                      <td className="px-3 py-2 text-right">{totalEstimated.toFixed(0)}h</td>
                      <td className="px-3 py-2 text-right">{totalActual.toFixed(0)}h</td>
                      <td className="px-3 py-2 text-center">
                        <VarianceBadge variance={overallVariance} />
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-100 border border-green-300" />
                {t('ai.varianceLegend.good')} (≤10%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
                {t('ai.varianceLegend.warning')} (11–25%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-100 border border-red-300" />
                {t('ai.varianceLegend.critical')} (&gt;25%)
              </span>
            </div>
          </div>
        )}

        {/* Error display */}
        {(estimateMutation.isError || stageEstimateMutation.isError || scheduleMutation.isError || reEstimateMutation.isError) && (
          <div className="mt-4 p-3 bg-red-50 rounded text-sm text-red-700">
            {t('ai.error')}: {(estimateMutation.error || stageEstimateMutation.error || scheduleMutation.error || reEstimateMutation.error)?.message || t('ai.unknownError')}
          </div>
        )}
      </div>
    </Modal>
  );
}
