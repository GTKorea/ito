import { IsOptional, IsString, IsEmail, IsIn } from 'class-validator';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(['USER', 'ADMIN'])
  role?: 'USER' | 'ADMIN';

  @IsOptional()
  @IsIn(['active', 'banned'])
  status?: 'active' | 'banned';
}
