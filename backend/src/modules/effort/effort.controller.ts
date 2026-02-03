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
import { EffortService } from './effort.service';
import { CreateEffortDto, UpdateEffortDto, BulkEffortDto } from './effort.dto';

@Controller('efforts')
export class EffortController {
  constructor(private readonly effortService: EffortService) {}

  @Get()
  findAll() {
    return this.effortService.findAll();
  }

  @Get('stage/:stageId')
  findByStage(@Param('stageId', ParseIntPipe) stageId: number) {
    return this.effortService.findByStage(stageId);
  }

  @Get('stage/:stageId/week')
  findByWeek(
    @Param('stageId', ParseIntPipe) stageId: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('weekNumber', ParseIntPipe) weekNumber: number,
  ) {
    return this.effortService.findByWeek(stageId, year, weekNumber);
  }

  @Get('stage/:stageId/summary')
  getStageEffortSummary(@Param('stageId', ParseIntPipe) stageId: number) {
    return this.effortService.getStageEffortSummary(stageId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.effortService.findOne(id);
  }

  @Post()
  create(@Body() createEffortDto: CreateEffortDto) {
    return this.effortService.create(createEffortDto);
  }

  @Post('bulk')
  bulkCreate(@Body() bulkEffortDto: BulkEffortDto) {
    return this.effortService.bulkCreate(bulkEffortDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEffortDto: UpdateEffortDto,
  ) {
    return this.effortService.update(id, updateEffortDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.effortService.remove(id);
  }
}
