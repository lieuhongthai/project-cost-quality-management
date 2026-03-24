import { useEffect, useMemo, useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import type { StageDetailData, StageOverviewData } from "@/types";

interface ExportFilterDialogProps {
  open: boolean;
  onClose: () => void;
  stagesOverview: StageOverviewData[];
  stagesDetail: StageDetailData[];
  loading: boolean;
  onExport: (
    filteredOverview: StageOverviewData[],
    filteredDetail: StageDetailData[]
  ) => void;
  exporting: boolean;
}

type StepId = number;
type SsfId = number;

export function ExportFilterDialog({
  open,
  onClose,
  stagesOverview,
  stagesDetail,
  loading,
  onExport,
  exporting,
}: ExportFilterDialogProps) {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState(0);
  const [selectedStages, setSelectedStages] = useState<Set<number>>(new Set());
  const [selectedSteps, setSelectedSteps] = useState<Set<StepId>>(new Set());
  const [selectedSsfs, setSelectedSsfs] = useState<Set<SsfId>>(new Set());

  // Select all on initial load
  useEffect(() => {
    if (!stagesDetail.length) return;
    setSelectedStages(new Set(stagesDetail.map((d) => d.stage.id)));
    setSelectedSteps(
      new Set(stagesDetail.flatMap((d) => d.steps.map((s) => s.id)))
    );
    setSelectedSsfs(
      new Set(
        stagesDetail.flatMap((d) =>
          d.steps.flatMap((s) => s.screenFunctions.map((ssf) => ssf.id))
        )
      )
    );
  }, [stagesDetail]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const allStepIdsForStage = (detail: StageDetailData) =>
    detail.steps.map((s) => s.id);

  const allSsfIdsForStage = (detail: StageDetailData) =>
    detail.steps.flatMap((s) => s.screenFunctions.map((ssf) => ssf.id));

  const allSsfIdsForStep = (detail: StageDetailData, stepId: StepId) =>
    (detail.steps.find((s) => s.id === stepId)?.screenFunctions ?? []).map(
      (ssf) => ssf.id
    );

  // ── Toggle handlers ───────────────────────────────────────────────────────
  const toggleStage = (detail: StageDetailData) => {
    const stageId = detail.stage.id;
    const stepIds = allStepIdsForStage(detail);
    const ssfIds = allSsfIdsForStage(detail);
    const adding = !selectedStages.has(stageId);
    setSelectedStages((prev) => {
      const next = new Set(prev);
      adding ? next.add(stageId) : next.delete(stageId);
      return next;
    });
    setSelectedSteps((prev) => {
      const next = new Set(prev);
      stepIds.forEach((id) => (adding ? next.add(id) : next.delete(id)));
      return next;
    });
    setSelectedSsfs((prev) => {
      const next = new Set(prev);
      ssfIds.forEach((id) => (adding ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const toggleStep = (detail: StageDetailData, stepId: StepId) => {
    const ssfIds = allSsfIdsForStep(detail, stepId);
    const adding = !selectedSteps.has(stepId);
    setSelectedSteps((prev) => {
      const next = new Set(prev);
      adding ? next.add(stepId) : next.delete(stepId);
      return next;
    });
    setSelectedSsfs((prev) => {
      const next = new Set(prev);
      ssfIds.forEach((id) => (adding ? next.add(id) : next.delete(id)));
      return next;
    });
    setSelectedStages((prev) => {
      const next = new Set(prev);
      const anyStepSelected = adding
        ? true
        : allStepIdsForStage(detail).some(
            (id) => id !== stepId && prev.has(id)
          );
      anyStepSelected
        ? next.add(detail.stage.id)
        : next.delete(detail.stage.id);
      return next;
    });
  };

  const toggleSsf = (
    detail: StageDetailData,
    stepId: StepId,
    ssfId: SsfId
  ) => {
    const adding = !selectedSsfs.has(ssfId);
    setSelectedSsfs((prev) => {
      const next = new Set(prev);
      adding ? next.add(ssfId) : next.delete(ssfId);
      return next;
    });
    setSelectedSteps((prev) => {
      const next = new Set(prev);
      const ssfIds = allSsfIdsForStep(detail, stepId);
      const anySelected =
        adding || ssfIds.some((id) => id !== ssfId && prev.has(id));
      anySelected ? next.add(stepId) : next.delete(stepId);
      return next;
    });
    setSelectedStages((prev) => {
      const next = new Set(prev);
      const anySsfSelected =
        adding ||
        allSsfIdsForStage(detail).some(
          (id) => id !== ssfId && selectedSsfs.has(id)
        );
      anySsfSelected
        ? next.add(detail.stage.id)
        : next.delete(detail.stage.id);
      return next;
    });
  };

  const toggleAllSsfsForStep = (detail: StageDetailData, stepId: StepId) => {
    const ssfIds = allSsfIdsForStep(detail, stepId);
    const allSelected = ssfIds.every((id) => selectedSsfs.has(id));
    setSelectedSsfs((prev) => {
      const next = new Set(prev);
      ssfIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
    setSelectedSteps((prev) => {
      const next = new Set(prev);
      allSelected ? next.delete(stepId) : next.add(stepId);
      return next;
    });
    setSelectedStages((prev) => {
      const next = new Set(prev);
      const stageSsfIds = allSsfIdsForStage(detail);
      const anyLeft = allSelected
        ? stageSsfIds.some((id) => !ssfIds.includes(id) && selectedSsfs.has(id))
        : true;
      anyLeft ? next.add(detail.stage.id) : next.delete(detail.stage.id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedStages(new Set(stagesDetail.map((d) => d.stage.id)));
    setSelectedSteps(
      new Set(stagesDetail.flatMap((d) => d.steps.map((s) => s.id)))
    );
    setSelectedSsfs(
      new Set(
        stagesDetail.flatMap((d) =>
          d.steps.flatMap((s) => s.screenFunctions.map((ssf) => ssf.id))
        )
      )
    );
  };

  const deselectAll = () => {
    setSelectedStages(new Set());
    setSelectedSteps(new Set());
    setSelectedSsfs(new Set());
  };

  // ── Indeterminate helpers ─────────────────────────────────────────────────
  const stageIndeterminate = (detail: StageDetailData) => {
    const ssfIds = allSsfIdsForStage(detail);
    if (!ssfIds.length) return false;
    const allSel = ssfIds.every((id) => selectedSsfs.has(id));
    const noneSel = !ssfIds.some((id) => selectedSsfs.has(id));
    return !allSel && !noneSel;
  };

  const stepIndeterminate = (detail: StageDetailData, stepId: StepId) => {
    const ssfIds = allSsfIdsForStep(detail, stepId);
    if (!ssfIds.length) return false;
    const allSel = ssfIds.every((id) => selectedSsfs.has(id));
    const noneSel = !ssfIds.some((id) => selectedSsfs.has(id));
    return !allSel && !noneSel;
  };

  // ── Filtered data for export ──────────────────────────────────────────────
  const filteredData = useMemo(() => {
    const filteredDetail: StageDetailData[] = stagesDetail
      .filter((d) => selectedStages.has(d.stage.id))
      .map((d) => ({
        ...d,
        steps: d.steps
          .filter((st) => selectedSteps.has(st.id))
          .map((st) => ({
            ...st,
            screenFunctions: st.screenFunctions.filter((ssf) =>
              selectedSsfs.has(ssf.id)
            ),
          }))
          .filter((st) => st.screenFunctions.length > 0),
      }))
      .filter((d) => d.steps.length > 0);

    const filteredOverview = stagesOverview.filter((s) =>
      filteredDetail.some((d) => d.stage.id === s.id)
    );
    return { filteredOverview, filteredDetail };
  }, [selectedStages, selectedSteps, selectedSsfs, stagesDetail, stagesOverview]);

  const totalSsfs = stagesDetail.flatMap((d) =>
    d.steps.flatMap((s) => s.screenFunctions)
  ).length;

  const canExport = filteredData.filteredDetail.length > 0;

  // Tab 1 right panel: selected steps in order (for grouped view)
  const selectedStepRows = useMemo(() =>
    stagesDetail.flatMap((detail) =>
      detail.steps
        .filter((step) => selectedSteps.has(step.id))
        .map((step) => ({ detail, step }))
    ),
    [stagesDetail, selectedSteps]
  );

  // Tab 2 right panel: flat list of all SSFs from selected steps
  const flatSsfRows = useMemo(() =>
    stagesDetail.flatMap((detail) =>
      detail.steps
        .filter((step) => selectedSteps.has(step.id))
        .flatMap((step) =>
          step.screenFunctions.map((ssf) => ({ detail, step, ssf }))
        )
    ),
    [stagesDetail, selectedSteps]
  );

  const toggleAllFlatSsfs = () => {
    const allIds = flatSsfRows.map((r) => r.ssf.id);
    const allSelected = allIds.every((id) => selectedSsfs.has(id));
    setSelectedSsfs((prev) => {
      const next = new Set(prev);
      allIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
    // sync steps & stages
    if (allSelected) {
      setSelectedSteps((prev) => {
        const next = new Set(prev);
        flatSsfRows.forEach(({ step }) => next.delete(step.id));
        return next;
      });
      setSelectedStages((prev) => {
        const next = new Set(prev);
        flatSsfRows.forEach(({ detail }) => next.delete(detail.stage.id));
        return next;
      });
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t("taskWorkflow.exportDialog.title")}
      size="md"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="flex gap-1 items-center">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {t("taskWorkflow.exportDialog.selectAll")}
            </Button>
            <span className="text-gray-300">|</span>
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              {t("taskWorkflow.exportDialog.deselectAll")}
            </Button>
            {totalSsfs > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {t("taskWorkflow.exportDialog.selectedCount", {
                  count: selectedSsfs.size,
                })}{" "}
                / {totalSsfs}
              </Typography>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={exporting}>
              {t("taskWorkflow.exportDialog.cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                onExport(
                  filteredData.filteredOverview,
                  filteredData.filteredDetail
                )
              }
              disabled={!canExport || exporting}
              loading={exporting}
            >
              {t("taskWorkflow.exportDialog.export")}
            </Button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <CircularProgress />
        </div>
      ) : stagesDetail.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          {t("taskWorkflow.exportDialog.noStages")}
        </Typography>
      ) : (
        <>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ borderBottom: 1, borderColor: "divider", mb: 0 }}
            variant="fullWidth"
          >
            <Tab
              label={t("taskWorkflow.exportDialog.tabByStep")}
              sx={{ fontSize: 12, textTransform: "none", minHeight: 36, py: 0.5 }}
            />
            <Tab
              label={t("taskWorkflow.exportDialog.tabFlat")}
              sx={{ fontSize: 12, textTransform: "none", minHeight: 36, py: 0.5 }}
            />
          </Tabs>

          <div className="flex" style={{ minHeight: 360, maxHeight: 480 }}>
          {/* ── Left: Stage / Step selection (shared) ── */}
          <div
            className="flex flex-col overflow-y-auto"
            style={{ width: 200, flexShrink: 0, borderRight: "1px solid #e5e7eb" }}
          >
            {stagesDetail.map((detail) => (
              <div key={detail.stage.id}>
                {/* Stage row */}
                <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 sticky top-0 z-10">
                  <Checkbox
                    checked={selectedStages.has(detail.stage.id)}
                    indeterminate={stageIndeterminate(detail)}
                    onChange={() => toggleStage(detail)}
                    size="small"
                    sx={{ p: 0.5 }}
                  />
                  <Typography fontSize={12} fontWeight={700} color="text.primary">
                    {detail.stage.name}
                  </Typography>
                </div>

                {/* Step rows */}
                {detail.steps.map((step) => (
                  <FormControlLabel
                    key={step.id}
                    sx={{ m: 0, pl: 2.5, pr: 1, py: 0.5, display: "flex" }}
                    control={
                      <Checkbox
                        checked={selectedSteps.has(step.id)}
                        indeterminate={stepIndeterminate(detail, step.id)}
                        onChange={() => toggleStep(detail, step.id)}
                        size="small"
                        sx={{ p: 0.5 }}
                      />
                    }
                    label={
                      <Typography fontSize={12} color="text.secondary">
                        {step.name}
                      </Typography>
                    }
                  />
                ))}
                <Divider />
              </div>
            ))}
          </div>

          {/* ── Right panel ── */}
          <div className="flex-1 overflow-y-auto">
            {/* Tab 0: grouped by step */}
            {activeTab === 0 && (
              selectedStepRows.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <Typography fontSize={12} color="text.disabled" align="center" sx={{ px: 2 }}>
                    {t("taskWorkflow.exportDialog.noStepSelected")}
                  </Typography>
                </div>
              ) : (
                selectedStepRows.map(({ detail, step }, idx) => (
                  <div key={step.id}>
                    <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 sticky top-0 z-10">
                      <Typography fontSize={12} fontWeight={600} color="text.primary">
                        {step.name}
                      </Typography>
                      {step.screenFunctions.length > 0 && (
                        <Typography
                          component="span"
                          fontSize={11}
                          sx={{
                            color: "primary.main",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            "&:hover": { textDecoration: "underline" },
                          }}
                          onClick={() => toggleAllSsfsForStep(detail, step.id)}
                        >
                          {allSsfIdsForStep(detail, step.id).every((id) =>
                            selectedSsfs.has(id)
                          )
                            ? t("taskWorkflow.exportDialog.deselectStep")
                            : t("taskWorkflow.exportDialog.selectStep")}
                        </Typography>
                      )}
                    </div>
                    {step.screenFunctions.length === 0 ? (
                      <Typography fontSize={11} color="text.disabled" sx={{ px: 3, py: 1 }}>
                        {t("taskWorkflow.exportDialog.noScreenFunctions")}
                      </Typography>
                    ) : (
                      <div className="px-2 pb-1">
                        {step.screenFunctions.map((ssf) => {
                          const selected = selectedSsfs.has(ssf.id);
                          return (
                            <FormControlLabel
                              key={ssf.id}
                              sx={{ m: 0, display: "flex", px: 1, py: 0.25 }}
                              control={
                                <Checkbox
                                  checked={selected}
                                  onChange={() => toggleSsf(detail, step.id, ssf.id)}
                                  size="small"
                                  sx={{ p: 0.5 }}
                                />
                              }
                              label={
                                <Typography fontSize={12} color={selected ? "text.primary" : "text.disabled"}>
                                  {ssf.screenFunction.name}
                                </Typography>
                              }
                            />
                          );
                        })}
                      </div>
                    )}
                    {idx < selectedStepRows.length - 1 && <Divider sx={{ opacity: 0.5 }} />}
                  </div>
                ))
              )
            )}

            {/* Tab 1: flat list */}
            {activeTab === 1 && (
              flatSsfRows.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <Typography fontSize={12} color="text.disabled" align="center" sx={{ px: 2 }}>
                    {t("taskWorkflow.exportDialog.noStepSelected")}
                  </Typography>
                </div>
              ) : (
                <>
                  {/* Flat list header */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 sticky top-0 z-10">
                    <Typography fontSize={12} fontWeight={600} color="text.secondary">
                      {t("taskWorkflow.exportDialog.allScreenFunctions", {
                        count: flatSsfRows.length,
                      })}
                    </Typography>
                    <Typography
                      component="span"
                      fontSize={11}
                      sx={{
                        color: "primary.main",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        "&:hover": { textDecoration: "underline" },
                      }}
                      onClick={toggleAllFlatSsfs}
                    >
                      {flatSsfRows.every((r) => selectedSsfs.has(r.ssf.id))
                        ? t("taskWorkflow.exportDialog.deselectStep")
                        : t("taskWorkflow.exportDialog.selectStep")}
                    </Typography>
                  </div>

                  <div className="px-2 pb-1">
                    {flatSsfRows.map(({ detail, step, ssf }) => {
                      const selected = selectedSsfs.has(ssf.id);
                      return (
                        <FormControlLabel
                          key={ssf.id}
                          sx={{ m: 0, display: "flex", px: 1, py: 0.25 }}
                          control={
                            <Checkbox
                              checked={selected}
                              onChange={() => toggleSsf(detail, step.id, ssf.id)}
                              size="small"
                              sx={{ p: 0.5 }}
                            />
                          }
                          label={
                            <Typography fontSize={12} color={selected ? "text.primary" : "text.disabled"}>
                              {ssf.screenFunction.name}
                            </Typography>
                          }
                        />
                      );
                    })}
                  </div>
                </>
              )
            )}
          </div>
        </div>
        </>
      )}
    </Modal>
  );
}
