import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportService } from './report.service';
import { ReportExportService } from './report-export.service';
import { CreateReportDto, UpdateReportDto } from './report.dto';

@Controller('reports')
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly reportExportService: ReportExportService,
  ) {}

  @Get()
  findAll() {
    return this.reportService.findAll();
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.reportService.findByProject(projectId);
  }

  @Get('project/:projectId/scope/:scope')
  findByScope(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('scope') scope: string,
  ) {
    return this.reportService.findByScope(projectId, scope);
  }

  // ===== Export Endpoints =====

  @Get(':id/export/excel')
  async exportExcel(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const workbook = await this.reportExportService.generateExcel(id);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=report-${id}-${Date.now()}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  }

  @Get(':id/export/pdf')
  async exportPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportExportService.generatePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=report-${id}-${Date.now()}.pdf`,
    );
    res.send(pdfBuffer);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reportService.findOne(id);
  }

  @Post()
  create(@Body() createReportDto: CreateReportDto) {
    return this.reportService.create(createReportDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    return this.reportService.update(id, updateReportDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reportService.remove(id);
  }
}
