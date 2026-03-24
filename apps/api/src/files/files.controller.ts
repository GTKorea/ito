import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import { join } from 'path';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FilesService } from './files.service';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Body('taskId') taskId?: string,
    @Body('threadLinkId') threadLinkId?: string,
  ) {
    return this.filesService.upload(file, userId, taskId, threadLinkId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file metadata' })
  findOne(@Param('id') id: string) {
    return this.filesService.findById(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a file' })
  async download(@Param('id') id: string, @Res() res: Response) {
    const file = await this.filesService.findById(id);
    const filepath = join(process.cwd(), file.url);
    const encodedFilename = encodeURIComponent(file.filename);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
    );
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.sendFile(filepath);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get files for a task' })
  findByTask(@Param('taskId') taskId: string) {
    return this.filesService.findByTask(taskId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.filesService.delete(id, userId);
  }
}
