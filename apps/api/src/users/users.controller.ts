import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { FilesService } from '../files/files.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
    @Body() data: UpdateProfileDto,
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
  @ApiOperation({ summary: 'Search workspace members by name or email' })
  search(
    @Query('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Query('query') query?: string,
  ) {
    return this.usersService.searchMembers(workspaceId, userId, query);
  }

  @Get('me/preferences')
  @ApiOperation({ summary: 'Get all user preferences for current workspace' })
  getPreferences(
    @CurrentUser('id') userId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    return this.usersService.getPreferences(userId, workspaceId);
  }

  @Put('me/preferences/:key')
  @ApiOperation({ summary: 'Set a user preference' })
  setPreference(
    @CurrentUser('id') userId: string,
    @Headers('x-workspace-id') workspaceId: string,
    @Param('key') key: string,
    @Body('value') value: unknown,
  ) {
    return this.usersService.setPreference(userId, workspaceId, key, value);
  }

  @Delete('me/preferences/:key')
  @ApiOperation({ summary: 'Delete a user preference' })
  deletePreference(
    @CurrentUser('id') userId: string,
    @Headers('x-workspace-id') workspaceId: string,
    @Param('key') key: string,
  ) {
    return this.usersService.deletePreference(userId, workspaceId, key);
  }

  @Get(':id/profile')
  @ApiOperation({ summary: 'Get public user profile (must share a workspace)' })
  getPublicProfile(
    @Param('id') userId: string,
    @CurrentUser('id') requestingUserId: string,
  ) {
    return this.usersService.findPublicProfile(userId, requestingUserId);
  }
}
