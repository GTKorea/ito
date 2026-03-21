import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}
