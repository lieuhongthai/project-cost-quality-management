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
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto, UpdateProjectDto, CreateProjectSettingsDto, UpdateProjectSettingsDto } from './project.dto';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  findAll() {
    return this.projectService.findAll();
  }

  // Calculate end date based on start date and estimated effort
  @Post('calculate-end-date')
  calculateEndDate(
    @Body()
    body: {
      startDate: string;
      estimatedEffortDays: number;
      projectId?: number;
      nonWorkingDays?: number[];
      holidays?: string[];
    },
  ) {
    return this.projectService.calculateEndDate(body);
  }

  // Project Settings endpoints - MUST be before :id routes
  @Post('settings')
  createSettings(@Body() createSettingsDto: CreateProjectSettingsDto) {
    return this.projectService.createSettings(createSettingsDto);
  }

  @Get(':id/settings')
  getSettings(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.getSettings(id);
  }

  @Put(':id/settings')
  updateSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSettingsDto: UpdateProjectSettingsDto,
  ) {
    return this.projectService.updateSettings(id, updateSettingsDto);
  }

  // Generic :id routes - MUST be after specific routes
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.findOne(id);
  }

  @Post()
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectService.create(createProjectDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectService.update(id, updateProjectDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.remove(id);
  }
}
