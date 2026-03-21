import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { PaginationQueryDto, AdminTaskQueryDto } from './dto/admin-query.dto';
import { AdminUpdateUserDto } from './dto/update-user.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users (paginated)' })
  getUsers(@Query() query: PaginationQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user detail' })
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user (name, email, role)' })
  updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Get('workspaces')
  @ApiOperation({ summary: 'List all workspaces (paginated)' })
  getWorkspaces(@Query() query: PaginationQueryDto) {
    return this.adminService.getWorkspaces(query);
  }

  @Get('workspaces/:id')
  @ApiOperation({ summary: 'Get workspace detail' })
  getWorkspaceDetail(@Param('id') id: string) {
    return this.adminService.getWorkspaceDetail(id);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'List all tasks (paginated, filterable)' })
  getTasks(@Query() query: AdminTaskQueryDto) {
    return this.adminService.getTasks(query);
  }

  @Get('activities')
  @ApiOperation({ summary: 'List recent activities (paginated)' })
  getActivities(@Query() query: PaginationQueryDto) {
    return this.adminService.getActivities(query);
  }
}
