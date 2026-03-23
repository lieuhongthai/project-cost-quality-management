import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
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

// ── Color palette ─────────────────────────────────────────────────────────────
// Stage row  : dark navy bg + white bold text
// Step row   : light blue bg + dark bold text
// Task row   : white bg (alternating very-light-gray) + normal text
// Header row : teal bg + white bold text
const COLOR = {
  headerBg: "1F6B75",
  headerFg: "FFFFFF",
  stageBg: "2F5496",
  stageFg: "FFFFFF",
  stepBg: "BDD7EE",
  stepFg: "1F2937",
  taskAltBg: "F2F7FD",   // every other task row gets a subtle tint
  taskFg: "374151",
  border: "CBD5E1",
};

function applyRowStyle(
  row: ExcelJS.Row,
  bgHex: string,
  fgHex: string,
  bold: boolean,
  indent = 0,
) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bgHex}` } };
    cell.font = { bold, color: { argb: `FF${fgHex}` }, size: 11 };
    cell.border = {
      bottom: { style: "thin", color: { argb: `FF${COLOR.border}` } },
    };
    cell.alignment = { vertical: "middle", wrapText: false };
  });
  // Indent task-name cell (col 2)
  if (indent > 0) {
    const nameCell = row.getCell(2);
    nameCell.alignment = { indent, vertical: "middle" };
  }
}

/**
 * Export all stages statistics to Excel with colour-coded hierarchy:
 *   Stage (navy)  →  Step (light-blue)  →  Screen/Function (white)
 */
export async function exportStagesToExcel(opts: {
  projectName: string;
  stagesOverview: StageOverviewData[];
  stagesDetail: StageDetailData[];
  effortUnit: EffortUnit;
  displayEffort: (v: number, src: EffortUnit) => string;
}) {
  const { projectName, stagesOverview, stagesDetail, effortUnit, displayEffort } = opts;
  const unit = unitLabel(effortUnit);

  const fmt = (dateStr?: string): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  };

  const eff = (v: number) => parseFloat(convertEffort(v, displayEffort)) || 0;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Stage Statistics");

  // ── Column widths ──────────────────────────────────────────────────────────
  ws.columns = [
    { key: "taskId",    width: 14 },
    { key: "name",      width: 38 },
    { key: "planStart", width: 14 },
    { key: "planEnd",   width: 14 },
    { key: "estimate",  width: 16 },
    { key: "actStart",  width: 14 },
    { key: "actEnd",    width: 14 },
    { key: "actual",    width: 16 },
    { key: "members",   width: 36 },
    { key: "progress",  width: 13 },
  ];

  // ── Header row ─────────────────────────────────────────────────────────────
  const headerRow = ws.addRow([
    "Task ID",
    "Task Name",
    "Planned Start",
    "Planned End",
    `Estimate (${unit})`,
    "Actual Start",
    "Actual End",
    `Actual (${unit})`,
    "Members",
    "Progress (%)",
  ]);
  headerRow.height = 22;
  applyRowStyle(headerRow, COLOR.headerBg, COLOR.headerFg, true);
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // ── Data rows ──────────────────────────────────────────────────────────────
  stagesDetail.forEach((detail, stageIdx) => {
    const overview = stagesOverview.find((s) => s.id === detail.stage.id);
    const stageOrder = overview?.displayOrder ?? stageIdx + 1;

    // Stage row
    const stageRow = ws.addRow([
      String(stageOrder),
      detail.stage.name,
      fmt(detail.stage.startDate),
      fmt(detail.stage.endDate),
      eff(detail.effort.estimated),
      fmt(detail.stage.actualStartDate),
      fmt(detail.stage.actualEndDate),
      eff(detail.effort.actual),
      "",
      detail.progress.percentage,
    ]);
    stageRow.height = 20;
    applyRowStyle(stageRow, COLOR.stageBg, COLOR.stageFg, true, 0);

    detail.steps.forEach((step, stepIdx) => {
      const stepOrder = step.displayOrder ?? stepIdx + 1;

      // Step row
      const stepRow = ws.addRow([
        `${stageOrder}_${stepOrder}`,
        step.name,
        "",
        "",
        eff(step.statistics?.estimatedEffort ?? 0),
        "",
        "",
        eff(step.statistics?.actualEffort ?? 0),
        "",
        step.statistics?.progressPercentage ?? 0,
      ]);
      stepRow.height = 18;
      applyRowStyle(stepRow, COLOR.stepBg, COLOR.stepFg, true, 2);

      step.screenFunctions.forEach((ssf, sfIdx) => {
        const taskOrder = sfIdx + 1;
        const members = ssf.members ?? [];
        const memberNames = members
          .map((m) => m.member?.name ?? "")
          .filter(Boolean)
          .join(", ");

        // Derive plan dates from member-level estimated dates (fallback to ssf-level)
        const memberEstStarts = members
          .map((m) => m.estimatedStartDate)
          .filter(Boolean) as string[];
        const memberEstEnds = members
          .map((m) => m.estimatedEndDate)
          .filter(Boolean) as string[];
        const memberActStarts = members
          .map((m) => m.actualStartDate)
          .filter(Boolean) as string[];
        const memberActEnds = members
          .map((m) => m.actualEndDate)
          .filter(Boolean) as string[];

        const planStart =
          memberEstStarts.length > 0
            ? memberEstStarts.reduce((a, b) => (a < b ? a : b))
            : ssf.estimatedStartDate;
        const planEnd =
          memberEstEnds.length > 0
            ? memberEstEnds.reduce((a, b) => (a > b ? a : b))
            : ssf.estimatedEndDate;
        const actStart =
          memberActStarts.length > 0
            ? memberActStarts.reduce((a, b) => (a < b ? a : b))
            : ssf.actualStartDate;
        const actEnd =
          memberActEnds.length > 0
            ? memberActEnds.reduce((a, b) => (a > b ? a : b))
            : ssf.actualEndDate;

        // Task row (alternate subtle tint on even rows)
        const useAlt = sfIdx % 2 === 1;
        const taskRow = ws.addRow([
          `${stageOrder}_${stepOrder}_${taskOrder}`,
          ssf.screenFunction.name,
          fmt(planStart),
          fmt(planEnd),
          eff(ssf.estimatedEffort),
          fmt(actStart),
          fmt(actEnd),
          eff(ssf.actualEffort),
          memberNames,
          ssf.progress,
        ]);
        taskRow.height = 17;
        applyRowStyle(
          taskRow,
          useAlt ? COLOR.taskAltBg : "FFFFFF",
          COLOR.taskFg,
          false,
          4,
        );
      });
    });
  });

  // ── Download ───────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = projectName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
  a.href = url;
  a.download = `stages-${safeName}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
