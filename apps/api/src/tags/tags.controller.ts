import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto } from './dto/create-tag.dto';

@ApiTags('tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TagsController {
  constructor(private tagsService: TagsService) {}

  @Post('task-groups/:groupId/tags')
  @ApiOperation({ summary: 'Create a tag in a group' })
  create(
    @Param('groupId') groupId: string,
    @Body() dto: CreateTagDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tagsService.createTag(groupId, dto, userId);
  }

  @Get('task-groups/:groupId/tags')
  @ApiOperation({ summary: 'List tags in a group' })
  findAll(@Param('groupId') groupId: string) {
    return this.tagsService.findAllByGroup(groupId);
  }

  @Patch('tags/:id')
  @ApiOperation({ summary: 'Update a tag' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tagsService.updateTag(id, dto, userId);
  }

  @Delete('tags/:id')
  @ApiOperation({ summary: 'Delete a tag' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.tagsService.deleteTag(id, userId);
  }

  @Post('tasks/:taskId/tags')
  @ApiOperation({ summary: 'Add tag to task' })
  addToTask(
    @Param('taskId') taskId: string,
    @Body('tagId') tagId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tagsService.addTagToTask(taskId, tagId, userId);
  }

  @Delete('tasks/:taskId/tags/:tagId')
  @ApiOperation({ summary: 'Remove tag from task' })
  removeFromTask(
    @Param('taskId') taskId: string,
    @Param('tagId') tagId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tagsService.removeTagFromTask(taskId, tagId, userId);
  }
}
