import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEmail, IsNotEmpty } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsOptional()
  fullName?: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  profilePicture?: string;

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