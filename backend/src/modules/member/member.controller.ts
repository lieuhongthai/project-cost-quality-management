import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MemberService } from './member.service';
import { CreateMemberDto, UpdateMemberDto } from './member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  findAll() {
    return this.memberService.findAll();
  }

  @Get('linkable-users')
  getUsersWithMemberPermission() {
    return this.memberService.getUsersWithMemberPermission();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-projects')
  getMyProjects(@Req() req: any) {
    return this.memberService.getProjectsForUser(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-todo')
  getMyTodoList(@Req() req: any) {
    return this.memberService.getTodoListForUser(req.user.sub);
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.memberService.findByProject(projectId);
  }

  @Get('project/:projectId/with-user')
  findByProjectWithUser(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.memberService.findByProjectWithUser(projectId);
  }

  @Get('project/:projectId/active')
  findActiveByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.memberService.findActiveByProject(projectId);
  }

  @Get('project/:projectId/summary')
  getProjectSummary(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.memberService.getProjectSummary(projectId);
  }

  @Get('project/:projectId/workload')
  getProjectWorkload(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.memberService.getProjectWorkload(projectId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.memberService.findOne(id);
  }

  @Get(':id/workload')
  getMemberWorkload(@Param('id', ParseIntPipe) id: number) {
    return this.memberService.getMemberWorkload(id);
  }

  @Post()
  create(@Body() createDto: CreateMemberDto) {
    return this.memberService.create(createDto);
  }

  @Post('copy')
  copyMembers(
    @Body()
    copyDto: {
      sourceProjectId: number;
      targetProjectId: number;
      memberIds: number[];
    },
  ) {
    return this.memberService.copyMembersFromProject(
      copyDto.sourceProjectId,
      copyDto.targetProjectId,
      copyDto.memberIds,
    );
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMemberDto,
  ) {
    return this.memberService.update(id, updateDto);
  }

  @Put(':id/link-user')
  linkToUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { userId: number | null },
  ) {
    return this.memberService.linkToUser(id, body.userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.memberService.remove(id);
  }
}
