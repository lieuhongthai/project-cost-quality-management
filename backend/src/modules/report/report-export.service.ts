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
    ws.getColumn(3).width = 15;
    ws.getColumn(4).width = 20;
    ws.getColumn(5).width = 20;

    const productivity = snapshot.productivity;
    if (!productivity) {
      ws.addRow(['No productivity data available']);
      return;
    }

    // Summary
    this.addTitleRow(ws, 'Productivity Summary', 5);
    const summary = productivity.summary || {};
    const summaryHeaders = ['Metric', 'Value'];
    const sHeaderRow = ws.addRow(summaryHeaders);
    sHeaderRow.eachCell(cell => this.applyHeaderStyle(cell));

    const summaryRows = [
      ['Overall Efficiency', `${((summary.efficiency || 0) * 100).toFixed(1)}%`],
      ['Completion Rate', `${((summary.completionRate || 0) * 100).toFixed(1)}%`],
      ['Effort Variance', `${((summary.variance || 0) * 100).toFixed(1)}%`],
    ];
    for (const [label, value] of summaryRows) {
      const row = ws.addRow([label, value]);
      row.eachCell(cell => this.applyCellStyle(cell));
    }
    ws.addRow([]);

    // By Member
    const byMember = productivity.byMember || [];
    if (byMember.length > 0) {
      this.addTitleRow(ws, 'Productivity by Member', 5);
      const memberHeaders = ['Member', 'Role', 'Efficiency', 'Tasks Done', 'Total Tasks'];
      const mHeaderRow = ws.addRow(memberHeaders);
      mHeaderRow.eachCell(cell => this.applyHeaderStyle(cell));

      for (const m of byMember) {
        const row = ws.addRow([
          m.memberName || m.name || '-',
          m.role || '-',
          `${((m.efficiency || 0) * 100).toFixed(1)}%`,
          m.tasksCompleted || 0,
          m.totalTasks || 0,
        ]);
        row.eachCell(cell => this.applyCellStyle(cell));
      }
      ws.addRow([]);
    }

    // By Role
    const byRole = productivity.byRole || [];
    if (byRole.length > 0) {
      this.addTitleRow(ws, 'Productivity by Role', 5);
      const roleHeaders = ['Role', 'Members', 'Avg Efficiency', 'Tasks Done', 'Total Tasks'];
      const rHeaderRow = ws.addRow(roleHeaders);
      rHeaderRow.eachCell(cell => this.applyHeaderStyle(cell));

      for (const r of byRole) {
        const row = ws.addRow([
          r.role || '-',
          r.memberCount || 0,
          `${((r.efficiency || 0) * 100).toFixed(1)}%`,
          r.tasksCompleted || 0,
          r.totalTasks || 0,
        ]);
        row.eachCell(cell => this.applyCellStyle(cell));
      }
    }
  }

  private buildMemberCostSheet(workbook: ExcelJS.Workbook, snapshot: any) {
    const ws = workbook.addWorksheet('Member Cost');
    ws.getColumn(1).width = 25;
    ws.getColumn(2).width = 15;
    ws.getColumn(3).width = 20;
    ws.getColumn(4).width = 20;
    ws.getColumn(5).width = 20;
    ws.getColumn(6).width = 20;

    const memberCost = snapshot.memberCost;
    if (!memberCost) {
      ws.addRow(['No member cost data available']);
      return;
    }

    // Summary
    this.addTitleRow(ws, 'Cost Analysis Summary', 6);
    const summary = memberCost.summary || {};
    const summaryHeaders = ['Metric', 'Value'];
    const sHeaderRow = ws.addRow(summaryHeaders);
    sHeaderRow.eachCell(cell => this.applyHeaderStyle(cell));

    const summaryRows = [
      ['Total Estimated Cost', summary.totalEstimatedCost || 0],
      ['Total Actual Cost', summary.totalActualCost || 0],
      ['Cost Variance', summary.costVariance || 0],
    ];
    for (const [label, value] of summaryRows) {
      const row = ws.addRow([label, value]);
      row.eachCell(cell => this.applyCellStyle(cell));
    }
    ws.addRow([]);

    // By Member
    const byMember = memberCost.byMember || [];
    if (byMember.length > 0) {
      this.addTitleRow(ws, 'Cost by Member', 6);
      const memberHeaders = ['Member', 'Role', 'Hourly Rate', 'Est. Cost', 'Act. Cost', 'Efficiency'];
      const mHeaderRow = ws.addRow(memberHeaders);
      mHeaderRow.eachCell(cell => this.applyHeaderStyle(cell));

      for (const m of byMember) {
        const row = ws.addRow([
          m.memberName || m.name || '-',
          m.role || '-',
          m.hourlyRate || 0,
          m.totalEstimatedCost || 0,
          m.totalActualCost || 0,
          m.efficiencyRating || '-',
        ]);
        row.eachCell(cell => this.applyCellStyle(cell));
      }
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

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content: [
        // Title
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
              ['SPI', (schedule.spi || 0).toFixed(3), (schedule.spi || 0) >= 1 ? 'On/Ahead of schedule' : 'Behind schedule'],
              ['CPI', (schedule.cpi || 0).toFixed(3), (schedule.cpi || 0) >= 1 ? 'Under/On budget' : 'Over budget'],
              ['Planned Value (PV)', (schedule.plannedValue || 0).toFixed(2), ''],
              ['Earned Value (EV)', (schedule.earnedValue || 0).toFixed(2), ''],
              ['Actual Cost (AC)', (schedule.actualCost || 0).toFixed(2), ''],
              ['Delay Rate', `${(schedule.delayRate || 0).toFixed(1)}%`, ''],
              ['Delay (Man-Months)', (schedule.delayInManMonths || 0).toFixed(2), ''],
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
              ['BAC', (forecasting.bac || 0).toFixed(2), 'Total planned budget'],
              ['EAC', (forecasting.eac || 0).toFixed(2), 'Projected total cost'],
              ['VAC', (forecasting.vac || 0).toFixed(2), 'Budget variance'],
              ['TCPI', (forecasting.tcpi || 0).toFixed(3), 'Required efficiency'],
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

        // Productivity summary
        ...(snapshot.productivity ? [
          { text: 'Productivity', style: 'sectionHeader' },
          {
            table: {
              widths: ['*', 'auto'],
              body: [
                [{ text: 'Metric', style: 'tableHeader' }, { text: 'Value', style: 'tableHeader' }],
                ['Efficiency', `${((snapshot.productivity.summary?.efficiency || 0) * 100).toFixed(1)}%`],
                ['Completion Rate', `${((snapshot.productivity.summary?.completionRate || 0) * 100).toFixed(1)}%`],
                ['Effort Variance', `${((snapshot.productivity.summary?.variance || 0) * 100).toFixed(1)}%`],
              ],
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 15],
          },
        ] : []),

        // Member Cost summary
        ...(snapshot.memberCost ? [
          { text: 'Member Cost Analysis', style: 'sectionHeader' },
          {
            table: {
              widths: ['*', 'auto'],
              body: [
                [{ text: 'Metric', style: 'tableHeader' }, { text: 'Value', style: 'tableHeader' }],
                ['Total Estimated Cost', snapshot.memberCost.summary?.totalEstimatedCost || 0],
                ['Total Actual Cost', snapshot.memberCost.summary?.totalActualCost || 0],
                ['Cost Variance', snapshot.memberCost.summary?.costVariance || 0],
              ],
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 15],
          },
        ] : []),

        // Commentary
        ...(commentaries.length > 0 ? [
          { text: 'Commentaries', style: 'sectionHeader' },
          ...commentaries.map((c: any) => ({
            stack: [
              { text: `${c.type} (v${c.version})${c.author ? ' - ' + c.author : ''}`, style: 'commentaryHeader' },
              { text: c.content || '', margin: [0, 2, 0, 10] },
            ],
          })),
        ] : []),
      ],
      styles: {
        title: { fontSize: 18, bold: true, color: '#1565C0', margin: [0, 0, 0, 5] },
        subtitle: { fontSize: 11, color: '#666666', margin: [0, 0, 0, 3] },
        small: { fontSize: 9, color: '#999999' },
        sectionHeader: { fontSize: 14, bold: true, color: '#1565C0', margin: [0, 10, 0, 8] },
        tableHeader: { bold: true, fillColor: '#D9E1F2', fontSize: 10 },
        commentaryHeader: { bold: true, fontSize: 10, color: '#333333' },
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
