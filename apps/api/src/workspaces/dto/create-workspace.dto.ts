import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'My Team' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'my-team' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;
}

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({ example: 'My Team' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'A workspace for design collaboration' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: 'Seoul, South Korea' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  @IsOptional()
  @IsString()
  industry?: string;
}

export class DeleteWorkspaceDto {
  @ApiProperty({ description: 'Workspace name for confirmation' })
  @IsString()
  confirmName: string;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsString()
  email: string;

  @ApiPropertyOptional({ enum: [WorkspaceRole.MEMBER, WorkspaceRole.GUEST], default: WorkspaceRole.MEMBER })
  @IsOptional()
  @IsEnum(WorkspaceRole)
  role?: WorkspaceRole;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ['OWNER', 'ADMIN', 'MEMBER', 'GUEST'] })
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}
