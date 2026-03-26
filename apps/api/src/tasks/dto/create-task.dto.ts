import { IsString, IsOptional, IsEnum, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({ example: 'Review design mockups' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['URGENT', 'HIGH', 'MEDIUM', 'LOW'] })
  @IsOptional()
  @IsEnum(['URGENT', 'HIGH', 'MEDIUM', 'LOW'])
  priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Team ID to assign this task to' })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Task Group ID to assign this task to' })
  @IsOptional()
  @IsString()
  taskGroupId?: string;

  @ApiPropertyOptional({ enum: ['STANDARD', 'VOTE'] })
  @IsOptional()
  @IsEnum(['STANDARD', 'VOTE'])
  type?: 'STANDARD' | 'VOTE';

  @ApiPropertyOptional({ description: 'Vote configuration JSON' })
  @IsOptional()
  voteConfig?: Prisma.InputJsonValue;

  @ApiPropertyOptional({ description: 'Co-creator user IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coCreatorIds?: string[];
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'])
  status?: 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';

  @IsOptional()
  @IsEnum(['URGENT', 'HIGH', 'MEDIUM', 'LOW'])
  priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  taskGroupId?: string;
}

export class ReorderTasksDto {
  @ApiProperty({ description: 'Task IDs in desired order' })
  @IsArray()
  @IsString({ each: true })
  taskIds: string[];
}

export class BatchMoveTasksDto {
  @ApiProperty({ description: 'Task IDs to move' })
  @IsArray()
  @IsString({ each: true })
  taskIds: string[];

  @ApiPropertyOptional({ description: 'Target workspace ID' })
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiPropertyOptional({ description: 'Target task group ID (null to remove from group)' })
  @IsOptional()
  @IsString()
  taskGroupId?: string;
}
