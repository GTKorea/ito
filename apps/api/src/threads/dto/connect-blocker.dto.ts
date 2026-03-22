import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConnectBlockerDto {
  @ApiProperty({ description: 'Description of the external blocker/dependency' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  blockerNote: string;
}
