import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/common";
import { StagesOverviewPanel } from "@/components/task-workflow";
import { ExportFilterDialog } from "@/components/task-workflow/ExportFilterDialog";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import type { EffortUnit, StageDetailData, StageOverviewData } from "@/types";
import { taskWorkflowApi } from "@/services/api";
import { exportStagesToExcel } from "@/utils/exportUtils";
import { convertEffort, formatEffort } from "@/utils/effortUtils";

interface SyncOpts {
  syncEstStep: boolean;
  syncEstStage: boolean;
  syncEstEffortStep: boolean;
  syncEstEffortStage: boolean;
  syncOverrideEst: boolean;
}

async function syncStageActualDates(stageId: number, opts: SyncOpts): Promise<void> {
  const detailRes = await taskWorkflowApi.getStageDetail(stageId);
  const detail = detailRes.data;

  let minStart: string | null = null;
  let maxEnd: string | null = null;
  const ssfUpdates: Array<{
    id: number;
    actualStartDate?: string;
    actualEndDate?: string;
    hasEstStart: boolean;
    hasEstEnd: boolean;
    actualEffort: number;
    hasEstEffort: boolean;
  }> = [];

  detail.steps.forEach((step: any) => {
    step.screenFunctions?.forEach((ssf: any) => {
      let ssfMin: string | null = null;
      let ssfMax: string | null = null;
      ssf.members?.forEach((m: any) => {
        if (m.actualStartDate && (!ssfMin || m.actualStartDate < ssfMin)) ssfMin = m.actualStartDate;
        if (m.actualEndDate && (!ssfMax || m.actualEndDate > ssfMax)) ssfMax = m.actualEndDate;
      });
      if (ssfMin || ssfMax) {
        ssfUpdates.push({
          id: ssf.id,
          actualStartDate: ssfMin || undefined,
          actualEndDate: ssfMax || undefined,
          hasEstStart: !!ssf.estimatedStartDate,
          hasEstEnd: !!ssf.estimatedEndDate,
          actualEffort: ssf.actualEffort || 0,
          hasEstEffort: (ssf.estimatedEffort || 0) > 0,
        });
      }
      const resolvedMin = ssfMin as string | null;
      const resolvedMax = ssfMax as string | null;
      if (resolvedMin !== null && (minStart === null || resolvedMin < minStart)) minStart = resolvedMin;
      if (resolvedMax !== null && (maxEnd === null || resolvedMax > maxEnd)) maxEnd = resolvedMax;
    });
  });

  // Update each SSF
  await Promise.all(
    ssfUpdates.map((u) => {
      const payload: {
        actualStartDate?: string;
        actualEndDate?: string;
        estimatedStartDate?: string;
        estimatedEndDate?: string;
        estimatedEffort?: number;
      } = {
        actualStartDate: u.actualStartDate,
        actualEndDate: u.actualEndDate,
      };
      if (opts.syncEstStep) {
        if (opts.syncOverrideEst || !u.hasEstStart) payload.estimatedStartDate = u.actualStartDate;
        if (opts.syncOverrideEst || !u.hasEstEnd) payload.estimatedEndDate = u.actualEndDate;
      }
      if (opts.syncEstEffortStep) {
        if (opts.syncOverrideEst || !u.hasEstEffort) payload.estimatedEffort = u.actualEffort;
      }
      return taskWorkflowApi.updateStepScreenFunction(u.id, payload);
    })
  );

  // Update stage
  const stagePayload: {
    actualStartDate?: string;
    actualEndDate?: string;
    startDate?: string;
    endDate?: string;
    estimatedEffort?: number;
  } = {
    actualStartDate: minStart || undefined,
    actualEndDate: maxEnd || undefined,
  };
  if (opts.syncEstStage) {
    if (opts.syncOverrideEst || !detail.stage?.startDate) stagePayload.startDate = minStart || undefined;
    if (opts.syncOverrideEst || !detail.stage?.endDate) stagePayload.endDate = maxEnd || undefined;
  }
  if (opts.syncEstEffortStage) {
    const stageActualEffort = detail.stage?.actualEffort || 0;
    const stageHasEstEffort = (detail.stage?.estimatedEffort || 0) > 0;
    if (opts.syncOverrideEst || !stageHasEstEffort) stagePayload.estimatedEffort = stageActualEffort;
  }
  await taskWorkflowApi.updateStage(stageId, stagePayload);
}

interface ProjectStagesTabProps {
  projectId: string;
  projectName?: string;
  effortUnit: EffortUnit;
  workSettings: any;
  setShowAIPlanAll: (show: boolean) => void;
  setShowAIScheduling: (show: boolean) => void;
}

