import { Injectable } from '@nestjs/common';
import { ReportService } from './report.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportExportService {
  constructor(private readonly reportService: ReportService) {}

  // ===== Excel Export =====

  async generateExcel(reportId: number): Promise<ExcelJS.Workbook> {
    const report = await this.reportService.findOne(reportId);
    const snapshot = report.snapshotData || {};
    const commentaries = report.commentaries || [];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PCQM System';
    workbook.created = new Date();

    this.buildOverviewSheet(workbook, report, snapshot);
    this.buildEVMSheet(workbook, snapshot);
    this.buildForecastingSheet(workbook, snapshot);
    this.buildQualitySheet(workbook, snapshot);
    this.buildProductivitySheet(workbook, snapshot);
    this.buildMemberCostSheet(workbook, snapshot);
    this.buildStageDetailSheet(workbook, snapshot);
    this.buildCommentarySheet(workbook, commentaries);

    return workbook;
  }

  private applyHeaderStyle(cell: ExcelJS.Cell) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
    cell.font = { bold: true, size: 11 };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    cell.alignment = { vertical: 'middle' };
  }

  private applyCellStyle(cell: ExcelJS.Cell) {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    cell.alignment = { vertical: 'middle' };
  }

  private applyStatusColor(cell: ExcelJS.Cell, value: number, goodThreshold = 0.95, warnThreshold = 0.85) {
    if (value >= goodThreshold) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
    } else if (value >= warnThreshold) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } };
    }
  }

  private applyEfficiencyColor(cell: ExcelJS.Cell, efficiencyDecimal: number) {
    if (efficiencyDecimal >= 1.2) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
    } else if (efficiencyDecimal >= 1.0) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB3D9FF' } };
    } else if (efficiencyDecimal >= 0.8) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } };
    }
  }

  private addTitleRow(ws: ExcelJS.Worksheet, title: string, colSpan: number) {
    const row = ws.addRow([title]);
    row.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1565C0' } };
    if (colSpan > 1) {
      ws.mergeCells(row.number, 1, row.number, colSpan);
    }
    ws.addRow([]);
  }

  private buildOverviewSheet(workbook: ExcelJS.Workbook, report: any, snapshot: any) {
    const ws = workbook.addWorksheet('Overview');
    ws.getColumn(1).width = 25;
    ws.getColumn(2).width = 30;
    ws.getColumn(3).width = 20;
    ws.getColumn(4).width = 20;

    this.addTitleRow(ws, `Report: ${report.title}`, 4);

    // Report info
    const infoHeaders = ['Report Date', 'Scope', 'Captured At', 'Status'];
    const infoValues = [
      report.reportDate,
      snapshot.scope || report.scope,
      snapshot.capturedAt ? new Date(snapshot.capturedAt).toLocaleString() : '-',
      snapshot.project?.status || '-',
    ];

    const headerRow = ws.addRow(infoHeaders);
    headerRow.eachCell(cell => this.applyHeaderStyle(cell));
    const valueRow = ws.addRow(infoValues);
    valueRow.eachCell(cell => this.applyCellStyle(cell));
    ws.addRow([]);

    // Project info
    const project = snapshot.project || {};
    this.addTitleRow(ws, 'Project Information', 4);
    const projectHeaders = ['Metric', 'Value'];
    const pHeaderRow = ws.addRow(projectHeaders);
    pHeaderRow.eachCell(cell => this.applyHeaderStyle(cell));

    const projectRows = [
      ['Project Name', project.name || '-'],
      ['Estimated Effort', `${project.estimatedEffort || 0} man-months`],
      ['Actual Effort', `${project.actualEffort || 0} man-months`],
      ['Progress', `${(project.progress || 0).toFixed(1)}%`],
      ['Start Date', project.startDate || '-'],
      ['End Date', project.endDate || '-'],
    ];
    for (const [label, value] of projectRows) {
      const row = ws.addRow([label, value]);
      row.eachCell(cell => this.applyCellStyle(cell));
    }
    ws.addRow([]);

    // Stages summary
    const stages = snapshot.stages || [];
    if (stages.length > 0) {
      this.addTitleRow(ws, 'Stages Summary', 4);
      const stageHeaders = ['Stage', 'Progress', 'Est. Effort', 'Act. Effort'];
      const sHeaderRow = ws.addRow(stageHeaders);
      sHeaderRow.eachCell(cell => this.applyHeaderStyle(cell));

      for (const stage of stages) {
        const row = ws.addRow([
          stage.name,
          `${(stage.progress || 0).toFixed(1)}%`,
          stage.estimatedEffort || 0,
          stage.actualEffort || 0,
        ]);
        row.eachCell(cell => this.applyCellStyle(cell));
      }
    }
  }

  private buildEVMSheet(workbook: ExcelJS.Workbook, snapshot: any) {
    const ws = workbook.addWorksheet('EVM Metrics');
    ws.getColumn(1).width = 35;
    ws.getColumn(2).width = 20;
    ws.getColumn(3).width = 40;

    const schedule = snapshot.schedule || {};
    this.addTitleRow(ws, 'Earned Value Management (EVM)', 3);

    const headers = ['Metric', 'Value', 'Interpretation'];
    const headerRow = ws.addRow(headers);
    headerRow.eachCell(cell => this.applyHeaderStyle(cell));

    const spi = schedule.spi || 0;
    const cpi = schedule.cpi || 0;

    const rows = [
      ['Schedule Performance Index (SPI)', spi.toFixed(3), spi >= 1 ? 'On/Ahead of schedule' : 'Behind schedule'],
      ['Cost Performance Index (CPI)', cpi.toFixed(3), cpi >= 1 ? 'Under/On budget' : 'Over budget'],
      ['Planned Value (PV)', (schedule.plannedValue || 0).toFixed(2), 'Budgeted cost of planned work'],
      ['Earned Value (EV)', (schedule.earnedValue || 0).toFixed(2), 'Budgeted cost of completed work'],
      ['Actual Cost (AC)', (schedule.actualCost || 0).toFixed(2), 'Actual cost incurred'],
      ['Delay Rate', `${(schedule.delayRate || 0).toFixed(1)}%`, 'Percentage of schedule delay'],
      ['Delay (Man-Months)', (schedule.delayInManMonths || 0).toFixed(2), 'Schedule delay in man-months'],
      ['Est. vs Actual Ratio', (schedule.estimatedVsActual || 0).toFixed(3), 'Estimation accuracy'],
    ];

    for (const [label, value, interp] of rows) {
      const row = ws.addRow([label, value, interp]);
      row.eachCell(cell => this.applyCellStyle(cell));
    }

    // Apply color coding to SPI and CPI
    const spiCell = ws.getRow(4).getCell(2);
    this.applyStatusColor(spiCell, spi);
    const cpiCell = ws.getRow(5).getCell(2);
    this.applyStatusColor(cpiCell, cpi);
  }

  private buildForecastingSheet(workbook: ExcelJS.Workbook, snapshot: any) {
    const ws = workbook.addWorksheet('Forecasting');
    ws.getColumn(1).width = 40;
    ws.getColumn(2).width = 20;
    ws.getColumn(3).width = 45;

    const forecasting = snapshot.forecasting || {};
    this.addTitleRow(ws, 'Forecasting Metrics', 3);

    const headers = ['Metric', 'Value', 'Description'];
    const headerRow = ws.addRow(headers);
    headerRow.eachCell(cell => this.applyHeaderStyle(cell));

    const rows = [
      ['Budget at Completion (BAC)', (forecasting.bac || 0).toFixed(2), 'Total planned budget'],
      ['Estimate at Completion (EAC)', (forecasting.eac || 0).toFixed(2), 'Projected total cost at completion'],
      ['Variance at Completion (VAC)', (forecasting.vac || 0).toFixed(2), 'Projected budget surplus/deficit'],
      ['To-Complete Performance Index (TCPI)', (forecasting.tcpi || 0).toFixed(3), 'Required efficiency to complete on budget'],
    ];

    for (const [label, value, desc] of rows) {
      const row = ws.addRow([label, value, desc]);
      row.eachCell(cell => this.applyCellStyle(cell));
    }

    // Color code VAC
    const vacValue = forecasting.vac || 0;
    const vacCell = ws.getRow(5).getCell(2);
    if (vacValue >= 0) {
      vacCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
    } else {
      vacCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } };
    }
  }

  private buildQualitySheet(workbook: ExcelJS.Workbook, snapshot: any) {
    const ws = workbook.addWorksheet('Quality');
    ws.getColumn(1).width = 30;
    ws.getColumn(2).width = 20;

    const testing = snapshot.testing || {};
    this.addTitleRow(ws, 'Quality Metrics', 2);

    const headers = ['Metric', 'Value'];
    const headerRow = ws.addRow(headers);
    headerRow.eachCell(cell => this.applyHeaderStyle(cell));

    const rows = [
      ['Total Test Cases', testing.totalTestCases || 0],
      ['Passed Test Cases', testing.passedTestCases || 0],
      ['Failed Test Cases', testing.failedTestCases || 0],
      ['Defect Rate', `${((testing.defectRate || 0) * 100).toFixed(1)}%`],
    ];

    for (const [label, value] of rows) {
      const row = ws.addRow([label, value]);
      row.eachCell(cell => this.applyCellStyle(cell));
    }

    // Stage-level testing
    const stages = snapshot.stages || [];
    const stagesWithTests = stages.filter((s: any) => s.testing && s.testing.totalTestCases > 0);
    if (stagesWithTests.length > 0) {
      ws.addRow([]);
      this.addTitleRow(ws, 'Testing by Stage', 2);
      const stageHeaders = ['Stage', 'Total', 'Passed', 'Failed'];
      ws.getColumn(3).width = 15;
      ws.getColumn(4).width = 15;
      const sHeaderRow = ws.addRow(stageHeaders);
      sHeaderRow.eachCell(cell => this.applyHeaderStyle(cell));

      for (const stage of stagesWithTests) {
        const row = ws.addRow([
          stage.name,
          stage.testing.totalTestCases,
          stage.testing.passedTestCases,
          stage.testing.failedTestCases,
        ]);
        row.eachCell(cell => this.applyCellStyle(cell));
      }
    }
  }

  private buildProductivitySheet(workbook: ExcelJS.Workbook, snapshot: any) {
    const ws = workbook.addWorksheet('Productivity');
    ws.getColumn(1).width = 25;
    ws.getColumn(2).width = 15;
    ws.getColumn(3).width = 18;
    ws.getColumn(4).width = 15;
    ws.getColumn(5).width = 15;
    ws.getColumn(6).width = 20;

    const productivity = snapshot.productivity;
    if (!productivity) {
      ws.addRow(['No productivity data available']);
      return;
    }

    // Summary
    this.addTitleRow(ws, 'Productivity Summary', 6);
    const summary = productivity.summary || {};
    const summaryHeaders = ['Metric', 'Value'];
    const sHeaderRow = ws.addRow(summaryHeaders);
    sHeaderRow.eachCell(cell => this.applyHeaderStyle(cell));

    const summaryRows = [
      ['Overall Efficiency', `${((summary.efficiency || 0) * 100).toFixed(1)}%`],
      // completionRate is stored as integer % (0-100), not decimal
      ['Completion Rate', `${(summary.completionRate || 0).toFixed(1)}%`],
      ['Tasks Completed', `${summary.tasksCompleted || 0} / ${summary.tasksTotal || 0}`],
      ['Avg. Effort per Task', `${(summary.avgEffortPerTask || 0).toFixed(1)}h`],
      // variancePercent is already a % integer; variance is raw man-hours
      ['Effort Variance', `${summary.variancePercent > 0 ? '+' : ''}${summary.variancePercent || 0}%`],
    ];
    for (const [label, value] of summaryRows) {
      const row = ws.addRow([label, value]);
      row.eachCell(cell => this.applyCellStyle(cell));
    }
    // Color code efficiency row
    const effCell = ws.getRow(ws.rowCount - 4).getCell(2);
    this.applyEfficiencyColor(effCell, summary.efficiency || 0);
    ws.addRow([]);

    // By Member
    const byMember = productivity.byMember || [];
    if (byMember.length > 0) {
      this.addTitleRow(ws, 'Productivity by Member', 6);
      const memberHeaders = ['Member', 'Role', 'Efficiency', 'Tasks Done', 'Total Tasks', 'Completion Rate'];
      const mHeaderRow = ws.addRow(memberHeaders);
      mHeaderRow.eachCell(cell => this.applyHeaderStyle(cell));

      for (const m of byMember) {
        const eff = m.efficiency || 0;
        const row = ws.addRow([
          m.memberName || m.name || '-',
          m.role || '-',
          `${(eff * 100).toFixed(1)}%`,
          m.tasksCompleted || 0,
          m.tasksTotal || 0,
          `${m.completionRate || 0}%`,
        ]);
        row.eachCell(cell => this.applyCellStyle(cell));
        this.applyEfficiencyColor(row.getCell(3), eff);
      }
      ws.addRow([]);
    }

    // By Role
    const byRole = productivity.byRole || [];
    if (byRole.length > 0) {
      this.addTitleRow(ws, 'Productivity by Role', 6);
      const roleHeaders = ['Role', 'Members', 'Efficiency', 'Tasks Done', 'Total Tasks', 'Avg Effort/Task'];
      const rHeaderRow = ws.addRow(roleHeaders);
      rHeaderRow.eachCell(cell => this.applyHeaderStyle(cell));

      for (const r of byRole) {
        const eff = r.efficiency || 0;
        const row = ws.addRow([
          r.role || '-',
          r.memberCount || 0,
          `${(eff * 100).toFixed(1)}%`,
          r.tasksCompleted || 0,
          r.tasksTotal || 0,
          `${(r.avgEffortPerTask || 0).toFixed(1)}h`,
        ]);
        row.eachCell(cell => this.applyCellStyle(cell));
        this.applyEfficiencyColor(row.getCell(3), eff);
      }
    }
  }

  private buildMemberCostSheet(workbook: ExcelJS.Workbook, snapshot: any) {
    const ws = workbook.addWorksheet('Member Cost');
    ws.getColumn(1).width = 25;
    ws.getColumn(2).width = 15;
    ws.getColumn(3).width = 15;
    ws.getColumn(4).width = 20;
    ws.getColumn(5).width = 20;
    ws.getColumn(6).width = 18;
    ws.getColumn(7).width = 18;

    const memberCost = snapshot.memberCost;
    if (!memberCost) {
      ws.addRow(['No member cost data available']);
      return;
    }

    // Summary
    this.addTitleRow(ws, 'Cost Analysis Summary', 7);
    const summary = memberCost.summary || {};
    const summaryHeaders = ['Metric', 'Value'];
    const sHeaderRow = ws.addRow(summaryHeaders);
    sHeaderRow.eachCell(cell => this.applyHeaderStyle(cell));

    const summaryRows = [
      ['Total Estimated Cost', summary.totalEstimatedCost || 0],
      ['Total Actual Cost', summary.totalActualCost || 0],
      ['Cost Variance', summary.costVariance || 0],
      ['Overall Efficiency', `${((summary.overallEfficiency || 0) * 100).toFixed(1)}%`],
      ['Member Count', summary.memberCount || 0],
    ];
    for (const [label, value] of summaryRows) {
      const row = ws.addRow([label, value]);
      row.eachCell(cell => this.applyCellStyle(cell));
    }
    // Color code cost variance
    const cvRow = ws.getRow(ws.rowCount - 2);
    const cvCell = cvRow.getCell(2);
    const cv = summary.costVariance || 0;
    cvCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cv >= 0 ? 'FF90EE90' : 'FFFFCDD2' } };
    ws.addRow([]);

    // By Member
    const byMember = memberCost.byMember || [];
    if (byMember.length > 0) {
      this.addTitleRow(ws, 'Cost by Member', 7);
      const memberHeaders = ['Member', 'Role', 'Hourly Rate', 'Est. Hours', 'Act. Hours', 'Est. Cost', 'Act. Cost', 'Efficiency'];
      ws.getColumn(8).width = 15;
      const mHeaderRow = ws.addRow(memberHeaders);
      mHeaderRow.eachCell(cell => this.applyHeaderStyle(cell));

      for (const m of byMember) {
        const eff = m.efficiency || 0;
        const row = ws.addRow([
          m.memberName || m.name || '-',
          m.role || '-',
          m.hourlyRate || 0,
          (m.totalEstimatedHours || 0).toFixed(1),
          (m.totalActualHours || 0).toFixed(1),
          m.totalEstimatedCost || 0,
          m.totalActualCost || 0,
          `${(eff * 100).toFixed(1)}%`,
        ]);
        row.eachCell(cell => this.applyCellStyle(cell));
        this.applyEfficiencyColor(row.getCell(8), eff);
      }
      ws.addRow([]);
    }

    // By Stage
    const byStage = memberCost.byStage || [];
    if (byStage.length > 0) {
      this.addTitleRow(ws, 'Cost by Stage', 7);
      const stageHeaders = ['Stage', 'Members', 'Est. Cost', 'Act. Cost', 'Variance', 'Variance %'];
      ws.getColumn(6).width = 15;
      const stHeaderRow = ws.addRow(stageHeaders);
      stHeaderRow.eachCell(cell => this.applyHeaderStyle(cell));

      for (const s of byStage) {
        const variance = (s.actualCost || 0) - (s.estimatedCost || 0);
        const varPct = s.estimatedCost > 0 ? ((variance / s.estimatedCost) * 100).toFixed(1) : '0.0';
        const row = ws.addRow([
          s.stageName || '-',
          s.memberCount || 0,
          s.estimatedCost || 0,
          s.actualCost || 0,
          variance,
          `${variance >= 0 ? '+' : ''}${varPct}%`,
        ]);
        row.eachCell(cell => this.applyCellStyle(cell));
        const varCell = row.getCell(5);
        varCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: variance <= 0 ? 'FF90EE90' : 'FFFFCDD2' } };
      }
    }
  }

  private buildStageDetailSheet(workbook: ExcelJS.Workbook, snapshot: any) {
    const stageDetail = snapshot.stageDetail;
    if (!stageDetail?.stages?.length) return;

    const ws = workbook.addWorksheet('Stage Detail');
    ws.getColumn(1).width = 25;
    ws.getColumn(2).width = 18;
    ws.getColumn(3).width = 15;
    ws.getColumn(4).width = 15;
    ws.getColumn(5).width = 18;
    ws.getColumn(6).width = 15;

    this.addTitleRow(ws, 'Stage Detail Breakdown', 6);

    const headers = ['Stage', 'Progress', 'SPI', 'CPI', 'Est. Effort', 'Act. Effort'];
    const headerRow = ws.addRow(headers);
    headerRow.eachCell(cell => this.applyHeaderStyle(cell));

    for (const stage of stageDetail.stages) {
      const metrics = stage.metrics || {};
      const spi = metrics.spi || 0;
      const cpi = metrics.cpi || 0;
      const row = ws.addRow([
        stage.name || '-',
        `${(stage.progress || 0).toFixed(1)}%`,
        spi.toFixed(3),
        cpi.toFixed(3),
        metrics.estimatedEffort || 0,
        metrics.actualEffort || 0,
      ]);
      row.eachCell(cell => this.applyCellStyle(cell));
      this.applyStatusColor(row.getCell(3), spi);
      this.applyStatusColor(row.getCell(4), cpi);
    }
  }

  private buildCommentarySheet(workbook: ExcelJS.Workbook, commentaries: any[]) {
    const ws = workbook.addWorksheet('Commentary');
    ws.getColumn(1).width = 15;
    ws.getColumn(2).width = 15;
    ws.getColumn(3).width = 10;
    ws.getColumn(4).width = 80;

    this.addTitleRow(ws, 'Commentaries', 4);

    const headers = ['Type', 'Author', 'Version', 'Content'];
    const headerRow = ws.addRow(headers);
    headerRow.eachCell(cell => this.applyHeaderStyle(cell));

    for (const c of commentaries) {
      const row = ws.addRow([
        c.type || '-',
        c.author || '-',
        c.version || 1,
        c.content || '-',
      ]);
      row.eachCell(cell => this.applyCellStyle(cell));
      row.getCell(4).alignment = { wrapText: true, vertical: 'top' };
    }
  }

  // ===== CSV Export =====

  async generateCsv(reportId: number): Promise<string> {
    const report = await this.reportService.findOne(reportId);
    const snapshot = report.snapshotData || {};
    const commentaries = report.commentaries || [];

    const sections: string[] = [];
    const escape = (v: any) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const row = (...cols: any[]) => cols.map(escape).join(',');

    // Report header
    sections.push('REPORT SUMMARY');
    sections.push(row('Title', report.title));
    sections.push(row('Date', report.reportDate));
    sections.push(row('Scope', snapshot.scope || report.scope));
    sections.push(row('Generated', new Date().toLocaleString()));
    sections.push('');

    // Project
    const project = snapshot.project || {};
    sections.push('PROJECT');
    sections.push(row('Name', 'Status', 'Progress', 'Est. Effort', 'Act. Effort', 'Start Date', 'End Date'));
    sections.push(row(
      project.name,
      project.status,
      `${(project.progress || 0).toFixed(1)}%`,
      project.estimatedEffort || 0,
      project.actualEffort || 0,
      project.startDate,
      project.endDate,
    ));
    sections.push('');

    // EVM
    const schedule = snapshot.schedule || {};
    sections.push('EVM METRICS');
    sections.push(row('Metric', 'Value'));
    sections.push(row('SPI', (schedule.spi || 0).toFixed(3)));
    sections.push(row('CPI', (schedule.cpi || 0).toFixed(3)));
    sections.push(row('Planned Value (PV)', (schedule.plannedValue || 0).toFixed(2)));
    sections.push(row('Earned Value (EV)', (schedule.earnedValue || 0).toFixed(2)));
    sections.push(row('Actual Cost (AC)', (schedule.actualCost || 0).toFixed(2)));
    sections.push(row('Delay Rate', `${(schedule.delayRate || 0).toFixed(1)}%`));
    sections.push(row('Delay (Man-Months)', (schedule.delayInManMonths || 0).toFixed(2)));
    sections.push('');

    // Forecasting
    const forecasting = snapshot.forecasting || {};
    sections.push('FORECASTING');
    sections.push(row('BAC', 'EAC', 'VAC', 'TCPI'));
    sections.push(row(
      (forecasting.bac || 0).toFixed(2),
      (forecasting.eac || 0).toFixed(2),
      (forecasting.vac || 0).toFixed(2),
      (forecasting.tcpi || 0).toFixed(3),
    ));
    sections.push('');

    // Quality
    const testing = snapshot.testing || {};
    sections.push('QUALITY');
    sections.push(row('Total Test Cases', 'Passed', 'Failed', 'Defect Rate'));
    sections.push(row(
      testing.totalTestCases || 0,
      testing.passedTestCases || 0,
      testing.failedTestCases || 0,
      `${((testing.defectRate || 0) * 100).toFixed(1)}%`,
    ));
    sections.push('');

    // Productivity by Member
    if (snapshot.productivity?.byMember?.length) {
      const prodSummary = snapshot.productivity.summary || {};
      sections.push('PRODUCTIVITY SUMMARY');
      sections.push(row('Efficiency', 'Completion Rate', 'Tasks Completed', 'Tasks Total', 'Avg Effort/Task', 'Variance %'));
      sections.push(row(
        `${((prodSummary.efficiency || 0) * 100).toFixed(1)}%`,
        `${(prodSummary.completionRate || 0).toFixed(1)}%`,
        prodSummary.tasksCompleted || 0,
        prodSummary.tasksTotal || 0,
        `${(prodSummary.avgEffortPerTask || 0).toFixed(1)}h`,
        `${prodSummary.variancePercent > 0 ? '+' : ''}${prodSummary.variancePercent || 0}%`,
      ));
      sections.push('');

      sections.push('PRODUCTIVITY BY MEMBER');
      sections.push(row('Member', 'Role', 'Efficiency', 'Tasks Completed', 'Tasks Total', 'Completion Rate'));
      for (const m of snapshot.productivity.byMember) {
        sections.push(row(
          m.memberName || m.name,
          m.role,
          `${((m.efficiency || 0) * 100).toFixed(1)}%`,
          m.tasksCompleted || 0,
          m.tasksTotal || 0,
          `${m.completionRate || 0}%`,
        ));
      }
      sections.push('');

      if (snapshot.productivity.byRole?.length) {
        sections.push('PRODUCTIVITY BY ROLE');
        sections.push(row('Role', 'Members', 'Efficiency', 'Tasks Completed', 'Tasks Total', 'Avg Effort/Task'));
        for (const r of snapshot.productivity.byRole) {
          sections.push(row(
            r.role,
            r.memberCount || 0,
            `${((r.efficiency || 0) * 100).toFixed(1)}%`,
            r.tasksCompleted || 0,
            r.tasksTotal || 0,
            `${(r.avgEffortPerTask || 0).toFixed(1)}h`,
          ));
        }
        sections.push('');
      }
    }

    // Member Cost
    if (snapshot.memberCost?.byMember?.length) {
      sections.push('MEMBER COST BY MEMBER');
      sections.push(row('Member', 'Role', 'Hourly Rate', 'Est. Hours', 'Act. Hours', 'Est. Cost', 'Act. Cost', 'Efficiency'));
      for (const m of snapshot.memberCost.byMember) {
        sections.push(row(
          m.memberName || m.name,
          m.role,
          m.hourlyRate || 0,
          (m.totalEstimatedHours || 0).toFixed(1),
          (m.totalActualHours || 0).toFixed(1),
          m.totalEstimatedCost || 0,
          m.totalActualCost || 0,
          `${((m.efficiency || 0) * 100).toFixed(1)}%`,
        ));
      }
      sections.push('');
    }

    // Commentaries
    if (commentaries.length > 0) {
      sections.push('COMMENTARIES');
      sections.push(row('Type', 'Author', 'Version', 'Content'));
      for (const c of commentaries) {
        sections.push(row(c.type, c.author, c.version || 1, c.content));
      }
    }

    return sections.join('\n');
  }

  // ===== PDF Export =====

  async generatePdf(reportId: number): Promise<Buffer> {
    const report = await this.reportService.findOne(reportId);
    const snapshot = report.snapshotData || {};
    const commentaries = report.commentaries || [];

    const PdfPrinter = require('pdfmake/src/printer');
    const path = require('path');
    const fs = require('fs');

    // Use standard fonts bundled with pdfmake
    const fontsDir = path.join(require.resolve('pdfmake'), '..', '..', 'fonts');
    let fonts: Record<string, any>;

    // Try to use Roboto from pdfmake, fallback to basic config
    const robotoPath = path.join(fontsDir, 'Roboto');
    if (fs.existsSync(path.join(robotoPath, 'Roboto-Regular.ttf'))) {
      fonts = {
        Roboto: {
          normal: path.join(robotoPath, 'Roboto-Regular.ttf'),
          bold: path.join(robotoPath, 'Roboto-Medium.ttf'),
          italics: path.join(robotoPath, 'Roboto-Italic.ttf'),
          bolditalics: path.join(robotoPath, 'Roboto-MediumItalic.ttf'),
        },
      };
    } else {
      // Fallback: search in standard pdfmake locations
      const altFontsDir = path.join(require.resolve('pdfmake'), '..', 'fonts');
      fonts = {
        Roboto: {
          normal: path.join(altFontsDir, 'Roboto', 'Roboto-Regular.ttf'),
          bold: path.join(altFontsDir, 'Roboto', 'Roboto-Medium.ttf'),
          italics: path.join(altFontsDir, 'Roboto', 'Roboto-Italic.ttf'),
          bolditalics: path.join(altFontsDir, 'Roboto', 'Roboto-MediumItalic.ttf'),
        },
      };
    }

    const printer = new PdfPrinter(fonts);

    const project = snapshot.project || {};
    const schedule = snapshot.schedule || {};
    const forecasting = snapshot.forecasting || {};
    const testing = snapshot.testing || {};
    const productivity = snapshot.productivity;
    const memberCost = snapshot.memberCost;

    // Helper: color cell based on index value vs thresholds
    const statusFill = (value: number, good = 0.95, warn = 0.85) =>
      value >= good ? '#C8E6C9' : value >= warn ? '#FFF9C4' : '#FFCDD2';
    const efficiencyFill = (value: number) =>
      value >= 1.2 ? '#C8E6C9' : value >= 1.0 ? '#BBDEFB' : value >= 0.8 ? '#FFF9C4' : '#FFCDD2';

    // Build colored EVM rows
    const spi = schedule.spi || 0;
    const cpi = schedule.cpi || 0;
    const evmRows = [
      [
        'SPI',
        { text: spi.toFixed(3), fillColor: statusFill(spi) },
        spi >= 1 ? 'On/Ahead of schedule' : 'Behind schedule',
      ],
      [
        'CPI',
        { text: cpi.toFixed(3), fillColor: statusFill(cpi) },
        cpi >= 1 ? 'Under/On budget' : 'Over budget',
      ],
      ['Planned Value (PV)', (schedule.plannedValue || 0).toFixed(2), ''],
      ['Earned Value (EV)', (schedule.earnedValue || 0).toFixed(2), ''],
      ['Actual Cost (AC)', (schedule.actualCost || 0).toFixed(2), ''],
      ['Delay Rate', `${(schedule.delayRate || 0).toFixed(1)}%`, ''],
      ['Delay (Man-Months)', (schedule.delayInManMonths || 0).toFixed(2), ''],
    ];

    // Build VAC colored row
    const vac = forecasting.vac || 0;
    const forecastRows = [
      ['BAC', (forecasting.bac || 0).toFixed(2), 'Total planned budget'],
      ['EAC', (forecasting.eac || 0).toFixed(2), 'Projected total cost'],
      ['VAC', { text: (vac).toFixed(2), fillColor: vac >= 0 ? '#C8E6C9' : '#FFCDD2' }, 'Budget variance'],
      ['TCPI', (forecasting.tcpi || 0).toFixed(3), 'Required efficiency'],
    ];

    // Build productivity member rows
    const prodMemberRows = (productivity?.byMember || []).map((m: any) => {
      const eff = m.efficiency || 0;
      return [
        m.memberName || m.name || '-',
        m.role || '-',
        { text: `${(eff * 100).toFixed(0)}%`, fillColor: efficiencyFill(eff) },
        `${m.tasksCompleted || 0}/${m.tasksTotal || 0}`,
        `${m.completionRate || 0}%`,
      ];
    });

    // Build productivity role rows
    const prodRoleRows = (productivity?.byRole || []).map((r: any) => {
      const eff = r.efficiency || 0;
      return [
        r.role || '-',
        r.memberCount || 0,
        { text: `${(eff * 100).toFixed(0)}%`, fillColor: efficiencyFill(eff) },
        `${r.tasksCompleted || 0}/${r.tasksTotal || 0}`,
        `${(r.avgEffortPerTask || 0).toFixed(1)}h`,
      ];
    });

    // Build member cost rows
    const memberCostRows = (memberCost?.byMember || []).map((m: any) => {
      const eff = m.efficiency || 0;
      return [
        m.memberName || m.name || '-',
        m.role || '-',
        `${(eff * 100).toFixed(0)}%` ,
        { text: `${(eff * 100).toFixed(0)}%`, fillColor: efficiencyFill(eff) },
        `${(m.totalActualHours || 0).toFixed(1)}h`,
        m.totalActualCost || 0,
        m.totalEstimatedCost || 0,
      ];
    });

    // Build stage detail rows
    const stageRows = (snapshot.stageDetail?.stages || snapshot.stages || []).map((s: any) => {
      const metrics = s.metrics || {};
      const sSpi = metrics.spi || 0;
      const sCpi = metrics.cpi || 0;
      return [
        s.name || '-',
        `${(s.progress || 0).toFixed(1)}%`,
        { text: sSpi.toFixed(3), fillColor: statusFill(sSpi) },
        { text: sCpi.toFixed(3), fillColor: statusFill(sCpi) },
        metrics.estimatedEffort || s.estimatedEffort || 0,
        metrics.actualEffort || s.actualEffort || 0,
      ];
    });

    // Build insights section
    const prodSummary = productivity?.summary || {};
    const costSummary = memberCost?.summary || {};
    const insights: string[] = [];
    if (spi >= 1) {
      insights.push(`• Schedule: Ahead of schedule (SPI ${spi.toFixed(2)})`);
    } else {
      insights.push(`• Schedule: Behind schedule (SPI ${spi.toFixed(2)}) — ${((1 - spi) * 100).toFixed(0)}% slower than planned`);
    }
    if (cpi >= 1) {
      insights.push(`• Budget: Under budget (CPI ${cpi.toFixed(2)}) — ${((cpi - 1) * 100).toFixed(0)}% more efficient than planned`);
    } else {
      insights.push(`• Budget: Over budget (CPI ${cpi.toFixed(2)}) — ${((1 - cpi) * 100).toFixed(0)}% over planned cost`);
    }
    if (prodSummary.efficiency != null) {
      insights.push(`• Team Efficiency: ${((prodSummary.efficiency || 0) * 100).toFixed(0)}% — Tasks completed: ${prodSummary.tasksCompleted || 0}/${prodSummary.tasksTotal || 0}`);
    }
    if (vac >= 0) {
      insights.push(`• Forecast: Projected to finish under budget with ${vac.toFixed(2)} man-months savings`);
    } else {
      insights.push(`• Forecast: Projected to exceed budget by ${Math.abs(vac).toFixed(2)} man-months (EAC: ${(forecasting.eac || 0).toFixed(2)})`);
    }
    if (costSummary.costVariance != null) {
      const cv = costSummary.costVariance || 0;
      insights.push(`• Cost Variance: ${cv >= 0 ? 'Savings' : 'Overrun'} of ${Math.abs(cv).toFixed(2)} (Overall efficiency: ${((costSummary.overallEfficiency || 0) * 100).toFixed(0)}%)`);
    }

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 70, 40, 55],

      header: (currentPage: number, pageCount: number) => ({
        columns: [
          {
            text: project.name ? `Project: ${project.name}` : 'PCQM Report',
            style: 'pageHeader',
            margin: [40, 20, 0, 0],
          },
          {
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: 'right',
            style: 'pageHeader',
            margin: [0, 20, 40, 0],
          },
        ],
      }),

      footer: (_currentPage: number, _pageCount: number) => ({
        text: `Generated by PCQM System • ${new Date().toLocaleDateString()}`,
        alignment: 'center',
        style: 'pageFooter',
        margin: [0, 10, 0, 0],
      }),

      content: [
        // Title block
        { text: report.title, style: 'title' },
        { text: `Report Date: ${report.reportDate} | Scope: ${report.scope}`, style: 'subtitle' },
        { text: `Generated: ${new Date().toLocaleString()}`, style: 'small', margin: [0, 0, 0, 15] },

        // Project Overview
        { text: 'Project Overview', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [{ text: 'Metric', style: 'tableHeader' }, { text: 'Value', style: 'tableHeader' }],
              ['Project Name', project.name || '-'],
              ['Status', project.status || '-'],
              ['Progress', `${(project.progress || 0).toFixed(1)}%`],
              ['Estimated Effort', `${project.estimatedEffort || 0} man-months`],
              ['Actual Effort', `${project.actualEffort || 0} man-months`],
              ['Start Date', project.startDate || '-'],
              ['End Date', project.endDate || '-'],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 15],
        },

        // Insights
        ...(insights.length > 0 ? [
          { text: 'Key Insights', style: 'sectionHeader' },
          {
            stack: insights.map(line => ({ text: line, margin: [0, 2, 0, 2], fontSize: 10 })),
            margin: [0, 0, 0, 15],
          },
        ] : []),

        // EVM Metrics
        { text: 'Earned Value Management (EVM)', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', 'auto', '*'],
            body: [
              [
                { text: 'Metric', style: 'tableHeader' },
                { text: 'Value', style: 'tableHeader' },
                { text: 'Interpretation', style: 'tableHeader' },
              ],
              ...evmRows,
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 15],
        },

        // Forecasting
        { text: 'Forecasting', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', 'auto', '*'],
            body: [
              [
                { text: 'Metric', style: 'tableHeader' },
                { text: 'Value', style: 'tableHeader' },
                { text: 'Description', style: 'tableHeader' },
              ],
              ...forecastRows,
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 15],
        },

        // Quality
        { text: 'Quality Metrics', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [{ text: 'Metric', style: 'tableHeader' }, { text: 'Value', style: 'tableHeader' }],
              ['Total Test Cases', testing.totalTestCases || 0],
              ['Passed', testing.passedTestCases || 0],
              ['Failed', testing.failedTestCases || 0],
              ['Defect Rate', `${((testing.defectRate || 0) * 100).toFixed(1)}%`],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 15],
        },

        // Stage breakdown
        ...(stageRows.length > 0 ? [
          { text: 'Stage Breakdown', style: 'sectionHeader' },
          {
            table: {
              widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
              body: [
                [
                  { text: 'Stage', style: 'tableHeader' },
                  { text: 'Progress', style: 'tableHeader' },
                  { text: 'SPI', style: 'tableHeader' },
                  { text: 'CPI', style: 'tableHeader' },
                  { text: 'Est. Effort', style: 'tableHeader' },
                  { text: 'Act. Effort', style: 'tableHeader' },
                ],
                ...stageRows,
              ],
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 15],
          },
        ] : []),

        // Productivity
        ...(productivity ? [
          { text: 'Team Productivity', style: 'sectionHeader' },
          {
            table: {
              widths: ['*', 'auto'],
              body: [
                [{ text: 'Metric', style: 'tableHeader' }, { text: 'Value', style: 'tableHeader' }],
                ['Overall Efficiency', {
                  text: `${((prodSummary.efficiency || 0) * 100).toFixed(1)}%`,
                  fillColor: efficiencyFill(prodSummary.efficiency || 0),
                }],
                // completionRate is already an integer %, no *100
                ['Completion Rate', `${(prodSummary.completionRate || 0).toFixed(0)}%`],
                ['Tasks Completed', `${prodSummary.tasksCompleted || 0} / ${prodSummary.tasksTotal || 0}`],
                ['Avg. Effort per Task', `${(prodSummary.avgEffortPerTask || 0).toFixed(1)}h`],
                ['Effort Variance', `${prodSummary.variancePercent > 0 ? '+' : ''}${prodSummary.variancePercent || 0}%`],
              ],
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 10],
          },
          ...(prodMemberRows.length > 0 ? [
            { text: 'By Member', style: 'subHeader' },
            {
              table: {
                widths: ['*', 'auto', 'auto', 'auto', 'auto'],
                body: [
                  [
                    { text: 'Member', style: 'tableHeader' },
                    { text: 'Role', style: 'tableHeader' },
                    { text: 'Efficiency', style: 'tableHeader' },
                    { text: 'Tasks', style: 'tableHeader' },
                    { text: 'Completion', style: 'tableHeader' },
                  ],
                  ...prodMemberRows,
                ],
              },
              layout: 'lightHorizontalLines',
              margin: [0, 0, 0, 10],
            },
          ] : []),
          ...(prodRoleRows.length > 0 ? [
            { text: 'By Role', style: 'subHeader' },
            {
              table: {
                widths: ['*', 'auto', 'auto', 'auto', 'auto'],
                body: [
                  [
                    { text: 'Role', style: 'tableHeader' },
                    { text: 'Members', style: 'tableHeader' },
                    { text: 'Efficiency', style: 'tableHeader' },
                    { text: 'Tasks', style: 'tableHeader' },
                    { text: 'Avg Effort/Task', style: 'tableHeader' },
                  ],
                  ...prodRoleRows,
                ],
              },
              layout: 'lightHorizontalLines',
              margin: [0, 0, 0, 15],
            },
          ] : []),
        ] : []),

        // Member Cost
        ...(memberCost ? [
          { text: 'Member Cost Analysis', style: 'sectionHeader' },
          {
            table: {
              widths: ['*', 'auto'],
              body: [
                [{ text: 'Metric', style: 'tableHeader' }, { text: 'Value', style: 'tableHeader' }],
                ['Total Estimated Cost', costSummary.totalEstimatedCost || 0],
                ['Total Actual Cost', costSummary.totalActualCost || 0],
                ['Cost Variance', {
                  text: String(costSummary.costVariance || 0),
                  fillColor: (costSummary.costVariance || 0) >= 0 ? '#C8E6C9' : '#FFCDD2',
                }],
                ['Overall Efficiency', `${((costSummary.overallEfficiency || 0) * 100).toFixed(1)}%`],
              ],
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 10],
          },
          ...(memberCostRows.length > 0 ? [
            { text: 'Cost by Member', style: 'subHeader' },
            {
              table: {
                widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
                body: [
                  [
                    { text: 'Member', style: 'tableHeader' },
                    { text: 'Role', style: 'tableHeader' },
                    { text: 'Efficiency', style: 'tableHeader' },
                    { text: 'Actual Hours', style: 'tableHeader' },
                    { text: 'Actual Cost', style: 'tableHeader' },
                    { text: 'Est. Cost', style: 'tableHeader' },
                  ],
                  ...memberCostRows.map((r: any) => [r[0], r[1], r[3], r[4], r[5], r[6]]),
                ],
              },
              layout: 'lightHorizontalLines',
              margin: [0, 0, 0, 15],
            },
          ] : []),
        ] : []),

        // Commentary
        ...(commentaries.length > 0 ? [
          { text: 'Commentaries', style: 'sectionHeader' },
          ...commentaries.map((c: any) => ({
            stack: [
              { text: `${c.type} (v${c.version})${c.author ? ' — ' + c.author : ''}`, style: 'commentaryHeader' },
              { text: c.content || '', margin: [0, 2, 0, 10], fontSize: 9 },
            ],
          })),
        ] : []),
      ],

      styles: {
        title: { fontSize: 18, bold: true, color: '#1565C0', margin: [0, 0, 0, 5] },
        subtitle: { fontSize: 11, color: '#666666', margin: [0, 0, 0, 3] },
        small: { fontSize: 9, color: '#999999' },
        sectionHeader: { fontSize: 13, bold: true, color: '#1565C0', margin: [0, 12, 0, 6] },
        subHeader: { fontSize: 11, bold: true, color: '#37474F', margin: [0, 6, 0, 4] },
        tableHeader: { bold: true, fillColor: '#D9E1F2', fontSize: 10 },
        commentaryHeader: { bold: true, fontSize: 10, color: '#333333' },
        pageHeader: { fontSize: 8, color: '#999999' },
        pageFooter: { fontSize: 8, color: '#BBBBBB' },
      },
      defaultStyle: { fontSize: 10 },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (err: Error) => reject(err));
      pdfDoc.end();
    });
  }
}
