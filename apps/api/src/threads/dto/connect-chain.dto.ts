import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConnectChainDto {
  @ApiProperty({
    description: 'Ordered list of user IDs to chain-connect through',
    example: ['user-id-1', 'user-id-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(19) // max chain depth 20, minus the creator
  userIds: string[];
}