export function ProjectStagesTab({
  projectId,
  projectName,
  effortUnit,
  workSettings,
  setShowAIPlanAll,
  setShowAIScheduling,
}: ProjectStagesTabProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Export state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [stagesDetail, setStagesDetail] = useState<StageDetailData[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Sync All state
  const [syncAllDialogOpen, setSyncAllDialogOpen] = useState(false);
  const [syncAllRunning, setSyncAllRunning] = useState(false);
  const [syncAllDone, setSyncAllDone] = useState(false);
  const [syncAllProgress, setSyncAllProgress] = useState<{ current: number; total: number; stageName: string } | null>(null);
  const [syncAllEstStep, setSyncAllEstStep] = useState(false);
  const [syncAllEstStage, setSyncAllEstStage] = useState(false);
  const [syncAllEstEffortStep, setSyncAllEstEffortStep] = useState(false);
  const [syncAllEstEffortStage, setSyncAllEstEffortStage] = useState(false);
  const [syncAllOverrideEst, setSyncAllOverrideEst] = useState(false);

  const { data: stagesOverview } = useQuery({
    queryKey: ["stagesOverview", parseInt(projectId)],
    queryFn: async () => {
      const response = await taskWorkflowApi.getStagesOverview(parseInt(projectId));
      return response.data;
    },
  });

  const displayEffort = (v: number, src: EffortUnit) => {
    const converted = convertEffort(v, src, effortUnit, workSettings);
    return formatEffort(converted, effortUnit);
  };

  const handleOpenExportDialog = async () => {
    if (!stagesOverview || stagesOverview.length === 0) return;
    setShowExportDialog(true);
    setLoadingDetail(true);
    try {
      const detailResults = await Promise.all(
        stagesOverview.map((s: StageOverviewData) =>
          taskWorkflowApi.getStageDetail(s.id)
        )
      );
      setStagesDetail(detailResults.map((r: { data: any }) => r.data));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleExport = async (
    filteredOverview: StageOverviewData[],
    filteredDetail: StageDetailData[]
  ) => {
    setExporting(true);
    try {
      await exportStagesToExcel({
        projectName: projectName ?? projectId,
        stagesOverview: filteredOverview,
        stagesDetail: filteredDetail,
        effortUnit,
        displayEffort,
      });
      setShowExportDialog(false);
    } finally {
      setExporting(false);
    }
  };

  const handleOpenSyncAll = () => {
    setSyncAllDone(false);
    setSyncAllProgress(null);
    setSyncAllDialogOpen(true);
  };

  const handleCloseSyncAll = () => {
    if (syncAllRunning) return;
    setSyncAllDialogOpen(false);
    setSyncAllEstStep(false);
    setSyncAllEstStage(false);
    setSyncAllEstEffortStep(false);
    setSyncAllEstEffortStage(false);
    setSyncAllOverrideEst(false);
    setSyncAllProgress(null);
    setSyncAllDone(false);
  };

  const handleConfirmSyncAll = async () => {
    if (!stagesOverview || stagesOverview.length === 0) return;
    setSyncAllRunning(true);
    setSyncAllDone(false);
    const opts: SyncOpts = {
      syncEstStep: syncAllEstStep,
      syncEstStage: syncAllEstStage,
      syncEstEffortStep: syncAllEstEffortStep,
      syncEstEffortStage: syncAllEstEffortStage,
      syncOverrideEst: syncAllOverrideEst,
    };
    const total = stagesOverview.length;
    for (let i = 0; i < stagesOverview.length; i++) {
      const stage = stagesOverview[i];
      setSyncAllProgress({ current: i + 1, total, stageName: stage.name });
      await syncStageActualDates(stage.id, opts);
    }
    queryClient.invalidateQueries({ queryKey: ['stagesOverview', parseInt(projectId)] });
    setSyncAllRunning(false);
    setSyncAllDone(true);
    setSyncAllProgress({ current: total, total, stageName: '' });
  };

  const noCheckboxSelected = !syncAllEstStep && !syncAllEstStage && !syncAllEstEffortStep && !syncAllEstEffortStage;
  const progressPct = syncAllProgress ? Math.round((syncAllProgress.current / syncAllProgress.total) * 100) : 0;

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        <Button
          variant="secondary"
          onClick={handleOpenSyncAll}
          disabled={!stagesOverview || stagesOverview.length === 0}
        >
          {t('stages.syncAllStages', 'Sync All Stages')}
        </Button>
        <Button
          variant="secondary"
          onClick={handleOpenExportDialog}
          disabled={!stagesOverview || stagesOverview.length === 0}
        >
          {t("stages.exportExcel", "Export Excel")}
        </Button>
        <Button variant="primary" onClick={() => setShowAIPlanAll(true)}>
          {t('ai.planAll', 'AI Plan Everything')}
        </Button>
        <Button variant="secondary" onClick={() => setShowAIScheduling(true)}>
          {t('ai.advancedOptions', 'Advanced AI Options')}
        </Button>
      </div>

      <StagesOverviewPanel
        projectId={parseInt(projectId)}
        effortUnit={effortUnit}
        workSettings={workSettings}
      />

      <ExportFilterDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        stagesOverview={stagesOverview ?? []}
        stagesDetail={stagesDetail}
        loading={loadingDetail}
        onExport={handleExport}
        exporting={exporting}
      />

      {/* Sync All Stages Dialog */}
      <Dialog
        open={syncAllDialogOpen}
        onClose={handleCloseSyncAll}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={syncAllRunning}
      >
        <DialogTitle>{t('stages.syncAllStages', 'Sync All Stages')}</DialogTitle>
        <DialogContent>
          {/* Options phase */}
          {!syncAllRunning && !syncAllDone && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('stages.syncAllStagesDesc', 'Sync actual dates and effort from member assignments across all stages at once.')}
                {' '}<strong>{stagesOverview?.length ?? 0}</strong> {t('stages.title', 'Stages').toLowerCase()}.
              </Typography>

              <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                <FormControlLabel
                  control={<Checkbox checked={syncAllEstStep} onChange={(e) => setSyncAllEstStep(e.target.checked)} size="small" />}
                  label={<Typography variant="body2">{t('stages.syncEstStep')}</Typography>}
                  sx={{ mb: 0.5 }}
                />
                {syncAllEstStep && (
                  <Typography variant="caption" color="primary" sx={{ pl: 4, display: 'block', mb: 1 }}>
                    {t('stages.syncEstStepDesc')}
                  </Typography>
                )}

                <FormControlLabel
                  control={<Checkbox checked={syncAllEstStage} onChange={(e) => setSyncAllEstStage(e.target.checked)} size="small" />}
                  label={<Typography variant="body2">{t('stages.syncEstStage')}</Typography>}
                  sx={{ mb: 0.5 }}
                />
                {syncAllEstStage && (
                  <Typography variant="caption" color="primary" sx={{ pl: 4, display: 'block', mb: 1 }}>
                    {t('stages.syncEstStageDesc')}
                  </Typography>
                )}

                <FormControlLabel
                  control={<Checkbox checked={syncAllEstEffortStep} onChange={(e) => setSyncAllEstEffortStep(e.target.checked)} size="small" />}
                  label={<Typography variant="body2">{t('stages.syncEstEffortStep')}</Typography>}
                  sx={{ mb: 0.5 }}
                />
                {syncAllEstEffortStep && (
                  <Typography variant="caption" color="primary" sx={{ pl: 4, display: 'block', mb: 1 }}>
                    {t('stages.syncEstEffortStepDesc')}
                  </Typography>
                )}

                <FormControlLabel
                  control={<Checkbox checked={syncAllEstEffortStage} onChange={(e) => setSyncAllEstEffortStage(e.target.checked)} size="small" />}
                  label={<Typography variant="body2">{t('stages.syncEstEffortStage')}</Typography>}
                  sx={{ mb: 0.5 }}
                />
                {syncAllEstEffortStage && (
                  <Typography variant="caption" color="primary" sx={{ pl: 4, display: 'block', mb: 1 }}>
                    {t('stages.syncEstEffortStageDesc')}
                  </Typography>
                )}

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={syncAllOverrideEst}
                      disabled={noCheckboxSelected}
                      onChange={(e) => setSyncAllOverrideEst(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" color={noCheckboxSelected ? 'text.disabled' : 'text.primary'}>
                      {t('stages.syncOverrideEst')}
                    </Typography>
                  }
                />
                {syncAllOverrideEst && !noCheckboxSelected && (
                  <Typography variant="caption" color="warning.main" sx={{ pl: 4, display: 'block' }}>
                    {t('stages.syncOverrideEstDesc')}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {/* Progress phase */}
          {(syncAllRunning || syncAllDone) && syncAllProgress && (
            <Box sx={{ pt: 1 }}>
              {syncAllRunning ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {t('stages.syncAllStagesProgress', {
                    current: syncAllProgress.current,
                    total: syncAllProgress.total,
                    stageName: syncAllProgress.stageName,
                    defaultValue: `Syncing ${syncAllProgress.current} / ${syncAllProgress.total}: ${syncAllProgress.stageName}`,
                  })}
                </Typography>
              ) : (
                <Typography variant="body2" color="success.main" sx={{ mb: 1.5 }}>
                  {t('stages.syncAllStagesDone', {
                    total: syncAllProgress.total,
                    defaultValue: `All ${syncAllProgress.total} stages synced successfully.`,
                  })}
                </Typography>
              )}
              <Box sx={{ mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={syncAllDone ? 100 : progressPct}
                  color={syncAllDone ? 'success' : 'primary'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {syncAllProgress.current} / {syncAllProgress.total}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!syncAllDone ? (
            <>
              <Button variant="secondary" onClick={handleCloseSyncAll} disabled={syncAllRunning}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmSyncAll}
                disabled={syncAllRunning}
              >
                {syncAllRunning
                  ? t('common.loading', 'Processing...')
                  : t('common.confirm', 'Confirm')}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={handleCloseSyncAll}>
              {t('common.close', 'Close')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
}
