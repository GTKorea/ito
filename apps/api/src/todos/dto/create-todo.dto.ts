import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTodoDto {
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
}

export class UpdateTodoDto {
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
}
