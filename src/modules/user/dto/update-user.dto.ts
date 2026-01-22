import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEmail, IsNotEmpty } from 'class-validator';

export class UpdateUserDto {

  @ApiProperty()
  @IsOptional()
  fullName?: string;

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