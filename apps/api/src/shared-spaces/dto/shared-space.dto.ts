import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSharedSpaceDto {
  @ApiProperty({ example: 'Project Alpha Collaboration' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'Shared space for design agency + dev team' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSharedSpaceDto {
  @ApiPropertyOptional({ example: 'Updated Space Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class InviteWorkspaceDto {
  @ApiProperty({ example: 'design-agency', description: 'Workspace slug to invite' })
  @IsString()
  workspaceSlug: string;
}

export class CreateSharedSpaceTaskDto {
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
