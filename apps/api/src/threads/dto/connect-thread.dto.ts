import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectThreadDto {
  @ApiPropertyOptional({ description: 'User ID to connect the thread to (single user)' })
  @IsOptional()
  @IsString()
  toUserId?: string;

  @ApiPropertyOptional({ description: 'Array of user IDs to connect the thread to (multi-user parallel connect)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toUserIds?: string[];

  @ApiPropertyOptional({ description: 'Optional message for the recipient' })
  @IsOptional()
  @IsString()
  message?: string;
}
