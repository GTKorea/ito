import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { FilesService } from '../files/files.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private filesService: FilesService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(
    @CurrentUser('id') userId: string,
    @Body() data: { name?: string; avatarUrl?: string },
  ) {
    return this.usersService.updateProfile(userId, data);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Upload profile avatar' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar', { storage: undefined }))
  uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.filesService.uploadAvatar(file, userId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by email within workspace' })
  search(
    @Query('email') email: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.usersService.searchByEmail(email, workspaceId);
  }
}
