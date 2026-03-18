import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CalendarSyncDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  syncEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  calendarId?: string;
}
