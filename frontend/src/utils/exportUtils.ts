import * as XLSX from "xlsx";
import type { EffortUnit } from "@/types";
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
