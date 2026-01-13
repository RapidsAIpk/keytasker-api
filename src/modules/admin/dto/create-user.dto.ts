import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  role: UserRole;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  country?: string;
}
