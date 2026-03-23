import * as XLSX from "xlsx";
import type { EffortUnit, StageDetailData, StageOverviewData } from "@/types";
import { EFFORT_UNIT_LABELS } from "./effortUtils";

// Converts man-hour value to display string via the caller's displayEffort function
function convertEffort(
  value: number,
  displayEffort: (v: number, src: EffortUnit) => string
): string {
  return displayEffort(value, "man-hour");
}

function unitLabel(effortUnit: EffortUnit): string {
  return EFFORT_UNIT_LABELS[effortUnit];
}

/**
 * Export stage detail table (cross-step matrix) + flat screen list to Excel
 */
export function exportScreenFunctionsToExcel(opts: {
  stageName: string;
  steps: Array<{ stepId: number; stepName: string }>;
  screens: Array<{
    screenFunctionName: string;
    screenFunctionType: string;
    memberMap: Map<number, { memberName: string; totalActual: number }>;
    byStep: Map<
      number,
      { actualEffort: number; estimatedEffort: number; status: string }
    >;
    totalActual: number;
    totalEstimated: number;
  }>;
  filteredScreenFunctions?: Array<{
    name: string;
    description?: string;
    type: string;
    priority?: string;
    complexity?: string;
    status: string;
    progress: number;
    estimatedEffort: number;
    actualEffort: number;
  }>;
  effortUnit: EffortUnit;
  displayEffort: (v: number, src: EffortUnit) => string;
}) {
  const { stageName, steps, screens, filteredScreenFunctions, effortUnit, displayEffort } = opts;
  const unit = unitLabel(effortUnit);
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Stage Detail ──────────────────────────────────────────────
  const headerRow1 = [
    "Name",
    "Type",
    "Members",
    ...steps.flatMap((s) => [`${s.stepName} Est (${unit})`, `${s.stepName} Act (${unit})`]),
    `Total Est (${unit})`,
    `Total Act (${unit})`,
  ];

  const dataRows1 = screens.map((sc) => {
    const memberNames = Array.from(sc.memberMap.values())
      .map((m) => m.memberName)
      .join(", ");
    const stepCells = steps.flatMap((s) => {
      const data = sc.byStep.get(s.stepId);
      return [
        data ? parseFloat(convertEffort(data.estimatedEffort, displayEffort)) : "",
        data ? parseFloat(convertEffort(data.actualEffort, displayEffort)) : "",
      ];
    });
    return [
      sc.screenFunctionName,
      sc.screenFunctionType,
      memberNames || "—",
      ...stepCells,
      parseFloat(convertEffort(sc.totalEstimated, displayEffort)),
      parseFloat(convertEffort(sc.totalActual, displayEffort)),
    ];
  });

  // Totals footer row
  const totalEstimated = screens.reduce((s, sc) => s + sc.totalEstimated, 0);
  const totalActual = screens.reduce((s, sc) => s + sc.totalActual, 0);
  const stepTotals = steps.flatMap((s) => {
    const est = screens.reduce((sum, sc) => sum + (sc.byStep.get(s.stepId)?.estimatedEffort || 0), 0);
    const act = screens.reduce((sum, sc) => sum + (sc.byStep.get(s.stepId)?.actualEffort || 0), 0);
    return [
      parseFloat(convertEffort(est, displayEffort)),
      parseFloat(convertEffort(act, displayEffort)),
    ];
  });
  const footerRow = [
    "TOTAL",
    "",
    "",
    ...stepTotals,
    parseFloat(convertEffort(totalEstimated, displayEffort)),
    parseFloat(convertEffort(totalActual, displayEffort)),
  ];

  const ws1 = XLSX.utils.aoa_to_sheet([headerRow1, ...dataRows1, footerRow]);

  // Style column widths
  ws1["!cols"] = [
    { wch: 35 }, // Name
    { wch: 12 }, // Type
    { wch: 30 }, // Members
    ...steps.flatMap(() => [{ wch: 14 }, { wch: 14 }]),
    { wch: 14 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws1, stageName.slice(0, 31));

  // ── Sheet 2: All Screen Functions (flat list) ──────────────────────────
  if (filteredScreenFunctions && filteredScreenFunctions.length > 0) {
    const headerRow2 = [
      "#",
      "Name",
      "Description",
      "Type",
      "Priority",
      "Complexity",
      "Status",
      "Progress (%)",
      `Est Effort (${unit})`,
      `Actual Effort (${unit})`,
    ];

    const dataRows2 = filteredScreenFunctions.map((sf, idx) => [
      idx + 1,
      sf.name,
      sf.description || "",
      sf.type,
      sf.priority || "",
      sf.complexity || "",
      sf.status,
      sf.progress,
      parseFloat(convertEffort(sf.estimatedEffort, displayEffort)),
      parseFloat(convertEffort(sf.actualEffort, displayEffort)),
    ]);

    const ws2 = XLSX.utils.aoa_to_sheet([headerRow2, ...dataRows2]);
    ws2["!cols"] = [
      { wch: 5 },
      { wch: 35 },
      { wch: 40 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "All Screens");
  }

  const fileName = `screens-${stageName.replace(/[^a-zA-Z0-9]/g, "_")}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export all stages statistics to Excel with hierarchical rows:
 * Stage → Step → Screen/Function
 */
export function exportStagesToExcel(opts: {
  projectName: string;
  stagesOverview: StageOverviewData[];
  stagesDetail: StageDetailData[];
  effortUnit: EffortUnit;
  displayEffort: (v: number, src: EffortUnit) => string;
}) {
  const { projectName, stagesOverview, stagesDetail, effortUnit, displayEffort } = opts;
  const unit = unitLabel(effortUnit);

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  };

  const headers = [
    "Task ID",
    "Task Name",
    `Planned Start`,
    `Planned End`,
    `Estimate (${unit})`,
    `Actual Start`,
    `Actual End`,
    `Actual (${unit})`,
    "Members",
    "Progress (%)",
  ];

  const rows: (string | number)[][] = [headers];

  stagesDetail.forEach((detail, stageIdx) => {
    const overview = stagesOverview.find((s) => s.id === detail.stage.id);
    const stageOrder = overview?.displayOrder ?? stageIdx + 1;

    // Stage row
    rows.push([
      String(stageOrder),
      detail.stage.name,
      formatDate(detail.stage.startDate),
      formatDate(detail.stage.endDate),
      parseFloat(convertEffort(detail.effort.estimated, displayEffort)),
      formatDate(detail.stage.actualStartDate),
      formatDate(detail.stage.actualEndDate),
      parseFloat(convertEffort(detail.effort.actual, displayEffort)),
      "",
      detail.progress.percentage,
    ]);

    detail.steps.forEach((step, stepIdx) => {
      const stepOrder = step.displayOrder ?? stepIdx + 1;
      const stepEstimated = step.statistics?.estimatedEffort ?? 0;
      const stepActual = step.statistics?.actualEffort ?? 0;
      const stepProgress = step.statistics?.progressPercentage ?? 0;

      // Step row
      rows.push([
        `${stageOrder}_${stepOrder}`,
        step.name,
        "",
        "",
        parseFloat(convertEffort(stepEstimated, displayEffort)),
        "",
        "",
        parseFloat(convertEffort(stepActual, displayEffort)),
        "",
        stepProgress,
      ]);

      step.screenFunctions.forEach((ssf, sfIdx) => {
        const taskOrder = sfIdx + 1;
        const memberNames = (ssf.members ?? [])
          .map((m) => m.member?.name ?? "")
          .filter(Boolean)
          .join(", ");

        // Screen/Function task row
        rows.push([
          `${stageOrder}_${stepOrder}_${taskOrder}`,
          ssf.screenFunction.name,
          formatDate(ssf.estimatedStartDate),
          formatDate(ssf.estimatedEndDate),
          parseFloat(convertEffort(ssf.estimatedEffort, displayEffort)),
          formatDate(ssf.actualStartDate),
          formatDate(ssf.actualEndDate),
          parseFloat(convertEffort(ssf.actualEffort, displayEffort)),
          memberNames,
          ssf.progress,
        ]);
      });
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws["!cols"] = [
    { wch: 14 }, // Task ID
    { wch: 35 }, // Task Name
    { wch: 14 }, // Planned Start
    { wch: 14 }, // Planned End
    { wch: 16 }, // Estimate
    { wch: 14 }, // Actual Start
    { wch: 14 }, // Actual End
    { wch: 16 }, // Actual
    { wch: 35 }, // Members
    { wch: 14 }, // Progress
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stage Statistics");

  const safeName = projectName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
  const fileName = `stages-${safeName}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
