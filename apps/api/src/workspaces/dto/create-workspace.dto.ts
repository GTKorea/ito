import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

export class InviteMemberDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsString()
  email: string;
}
