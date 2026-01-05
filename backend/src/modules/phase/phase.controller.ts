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
import { PhaseService } from './phase.service';
import { CreatePhaseDto, UpdatePhaseDto } from './phase.dto';

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
}
