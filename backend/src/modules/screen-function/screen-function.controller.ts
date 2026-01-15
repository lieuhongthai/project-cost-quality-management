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
import { ScreenFunctionService } from './screen-function.service';
import { CreateScreenFunctionDto, UpdateScreenFunctionDto, ReorderScreenFunctionDto } from './screen-function.dto';

@Controller('screen-functions')
export class ScreenFunctionController {
  constructor(private readonly screenFunctionService: ScreenFunctionService) {}

  @Get()
  findAll() {
    return this.screenFunctionService.findAll();
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.screenFunctionService.findByProject(projectId);
  }

  @Get('project/:projectId/summary')
  getProjectSummary(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.screenFunctionService.getProjectSummary(projectId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.screenFunctionService.findOne(id);
  }

  @Post()
  create(@Body() createDto: CreateScreenFunctionDto) {
    return this.screenFunctionService.create(createDto);
  }

  @Put('reorder')
  reorder(@Body() reorderDto: ReorderScreenFunctionDto) {
    return this.screenFunctionService.reorder(reorderDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateScreenFunctionDto,
  ) {
    return this.screenFunctionService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.screenFunctionService.remove(id);
  }
}
