import { useEffect, useMemo, useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import IconButton from "@mui/material/IconButton";
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
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());
  // Tab 2: which step is focused in the right panel
  const [focusedStepId, setFocusedStepId] = useState<StepId | null>(null);

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
    setExpandedStages(new Set(stagesDetail.map((d) => d.stage.id)));
    // auto-focus first step for tab 2
    const firstStep = stagesDetail[0]?.steps[0];
    if (firstStep) setFocusedStepId(firstStep.id);
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

  // ── Tab 2: focused step data ──────────────────────────────────────────────
  const focusedStepData = useMemo(() => {
    if (focusedStepId === null) return null;
    for (const detail of stagesDetail) {
      const step = detail.steps.find((s) => s.id === focusedStepId);
      if (step) return { detail, step };
    }
    return null;
  }, [focusedStepId, stagesDetail]);

  // ── Quick toggle for step's ssf inline (Tab 1) ───────────────────────────
  const quickToggleStepSsfs = (detail: StageDetailData, stepId: StepId) => {
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
        ? stageSsfIds.some(
            (id) => !ssfIds.includes(id) && selectedSsfs.has(id)
          )
        : true;
      anyLeft ? next.add(detail.stage.id) : next.delete(detail.stage.id);
      return next;
    });
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
            sx={{ mb: 1, borderBottom: 1, borderColor: "divider" }}
            variant="fullWidth"
          >
            <Tab
              label={t("taskWorkflow.exportDialog.tabDetail")}
              sx={{ fontSize: 13, textTransform: "none" }}
            />
            <Tab
              label={t("taskWorkflow.exportDialog.tabQuick")}
              sx={{ fontSize: 13, textTransform: "none" }}
            />
          </Tabs>

          {/* ── Tab 1: tree view with chips inline ── */}
          {activeTab === 0 && (
            <div>
              {stagesDetail.map((detail) => {
                const stageExpanded = expandedStages.has(detail.stage.id);
                return (
                  <div key={detail.stage.id}>
                    {/* Stage row */}
                    <div className="flex items-center gap-1 py-1 rounded hover:bg-gray-50">
                      <IconButton
                        size="small"
                        onClick={() =>
                          setExpandedStages((prev) => {
                            const next = new Set(prev);
                            stageExpanded
                              ? next.delete(detail.stage.id)
                              : next.add(detail.stage.id);
                            return next;
                          })
                        }
                      >
                        {stageExpanded ? (
                          <ExpandMoreIcon fontSize="small" />
                        ) : (
                          <ChevronRightIcon fontSize="small" />
                        )}
                      </IconButton>
                      <FormControlLabel
                        sx={{ m: 0, flex: 1 }}
                        control={
                          <Checkbox
                            checked={selectedStages.has(detail.stage.id)}
                            indeterminate={stageIndeterminate(detail)}
                            onChange={() => toggleStage(detail)}
                            size="small"
                          />
                        }
                        label={
                          <Typography fontWeight={600} fontSize={14}>
                            {detail.stage.name}
                          </Typography>
                        }
                      />
                    </div>

                    <Collapse in={stageExpanded} unmountOnExit>
                      <div className="ml-8 pb-1">
                        {detail.steps.map((step, stepIdx) => (
                          <div key={step.id}>
                            {/* Step header */}
                            <div className="flex items-center gap-1 pt-1">
                              <FormControlLabel
                                sx={{ m: 0, flex: 1 }}
                                control={
                                  <Checkbox
                                    checked={selectedSteps.has(step.id)}
                                    indeterminate={stepIndeterminate(detail, step.id)}
                                    onChange={() => toggleStep(detail, step.id)}
                                    size="small"
                                  />
                                }
                                label={
                                  <Typography
                                    fontSize={13}
                                    fontWeight={500}
                                    color="text.secondary"
                                  >
                                    {step.name}
                                  </Typography>
                                }
                              />
                              {step.screenFunctions.length > 0 && (
                                <Typography
                                  component="span"
                                  fontSize={11}
                                  sx={{
                                    color: "primary.main",
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                    pr: 1,
                                    "&:hover": { textDecoration: "underline" },
                                  }}
                                  onClick={() =>
                                    quickToggleStepSsfs(detail, step.id)
                                  }
                                >
                                  {allSsfIdsForStep(detail, step.id).every(
                                    (id) => selectedSsfs.has(id)
                                  )
                                    ? t("taskWorkflow.exportDialog.deselectStep")
                                    : t("taskWorkflow.exportDialog.selectStep")}
                                </Typography>
                              )}
                            </div>

                            {/* Screen function chips */}
                            <div className="flex flex-wrap gap-1.5 pl-8 pb-2 pt-1">
                              {step.screenFunctions.length === 0 ? (
                                <Typography
                                  fontSize={11}
                                  color="text.disabled"
                                  sx={{ py: 0.5 }}
                                >
                                  {t(
                                    "taskWorkflow.exportDialog.noScreenFunctions"
                                  )}
                                </Typography>
                              ) : (
                                step.screenFunctions.map((ssf) => {
                                  const selected = selectedSsfs.has(ssf.id);
                                  return (
                                    <Chip
                                      key={ssf.id}
                                      label={ssf.screenFunction.name}
                                      size="small"
                                      onClick={() =>
                                        toggleSsf(detail, step.id, ssf.id)
                                      }
                                      variant={selected ? "filled" : "outlined"}
                                      color={selected ? "primary" : "default"}
                                      sx={{
                                        fontSize: 11,
                                        height: 24,
                                        cursor: "pointer",
                                        opacity: selected ? 1 : 0.5,
                                      }}
                                    />
                                  );
                                })
                              )}
                            </div>

                            {stepIdx < detail.steps.length - 1 && (
                              <Divider sx={{ opacity: 0.3 }} />
                            )}
                          </div>
                        ))}
                      </div>
                    </Collapse>
                    <Divider />
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Tab 2: two-column quick select ── */}
          {activeTab === 1 && (
            <div className="flex gap-0" style={{ minHeight: 320 }}>
              {/* Left: Stage/Step list */}
              <div
                className="flex flex-col overflow-y-auto"
                style={{
                  width: "42%",
                  borderRight: "1px solid #e5e7eb",
                  flexShrink: 0,
                }}
              >
                {stagesDetail.map((detail) => (
                  <div key={detail.stage.id}>
                    {/* Stage header */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 sticky top-0 z-10">
                      <Checkbox
                        checked={selectedStages.has(detail.stage.id)}
                        indeterminate={stageIndeterminate(detail)}
                        onChange={() => toggleStage(detail)}
                        size="small"
                        sx={{ p: 0.5 }}
                      />
                      <Typography
                        fontSize={12}
                        fontWeight={700}
                        color="text.primary"
                        sx={{ lineHeight: 1.3 }}
                      >
                        {detail.stage.name}
                      </Typography>
                    </div>

                    {/* Steps */}
                    {detail.steps.map((step) => {
                      const isFocused = focusedStepId === step.id;
                      return (
                        <div
                          key={step.id}
                          className="flex items-center gap-1 px-2 py-1 cursor-pointer"
                          style={{
                            background: isFocused ? "#eff6ff" : undefined,
                            borderLeft: isFocused
                              ? "3px solid #3b82f6"
                              : "3px solid transparent",
                          }}
                          onClick={() => setFocusedStepId(step.id)}
                        >
                          <Checkbox
                            checked={selectedSteps.has(step.id)}
                            indeterminate={stepIndeterminate(detail, step.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleStep(detail, step.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            size="small"
                            sx={{ p: 0.5 }}
                          />
                          <Typography
                            fontSize={12}
                            color={isFocused ? "primary.main" : "text.secondary"}
                            fontWeight={isFocused ? 600 : 400}
                            sx={{ lineHeight: 1.4 }}
                          >
                            {step.name}
                          </Typography>
                          {step.screenFunctions.length > 0 && (
                            <Typography
                              fontSize={10}
                              sx={{
                                ml: "auto",
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 10,
                                bgcolor: selectedSteps.has(step.id)
                                  ? "primary.light"
                                  : "grey.200",
                                color: selectedSteps.has(step.id)
                                  ? "primary.contrastText"
                                  : "text.disabled",
                                flexShrink: 0,
                              }}
                            >
                              {
                                step.screenFunctions.filter((ssf) =>
                                  selectedSsfs.has(ssf.id)
                                ).length
                              }
                              /{step.screenFunctions.length}
                            </Typography>
                          )}
                        </div>
                      );
                    })}
                    <Divider />
                  </div>
                ))}
              </div>

              {/* Right: Screen functions for focused step */}
              <div className="flex-1 overflow-y-auto px-3 py-2">
                {focusedStepData ? (
                  <>
                    {/* Panel header */}
                    <div className="flex items-center justify-between mb-2">
                      <Typography
                        fontSize={12}
                        fontWeight={600}
                        color="text.primary"
                      >
                        {focusedStepData.step.name}
                      </Typography>
                      {focusedStepData.step.screenFunctions.length > 0 && (
                        <Typography
                          component="span"
                          fontSize={11}
                          sx={{
                            color: "primary.main",
                            cursor: "pointer",
                            "&:hover": { textDecoration: "underline" },
                          }}
                          onClick={() =>
                            quickToggleStepSsfs(
                              focusedStepData.detail,
                              focusedStepData.step.id
                            )
                          }
                        >
                          {allSsfIdsForStep(
                            focusedStepData.detail,
                            focusedStepData.step.id
                          ).every((id) => selectedSsfs.has(id))
                            ? t("taskWorkflow.exportDialog.deselectStep")
                            : t("taskWorkflow.exportDialog.selectStep")}
                        </Typography>
                      )}
                    </div>

                    {focusedStepData.step.screenFunctions.length === 0 ? (
                      <Typography fontSize={12} color="text.disabled">
                        {t("taskWorkflow.exportDialog.noScreenFunctions")}
                      </Typography>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {focusedStepData.step.screenFunctions.map((ssf) => {
                          const selected = selectedSsfs.has(ssf.id);
                          return (
                            <div
                              key={ssf.id}
                              className="flex items-center gap-1.5 px-1 py-0.5 rounded cursor-pointer hover:bg-gray-50"
                              onClick={() =>
                                toggleSsf(
                                  focusedStepData.detail,
                                  focusedStepData.step.id,
                                  ssf.id
                                )
                              }
                            >
                              <Checkbox
                                checked={selected}
                                size="small"
                                sx={{ p: 0.5 }}
                                onChange={() =>
                                  toggleSsf(
                                    focusedStepData.detail,
                                    focusedStepData.step.id,
                                    ssf.id
                                  )
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Typography
                                fontSize={12}
                                color={
                                  selected ? "text.primary" : "text.disabled"
                                }
                              >
                                {ssf.screenFunction.name}
                              </Typography>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Typography
                    fontSize={12}
                    color="text.disabled"
                    sx={{ textAlign: "center", mt: 6 }}
                  >
                    {t("taskWorkflow.exportDialog.noStepSelected")}
                  </Typography>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
