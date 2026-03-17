import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectThreadDto {
  @ApiProperty({ description: 'User ID to connect the thread to' })
  @IsString()
  toUserId: string;

  @ApiPropertyOptional({ description: 'Optional message for the recipient' })
  @IsOptional()
  @IsString()
  message?: string;
}
