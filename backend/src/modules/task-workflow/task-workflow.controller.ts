import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { TaskWorkflowService } from './task-workflow.service';
import {
  CreateWorkflowStageDto,
  UpdateWorkflowStageDto,
  ReorderStagesDto,
  CreateWorkflowStepDto,
  UpdateWorkflowStepDto,
  ReorderStepsDto,
  BulkCreateStepsDto,
  ToggleTaskWorkflowDto,
  BulkToggleTaskWorkflowDto,
  UpdateTaskWorkflowNoteDto,
  InitializeProjectWorkflowDto,
  TaskWorkflowFilterDto,
  CreateStepScreenFunctionDto,
  UpdateStepScreenFunctionDto,
  BulkCreateStepScreenFunctionDto,
  BulkUpdateStepScreenFunctionDto,
  CreateStepScreenFunctionMemberDto,
  UpdateStepScreenFunctionMemberDto,
  BulkCreateStepScreenFunctionMemberDto,
  CreateMetricTypeDto,
  UpdateMetricTypeDto,
  CreateMetricCategoryDto,
  UpdateMetricCategoryDto,
  CreateTaskMemberMetricDto,
  UpdateTaskMemberMetricDto,
  BulkUpsertTaskMemberMetricDto,
  InitializeProjectMetricsDto,
} from './task-workflow.dto';
import * as ExcelJS from 'exceljs';

@Controller('task-workflow')
export class TaskWorkflowController {
  constructor(private readonly taskWorkflowService: TaskWorkflowService) {}

  // ===== Workflow Stage Endpoints =====

  @Get('stages/project/:projectId')
  getStages(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.taskWorkflowService.findAllStages(projectId);
  }

  @Get('stages/:id')
  getStage(@Param('id', ParseIntPipe) id: number) {
    return this.taskWorkflowService.findStageById(id);
  }

  @Post('stages')
  createStage(@Body() dto: CreateWorkflowStageDto) {
    return this.taskWorkflowService.createStage(dto);
  }

  @Put('stages/reorder')
  reorderStages(@Body() dto: ReorderStagesDto) {
    return this.taskWorkflowService.reorderStages(dto);
  }

