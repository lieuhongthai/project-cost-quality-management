import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PhaseService } from './phase.service';
import { CreatePhaseDto, UpdatePhaseDto, ReorderPhasesDto } from './phase.dto';

@Controller('phases')
export class PhaseController {
  constructor(private readonly phaseService: PhaseService) {}

  @Get()
  findAll() {
    return this.phaseService.findAll();
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.phaseService.findByProject(projectId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.phaseService.findOne(id);
  }

  @Post()
  create(@Body() createPhaseDto: CreatePhaseDto) {
    return this.phaseService.create(createPhaseDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePhaseDto: UpdatePhaseDto,
  ) {
    return this.phaseService.update(id, updatePhaseDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.phaseService.remove(id);
  }

  @Put('reorder')
  @UsePipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false
  }))
  reorder(@Body() reorderDto: ReorderPhasesDto) {
    return this.phaseService.reorderPhases(reorderDto);
  }
}
