import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { PhaseScreenFunctionService } from './phase-screen-function.service';
import {
  CreatePhaseScreenFunctionDto,
  UpdatePhaseScreenFunctionDto,
  BulkCreatePhaseScreenFunctionDto,
  BulkUpdatePhaseScreenFunctionDto,
} from './phase-screen-function.dto';

@Controller('phase-screen-functions')
export class PhaseScreenFunctionController {
  constructor(private readonly phaseScreenFunctionService: PhaseScreenFunctionService) {}

  @Get()
  findAll() {
    return this.phaseScreenFunctionService.findAll();
  }

  @Get('phase/:phaseId')
  findByPhase(@Param('phaseId', ParseIntPipe) phaseId: number) {
    return this.phaseScreenFunctionService.findByPhase(phaseId);
  }

  @Get('phase/:phaseId/summary')
  getPhaseSummary(@Param('phaseId', ParseIntPipe) phaseId: number) {
    return this.phaseScreenFunctionService.getPhaseSummary(phaseId);
  }

  @Get('screen-function/:screenFunctionId')
  findByScreenFunction(@Param('screenFunctionId', ParseIntPipe) screenFunctionId: number) {
    return this.phaseScreenFunctionService.findByScreenFunction(screenFunctionId);
  }

  @Get('project/:projectId/with-phases')
  getProjectScreenFunctionsWithPhases(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.phaseScreenFunctionService.getProjectScreenFunctionsWithPhases(projectId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.phaseScreenFunctionService.findOne(id);
  }

  @Post()
  create(@Body() createDto: CreatePhaseScreenFunctionDto) {
    return this.phaseScreenFunctionService.create(createDto);
  }

  @Post('bulk')
  bulkCreate(@Body() bulkDto: BulkCreatePhaseScreenFunctionDto) {
    return this.phaseScreenFunctionService.bulkCreate(bulkDto);
  }

  @Put('bulk')
  bulkUpdate(@Body() bulkDto: BulkUpdatePhaseScreenFunctionDto) {
    return this.phaseScreenFunctionService.bulkUpdate(bulkDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePhaseScreenFunctionDto,
  ) {
    return this.phaseScreenFunctionService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.phaseScreenFunctionService.remove(id);
  }
}
