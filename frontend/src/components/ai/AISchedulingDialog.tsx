import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi, screenFunctionApi, memberApi, projectApi } from '@/services/api';
import { Modal, Button, LoadingSpinner } from '@/components/common';
import { BrainCircuit, CalendarDays, Sparkles, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface AISchedulingDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  stages: Array<{ id: number; name: string }>;
}

type TabType = 'estimate' | 'schedule';

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

export function AISchedulingDialog({ open, onClose, projectId, stages }: AISchedulingDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('estimate');
  const [selectedStageId, setSelectedStageId] = useState<number | undefined>(stages[0]?.id);
  const [language, setLanguage] = useState<string>('English');
  const [estimationResult, setEstimationResult] = useState<any>(null);
  const [scheduleResult, setScheduleResult] = useState<any>(null);

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
  const scheduleReady = estimateReady && hasStages;

  const estimateMutation = useMutation({
    mutationFn: () =>
      taskWorkflowApi.aiEstimateEffort({ projectId, language }),
    onSuccess: (res) => {
      setEstimationResult(res.data);
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

  const applyEstimationMutation = useMutation({
    mutationFn: () => {
      if (!estimationResult?.data?.estimates) return Promise.resolve(null);
      return taskWorkflowApi.aiApplyEstimation({
        projectId,
        estimates: estimationResult.data.estimates.map((e: any) => ({
          screenFunctionId: e.screenFunctionId,
          estimatedEffortHours: e.estimatedEffortHours,
        })),
      });
    },
    onSuccess: () => {
      setEstimationResult(null);
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

        {/* Estimate Tab */}
        {activeTab === 'estimate' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              {t('ai.estimateDescription')}
            </p>

            {/* Prerequisites / Readiness Check */}
            <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-blue-500" />
                <h4 className="text-sm font-semibold text-slate-700">{t('ai.prereq.title')}</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                {/* Required */}
                <ReadinessItem
                  ready={sfCount > 0}
                  label={t('ai.prereq.screenFunctions', { count: sfCount })}
                  detail={t('ai.prereq.screenFunctionsDetail')}
                />
                <ReadinessItem
                  ready={activeMembers > 0}
                  label={t('ai.prereq.activeMembers', { count: activeMembers })}
                  detail={t('ai.prereq.activeMembersDetail')}
                />

                {/* Recommended */}
                <ReadinessItem
                  ready={sfWithComplexity > 0 || sfCount === 0}
                  label={t('ai.prereq.complexity', { count: sfWithComplexity, total: sfCount })}
                  detail={t('ai.prereq.complexityDetail')}
                />
                <ReadinessItem
                  ready={membersWithRole === memberCount && memberCount > 0}
                  label={t('ai.prereq.memberRoles', { count: membersWithRole, total: memberCount })}
                  detail={t('ai.prereq.memberRolesDetail')}
                />
                <ReadinessItem
                  ready={membersWithSkills > 0}
                  label={t('ai.prereq.memberSkills', { count: membersWithSkills, total: memberCount })}
                  detail={t('ai.prereq.memberSkillsDetail')}
                />
                <ReadinessItem
                  ready={hasSettings}
                  label={t('ai.prereq.projectSettings')}
                  detail={t('ai.prereq.projectSettingsDetail')}
                />
              </div>

              {!estimateReady && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  {t('ai.prereq.estimateNotReady')}
                </div>
              )}
            </div>

            <Button
              onClick={() => estimateMutation.mutate()}
              disabled={estimateMutation.isPending || !estimateReady}
            >
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">{t('ai.estimationResults')}</h3>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {t('ai.source')}: {estimationResult.source}
                  </span>
                </div>

                {estimationResult.data?.estimates && (
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
                          {estimationResult.data.estimates.map((est: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-3 py-2">{est.screenFunctionName}</td>
                              <td className="px-3 py-2 text-right font-medium">{est.estimatedEffortHours}h</td>
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
                            <td className="px-3 py-2 text-right">{estimationResult.data.totalEstimatedHours}h</td>
                            <td colSpan={2} className="px-3 py-2 text-gray-500 text-xs">
                              ~{estimationResult.data.totalEstimatedManMonths} man-months
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        onClick={() => applyEstimationMutation.mutate()}
                        disabled={applyEstimationMutation.isPending}
                      >
                        {applyEstimationMutation.isPending ? t('ai.applying') : t('ai.applyEstimates')}
                      </Button>
                      <Button variant="secondary" onClick={() => setEstimationResult(null)}>
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

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              {t('ai.scheduleDescription')}
            </p>

            {/* Prerequisites / Readiness Check */}
            <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-blue-500" />
                <h4 className="text-sm font-semibold text-slate-700">{t('ai.prereq.titleSchedule')}</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                <ReadinessItem
                  ready={hasStages}
                  label={t('ai.prereq.stages', { count: stages.length })}
                  detail={t('ai.prereq.stagesDetail')}
                />
                <ReadinessItem
                  ready={activeMembers > 0}
                  label={t('ai.prereq.activeMembers', { count: activeMembers })}
                  detail={t('ai.prereq.activeMembersScheduleDetail')}
                />
                <ReadinessItem
                  ready={sfCount > 0}
                  label={t('ai.prereq.stepScreenLinks')}
                  detail={t('ai.prereq.stepScreenLinksDetail')}
                />
                <ReadinessItem
                  ready={membersWithRate > 0}
                  label={t('ai.prereq.hourlyRates', { count: membersWithRate, total: memberCount })}
                  detail={t('ai.prereq.hourlyRatesDetail')}
                />
                <ReadinessItem
                  ready={hasSettings}
                  label={t('ai.prereq.workingCalendar')}
                  detail={t('ai.prereq.workingCalendarDetail')}
                />
                <ReadinessItem
                  ready={membersWithSkills > 0}
                  label={t('ai.prereq.memberSkills', { count: membersWithSkills, total: memberCount })}
                  detail={t('ai.prereq.memberSkillsScheduleDetail')}
                />
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

            <Button
              onClick={() => scheduleMutation.mutate()}
              disabled={scheduleMutation.isPending || !selectedStageId || !scheduleReady}
            >
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
                      <Button
                        onClick={() => applyScheduleMutation.mutate()}
                        disabled={applyScheduleMutation.isPending}
                      >
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

        {/* Error display */}
        {(estimateMutation.isError || scheduleMutation.isError) && (
          <div className="mt-4 p-3 bg-red-50 rounded text-sm text-red-700">
            {t('ai.error')}: {(estimateMutation.error || scheduleMutation.error)?.message || t('ai.unknownError')}
          </div>
        )}
      </div>
    </Modal>
  );
}
