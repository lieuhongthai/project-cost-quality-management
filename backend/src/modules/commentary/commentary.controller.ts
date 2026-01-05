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
import { CommentaryService } from './commentary.service';
import { CreateCommentaryDto, UpdateCommentaryDto, GenerateCommentaryDto } from './commentary.dto';

@Controller('commentaries')
export class CommentaryController {
  constructor(private readonly commentaryService: CommentaryService) {}

  @Get()
  findAll() {
    return this.commentaryService.findAll();
  }

  @Get('report/:reportId')
  findByReport(@Param('reportId', ParseIntPipe) reportId: number) {
    return this.commentaryService.findByReport(reportId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.commentaryService.findOne(id);
  }

  @Post()
  create(@Body() createCommentaryDto: CreateCommentaryDto) {
    return this.commentaryService.create(createCommentaryDto);
  }

  @Post('generate')
  generateAICommentary(@Body() generateCommentaryDto: GenerateCommentaryDto) {
    return this.commentaryService.generateAICommentary(generateCommentaryDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCommentaryDto: UpdateCommentaryDto,
  ) {
    return this.commentaryService.update(id, updateCommentaryDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.commentaryService.remove(id);
  }
}
