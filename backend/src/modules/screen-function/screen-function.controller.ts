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

  @Get('project/:projectId/summary')
  getProjectSummary(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.screenFunctionService.getProjectSummary(projectId);
  }

  @Get('project/:projectId/default-members')
  getDefaultMembersByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.screenFunctionService.getDefaultMembersByProject(projectId);
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.screenFunctionService.findByProject(projectId);
  }

  @Get(':id/default-members')
  getDefaultMembers(@Param('id', ParseIntPipe) id: number) {
    return this.screenFunctionService.getDefaultMembers(id);
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

  @Put(':id/default-members')
  setDefaultMembers(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { memberIds: number[] },
  ) {
    return this.screenFunctionService.setDefaultMembers(id, body.memberIds);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateScreenFunctionDto,
  ) {
    return this.screenFunctionService.update(id, updateDto);
  }

  @Post(':id/default-members')
  addDefaultMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { memberId: number },
  ) {
    return this.screenFunctionService.addDefaultMember(id, body.memberId);
  }

  @Delete(':id/default-members/:memberId')
  removeDefaultMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
  ) {
    return this.screenFunctionService.removeDefaultMember(id, memberId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.screenFunctionService.remove(id);
  }
}
