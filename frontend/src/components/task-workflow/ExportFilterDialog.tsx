import { useEffect, useMemo, useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import IconButton from "@mui/material/IconButton";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import type { StageDetailData, StageOverviewData } from "@/types";

interface ExportFilterDialogProps {
  open: boolean;
  onClose: () => void;
  /** All stage overview data (already fetched by the parent) */
  stagesOverview: StageOverviewData[];
  /** All stage detail data (already fetched by the parent) */
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
  // ── Selection state: sets of IDs ──────────────────────────────────────────
  const [selectedStages, setSelectedStages] = useState<Set<number>>(new Set());
  const [selectedSteps, setSelectedSteps] = useState<Set<StepId>>(new Set());
  const [selectedSsfs, setSelectedSsfs] = useState<Set<SsfId>>(new Set());

  // ── Expansion state for stages/steps ─────────────────────────────────────
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<StepId>>(new Set());

  // Select all on initial load
  useEffect(() => {
    if (!stagesDetail.length) return;
    const stageIds = new Set(stagesDetail.map((d) => d.stage.id));
    const stepIds = new Set(
      stagesDetail.flatMap((d) => d.steps.map((st) => st.id))
    );
    const ssfIds = new Set(
      stagesDetail.flatMap((d) =>
        d.steps.flatMap((st) => st.screenFunctions.map((ssf) => ssf.id))
      )
    );
    setSelectedStages(stageIds);
    setSelectedSteps(stepIds);
    setSelectedSsfs(ssfIds);
    setExpandedStages(new Set(stagesDetail.map((d) => d.stage.id)));
  }, [stagesDetail]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const allSsfIdsForStep = (detail: StageDetailData, stepId: StepId) => {
    const step = detail.steps.find((s) => s.id === stepId);
    return step ? step.screenFunctions.map((ssf) => ssf.id) : [];
  };

  const allStepIdsForStage = (detail: StageDetailData) =>
    detail.steps.map((s) => s.id);

  const allSsfIdsForStage = (detail: StageDetailData) =>
    detail.steps.flatMap((s) => s.screenFunctions.map((ssf) => ssf.id));

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
    // Update parent stage indeterminate state (re-derive via render)
    // If any step is selected, ensure stage is selected
    setSelectedStages((prev) => {
      const next = new Set(prev);
      const stageStepIds = allStepIdsForStage(detail);
      const anySelected = adding
        ? true
        : stageStepIds.some((id) => id !== stepId && prev.has(id));
      anySelected
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
    // Propagate up to step
    setSelectedSteps((prev) => {
      const next = new Set(prev);
      const step = detail.steps.find((s) => s.id === stepId);
      if (!step) return next;
      const anySelected = step.screenFunctions.some(
        (ssf) => ssf.id !== ssfId && prev.has(ssf.id)
      );
      (adding || anySelected) ? next.add(stepId) : next.delete(stepId);
      return next;
    });
    // Propagate up to stage
    setSelectedStages((prev) => {
      const next = new Set(prev);
      const anySsfSelected =
        adding ||
        detail.steps
          .flatMap((s) => s.screenFunctions)
          .some((ssf) => ssf.id !== ssfId && selectedSsfs.has(ssf.id));
      anySsfSelected
        ? next.add(detail.stage.id)
        : next.delete(detail.stage.id);
      return next;
    });
  };

  // Select all / deselect all
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
    const stepIds = allStepIdsForStage(detail);
    const ssfIds = allSsfIdsForStage(detail);
    const allSel =
      stepIds.every((id) => selectedSteps.has(id)) &&
      ssfIds.every((id) => selectedSsfs.has(id));
    const noneSel =
      !stepIds.some((id) => selectedSteps.has(id)) &&
      !ssfIds.some((id) => selectedSsfs.has(id));
    return !allSel && !noneSel;
  };

  const stepIndeterminate = (detail: StageDetailData, stepId: StepId) => {
    const ssfIds = allSsfIdsForStep(detail, stepId);
    const allSel = ssfIds.every((id) => selectedSsfs.has(id));
    const noneSel = !ssfIds.some((id) => selectedSsfs.has(id));
    return !allSel && !noneSel;
  };

  // ── Build filtered data for export ───────────────────────────────────────
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

  const canExport = filteredData.filteredDetail.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Xuất Excel — Chọn nội dung"
      size="md"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Chọn tất cả
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              Bỏ chọn tất cả
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={exporting}>
              Hủy
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
              Xuất Excel
            </Button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <CircularProgress />
        </div>
      ) : (
        <div className="space-y-1">
          {stagesDetail.map((detail) => {
            const stageExpanded = expandedStages.has(detail.stage.id);
            return (
              <div key={detail.stage.id}>
                {/* Stage row */}
                <div className="flex items-center gap-1 py-0.5 rounded hover:bg-gray-50">
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

                {/* Steps */}
                <Collapse in={stageExpanded} unmountOnExit>
                  <div className="ml-8">
                    {detail.steps.map((step) => {
                      const stepExpanded = expandedSteps.has(step.id);
                      return (
                        <div key={step.id}>
                          {/* Step row */}
                          <div className="flex items-center gap-1 py-0.5 rounded hover:bg-gray-50">
                            <IconButton
                              size="small"
                              onClick={() =>
                                setExpandedSteps((prev) => {
                                  const next = new Set(prev);
                                  stepExpanded
                                    ? next.delete(step.id)
                                    : next.add(step.id);
                                  return next;
                                })
                              }
                            >
                              {stepExpanded ? (
                                <ExpandMoreIcon fontSize="small" />
                              ) : (
                                <ChevronRightIcon fontSize="small" />
                              )}
                            </IconButton>
                            <FormControlLabel
                              sx={{ m: 0, flex: 1 }}
                              control={
                                <Checkbox
                                  checked={selectedSteps.has(step.id)}
                                  indeterminate={stepIndeterminate(
                                    detail,
                                    step.id
                                  )}
                                  onChange={() => toggleStep(detail, step.id)}
                                  size="small"
                                />
                              }
                              label={
                                <Typography fontSize={13} color="text.secondary">
                                  {step.name}
                                </Typography>
                              }
                            />
                          </div>

                          {/* Screen functions */}
                          <Collapse in={stepExpanded} unmountOnExit>
                            <div className="ml-8">
                              {step.screenFunctions.map((ssf) => (
                                <FormControlLabel
                                  key={ssf.id}
                                  sx={{ m: 0, display: "flex", py: 0.25 }}
                                  control={
                                    <Checkbox
                                      checked={selectedSsfs.has(ssf.id)}
                                      onChange={() =>
                                        toggleSsf(detail, step.id, ssf.id)
                                      }
                                      size="small"
                                    />
                                  }
                                  label={
                                    <Typography
                                      fontSize={12}
                                      color="text.secondary"
                                    >
                                      {ssf.screenFunction.name}
                                    </Typography>
                                  }
                                />
                              ))}
                              {step.screenFunctions.length === 0 && (
                                <Typography
                                  fontSize={12}
                                  color="text.disabled"
                                  sx={{ pl: 1, py: 0.5 }}
                                >
                                  Không có màn hình/chức năng
                                </Typography>
                              )}
                            </div>
                          </Collapse>
                          <Divider sx={{ ml: 4, opacity: 0.4 }} />
                        </div>
                      );
                    })}
                  </div>
                </Collapse>
                <Divider />
              </div>
            );
          })}
          {stagesDetail.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              Không có dữ liệu stage
            </Typography>
          )}
        </div>
      )}
    </Modal>
  );
}
