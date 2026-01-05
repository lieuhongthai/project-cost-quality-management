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
import { TestingService } from './testing.service';
import { CreateTestingDto, UpdateTestingDto } from './testing.dto';

@Controller('testing')
export class TestingController {
  constructor(private readonly testingService: TestingService) {}

  @Get()
  findAll() {
    return this.testingService.findAll();
  }

  @Get('phase/:phaseId')
  findByPhase(@Param('phaseId', ParseIntPipe) phaseId: number) {
    return this.testingService.findByPhase(phaseId);
  }

  @Get('phase/:phaseId/summary')
  getPhaseTestingSummary(@Param('phaseId', ParseIntPipe) phaseId: number) {
    return this.testingService.getPhaseTestingSummary(phaseId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.testingService.findOne(id);
  }

  @Post()
  create(@Body() createTestingDto: CreateTestingDto) {
    return this.testingService.create(createTestingDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTestingDto: UpdateTestingDto,
  ) {
    return this.testingService.update(id, updateTestingDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.testingService.remove(id);
  }
}