  @Put('stages/:id')
  updateStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkflowStageDto,
  ) {
    return this.taskWorkflowService.updateStage(id, dto);
  }

  @Delete('stages/:id')
  deleteStage(@Param('id', ParseIntPipe) id: number) {
    return this.taskWorkflowService.deleteStage(id);
  }

  // ===== Workflow Step Endpoints =====

  @Get('steps/stage/:stageId')
  getSteps(@Param('stageId', ParseIntPipe) stageId: number) {
    return this.taskWorkflowService.findAllSteps(stageId);
  }

  @Get('steps/:id')
  getStep(@Param('id', ParseIntPipe) id: number) {
    return this.taskWorkflowService.findStepById(id);
  }

  @Post('steps')
  createStep(@Body() dto: CreateWorkflowStepDto) {
    return this.taskWorkflowService.createStep(dto);
  }

  @Post('steps/bulk')
  bulkCreateSteps(@Body() dto: BulkCreateStepsDto) {
    return this.taskWorkflowService.bulkCreateSteps(dto);
  }

  @Put('steps/reorder')
  reorderSteps(@Body() dto: ReorderStepsDto) {
    return this.taskWorkflowService.reorderSteps(dto);
  }

  @Put('steps/:id')
  updateStep(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkflowStepDto,
  ) {
    return this.taskWorkflowService.updateStep(id, dto);
  }

  @Delete('steps/:id')
  deleteStep(@Param('id', ParseIntPipe) id: number) {
    return this.taskWorkflowService.deleteStep(id);
  }

  // ===== Task Workflow Endpoints =====

  @Get('project/:projectId')
  getProjectWorkflow(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query('screenName') screenName?: string,
    @Query('stageId') stageId?: string,
    @Query('status') status?: 'all' | 'completed' | 'incomplete',
  ) {
    const filter: TaskWorkflowFilterDto = {
      screenName,
      stageId: stageId ? parseInt(stageId) : undefined,
      status,
    };
    return this.taskWorkflowService.getProjectWorkflow(projectId, filter);
  }

  @Post('toggle')
  toggleTaskWorkflow(@Body() dto: ToggleTaskWorkflowDto) {
    return this.taskWorkflowService.toggleTaskWorkflow(dto);
  }

  @Put('bulk-toggle')
  bulkToggleTaskWorkflow(@Body() dto: BulkToggleTaskWorkflowDto) {
    return this.taskWorkflowService.bulkToggleTaskWorkflow(dto);
  }

  @Put(':id/note')
  updateNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskWorkflowNoteDto,
  ) {
    return this.taskWorkflowService.updateTaskWorkflowNote(id, dto);
  }

  // ===== Initialize Workflow =====

  @Post('initialize')
  initializeProjectWorkflow(@Body() dto: InitializeProjectWorkflowDto) {
    return this.taskWorkflowService.initializeProjectWorkflow(dto);
  }

  // ===== Progress Endpoints =====

  @Get('progress/project/:projectId')
  getProjectProgress(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.taskWorkflowService.getProjectProgress(projectId);
  }

  @Get('progress/screen-function/:screenFunctionId')
  getScreenFunctionProgress(
    @Param('screenFunctionId', ParseIntPipe) screenFunctionId: number,
  ) {
    return this.taskWorkflowService.getScreenFunctionProgress(screenFunctionId);
  }

  // ===== Configuration Endpoint =====

  @Get('configuration/project/:projectId')
  getWorkflowConfiguration(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.taskWorkflowService.getWorkflowConfiguration(projectId);
  }

  // ===== Export Excel =====

  @Get('export/:projectId')
  async exportToExcel(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Res() res: Response,
  ) {
    const workflow = await this.taskWorkflowService.getProjectWorkflow(projectId);
    const { stages, screenFunctions, stepScreenFunctions } = workflow;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Task Workflow');

    // Build header row structure
    // Row 1: Stage names (merged across their steps)
    // Row 2: Step names
    // Row 3+: Screen functions with checkboxes

    // Calculate total columns: No + Screen + Note + Assignee + all steps + Release%
    const allSteps = stages.flatMap((s: any) => s.steps);
    const totalDataColumns = 4 + allSteps.length + 1; // No, Screen, Note, Assignee, steps..., Release%

    // Set column widths
    worksheet.getColumn(1).width = 5;  // No
    worksheet.getColumn(2).width = 25; // Screen
    worksheet.getColumn(3).width = 20; // Note
    worksheet.getColumn(4).width = 15; // Assignee
    for (let i = 0; i < allSteps.length; i++) {
      worksheet.getColumn(5 + i).width = 10;
    }
    worksheet.getColumn(5 + allSteps.length).width = 10; // Release%

    // Row 1: Stage headers
    const row1 = worksheet.getRow(1);
    row1.getCell(1).value = '';
    row1.getCell(2).value = '';
    row1.getCell(3).value = '';
    row1.getCell(4).value = '';

    let colIndex = 5;
    for (const stage of stages as any[]) {
      const startCol = colIndex;
      const endCol = colIndex + stage.steps.length - 1;

      if (stage.steps.length > 0) {
        // Set the stage name in the first cell
        row1.getCell(startCol).value = stage.name;

        // Merge cells for stage name
        if (stage.steps.length > 1) {
          worksheet.mergeCells(1, startCol, 1, endCol);
        }

        // Style the merged cell
        row1.getCell(startCol).alignment = { horizontal: 'center', vertical: 'middle' };
        row1.getCell(startCol).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
        row1.getCell(startCol).font = { bold: true };
        row1.getCell(startCol).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }

      colIndex = endCol + 1;
    }

    row1.getCell(5 + allSteps.length).value = '';

    // Row 2: Step headers
    const row2 = worksheet.getRow(2);
    row2.getCell(1).value = 'No';
    row2.getCell(2).value = 'Screen';
    row2.getCell(3).value = 'Note';
    row2.getCell(4).value = 'Assignee';

    colIndex = 5;
    for (const stage of stages as any[]) {
      for (const step of stage.steps) {
        row2.getCell(colIndex).value = step.name;
        row2.getCell(colIndex).alignment = { horizontal: 'center', vertical: 'middle' };
        row2.getCell(colIndex).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' },
        };
        row2.getCell(colIndex).font = { bold: true, size: 9 };
        row2.getCell(colIndex).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        colIndex++;
      }
    }

    row2.getCell(5 + allSteps.length).value = 'Release';
    row2.getCell(5 + allSteps.length).alignment = { horizontal: 'center' };
    row2.getCell(5 + allSteps.length).font = { bold: true };

    // Style header row 2
    for (let i = 1; i <= 4; i++) {
      row2.getCell(i).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
      row2.getCell(i).font = { bold: true };
      row2.getCell(i).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }

    // Data rows (Screen functions)
    let rowIndex = 3;
    for (let sfIndex = 0; sfIndex < screenFunctions.length; sfIndex++) {
      const sf = screenFunctions[sfIndex] as any;
      const row = worksheet.getRow(rowIndex);

      row.getCell(1).value = sfIndex + 1; // No
      row.getCell(2).value = sf.name; // Screen
      row.getCell(3).value = sf.description || ''; // Note
      row.getCell(4).value = ''; // Assignee (can be enhanced later)

      // Step status cells - using StepScreenFunction status
      colIndex = 5;
      let completedCount = 0;
      let linkedCount = 0;
      for (const stage of stages as any[]) {
        for (const step of stage.steps) {
          const ssf = stepScreenFunctions.find(
            (s: any) => s.screenFunctionId === sf.id && s.stepId === step.id
          );
          const status = ssf?.status || null;

          // Count for release percentage (only count linked items)
          if (status !== null) {
            linkedCount++;
            if (status === 'Completed') completedCount++;
          }

          // Display symbol based on status
          let displayValue = '-'; // Not linked
          let bgColor = 'FFFFFFFF'; // White (default)

          if (status === 'Completed') {
            displayValue = '✓';
            bgColor = 'FF90EE90'; // Light green
          } else if (status === 'In Progress') {
            displayValue = '☐';
            bgColor = 'FFFFF9C4'; // Light yellow
          } else if (status === 'Not Started') {
            displayValue = '☐';
            bgColor = 'FFFFFFFF'; // White
          } else if (status === 'Skipped') {
            displayValue = '○';
            bgColor = 'FFE0E0E0'; // Light gray
          }

          row.getCell(colIndex).value = displayValue;
          row.getCell(colIndex).alignment = { horizontal: 'center', vertical: 'middle' };
          row.getCell(colIndex).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };

          if (status !== null) {
            row.getCell(colIndex).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: bgColor },
            };
          }

          colIndex++;
        }
      }

      // Release percentage - based on linked items only
      const releasePercentage = linkedCount > 0
        ? Math.round((completedCount / linkedCount) * 100)
        : 0;
      row.getCell(5 + allSteps.length).value = `${releasePercentage}%`;
      row.getCell(5 + allSteps.length).alignment = { horizontal: 'center' };

      // Style the first 4 columns
      for (let i = 1; i <= 4; i++) {
        row.getCell(i).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }

      rowIndex++;
    }

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=task-workflow-${projectId}-${Date.now()}.xlsx`,
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  }

  // ===== Step Screen Function Endpoints =====

  @Get('step-screen-functions/step/:stepId')
  getStepScreenFunctions(@Param('stepId', ParseIntPipe) stepId: number) {
    return this.taskWorkflowService.findAllStepScreenFunctions(stepId);
  }

  @Get('step-screen-functions/:id')
  getStepScreenFunction(@Param('id', ParseIntPipe) id: number) {
    return this.taskWorkflowService.findStepScreenFunctionById(id);
  }

  @Post('step-screen-functions')
  createStepScreenFunction(@Body() dto: CreateStepScreenFunctionDto) {
    return this.taskWorkflowService.createStepScreenFunction(dto);
  }

  @Post('step-screen-functions/bulk')
  bulkCreateStepScreenFunctions(@Body() dto: BulkCreateStepScreenFunctionDto) {
    return this.taskWorkflowService.bulkCreateStepScreenFunctions(dto);
  }

  @Put('step-screen-functions/bulk')
  bulkUpdateStepScreenFunctions(@Body() dto: BulkUpdateStepScreenFunctionDto) {
    return this.taskWorkflowService.bulkUpdateStepScreenFunctions(dto);
  }

  @Put('step-screen-functions/:id')
  updateStepScreenFunction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStepScreenFunctionDto,
  ) {
    return this.taskWorkflowService.updateStepScreenFunction(id, dto);
  }

  @Delete('step-screen-functions/:id')
  deleteStepScreenFunction(@Param('id', ParseIntPipe) id: number) {
    return this.taskWorkflowService.deleteStepScreenFunction(id);
  }

  // ===== Stage Detail Endpoints =====

  @Get('stages/:id/detail')
  getStageDetail(@Param('id', ParseIntPipe) id: number) {
    return this.taskWorkflowService.getStageDetail(id);
  }

  @Get('stages/overview/project/:projectId')
  getStagesOverview(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.taskWorkflowService.getStagesOverview(projectId);
  }

  @Get('steps/:stepId/available-screen-functions')
  getAvailableScreenFunctionsForStep(@Param('stepId', ParseIntPipe) stepId: number) {
    return this.taskWorkflowService.getAvailableScreenFunctionsForStep(stepId);
  }

  // ===== Step Screen Function Member Endpoints =====

  @Get('step-screen-function-members/ssf/:stepScreenFunctionId')
  getStepScreenFunctionMembers(
    @Param('stepScreenFunctionId', ParseIntPipe) stepScreenFunctionId: number,
  ) {
    return this.taskWorkflowService.findAllStepScreenFunctionMembers(stepScreenFunctionId);
  }

  @Get('step-screen-function-members/:id')
  getStepScreenFunctionMember(@Param('id', ParseIntPipe) id: number) {
    return this.taskWorkflowService.findStepScreenFunctionMemberById(id);
  }

  @Post('step-screen-function-members')
  createStepScreenFunctionMember(@Body() dto: CreateStepScreenFunctionMemberDto) {
    return this.taskWorkflowService.createStepScreenFunctionMember(dto);
  }

  @Post('step-screen-function-members/bulk')
  bulkCreateStepScreenFunctionMembers(@Body() dto: BulkCreateStepScreenFunctionMemberDto) {
    return this.taskWorkflowService.bulkCreateStepScreenFunctionMembers(dto);
  }

  @Put('step-screen-function-members/:id')
  updateStepScreenFunctionMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStepScreenFunctionMemberDto,
  ) {
    return this.taskWorkflowService.updateStepScreenFunctionMember(id, dto);
  }

  @Delete('step-screen-function-members/:id')
  deleteStepScreenFunctionMember(@Param('id', ParseIntPipe) id: number) {
    return this.taskWorkflowService.deleteStepScreenFunctionMember(id);
  }

  // ===== Metric Type Endpoints =====

  @Get('metric-types/project/:projectId')
  getMetricTypes(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.taskWorkflowService.findAllMetricTypes(projectId);
  }

  @Get('metrics/project/:projectId')
  getProjectMetricInsights(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.taskWorkflowService.getProjectMetricInsights(projectId);
  }

  @Get('metric-types/:id')
  getMetricType(@Param('id', ParseIntPipe) id: number) {
    return this.taskWorkflowService.findMetricTypeById(id);
  }

  @Post('metric-types')
  createMetricType(@Body() dto: CreateMetricTypeDto) {
    return this.taskWorkflowService.createMetricType(dto);
  }

  @Put('metric-types/:id')
  updateMetricType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMetricTypeDto,
  ) {
    return this.taskWorkflowService.updateMetricType(id, dto);
  }

  @Delete('metric-types/:id')
  deleteMetricType(@Param('id', ParseIntPipe) id: number) {
    return this.taskWorkflowService.deleteMetricType(id);
  }

  @Post('metric-types/initialize')
  initializeProjectMetrics(@Body() dto: InitializeProjectMetricsDto) {
    return this.taskWorkflowService.initializeProjectMetrics(dto);
  }

  // ===== Metric Category Endpoints =====

  @Get('metric-categories/type/:metricTypeId')
  getMetricCategories(@Param('metricTypeId', ParseIntPipe) metricTypeId: number) {
    return this.taskWorkflowService.findAllMetricCategories(metricTypeId);
  }

  @Get('metric-categories/:id')
  getMetricCategory(@Param('id', ParseIntPipe) id: number) {
    return this.taskWorkflowService.findMetricCategoryById(id);
  }

  @Post('metric-categories')
  createMetricCategory(@Body() dto: CreateMetricCategoryDto) {
    return this.taskWorkflowService.createMetricCategory(dto);
  }

  @Put('metric-categories/:id')
  updateMetricCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMetricCategoryDto,
  ) {
    return this.taskWorkflowService.updateMetricCategory(id, dto);
  }

  @Delete('metric-categories/:id')
  deleteMetricCategory(@Param('id', ParseIntPipe) id: number) {
    return this.taskWorkflowService.deleteMetricCategory(id);
  }

  // ===== Task Member Metric Endpoints =====

  @Get('task-member-metrics/member/:stepScreenFunctionMemberId')
  getTaskMemberMetrics(
    @Param('stepScreenFunctionMemberId', ParseIntPipe) stepScreenFunctionMemberId: number,
  ) {
    return this.taskWorkflowService.findAllTaskMemberMetrics(stepScreenFunctionMemberId);
  }

  @Get('task-member-metrics/:id')
  getTaskMemberMetric(@Param('id', ParseIntPipe) id: number) {
    return this.taskWorkflowService.findTaskMemberMetricById(id);
  }

  @Post('task-member-metrics')
  createTaskMemberMetric(@Body() dto: CreateTaskMemberMetricDto) {
    return this.taskWorkflowService.createTaskMemberMetric(dto);
  }

  @Put('task-member-metrics/:id')
  updateTaskMemberMetric(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskMemberMetricDto,
  ) {
    return this.taskWorkflowService.updateTaskMemberMetric(id, dto);
  }

  @Delete('task-member-metrics/:id')
  deleteTaskMemberMetric(@Param('id', ParseIntPipe) id: number) {
    return this.taskWorkflowService.deleteTaskMemberMetric(id);
  }

  @Post('task-member-metrics/bulk-upsert')
  bulkUpsertTaskMemberMetrics(@Body() dto: BulkUpsertTaskMemberMetricDto) {
    return this.taskWorkflowService.bulkUpsertTaskMemberMetrics(dto);
  }
}
