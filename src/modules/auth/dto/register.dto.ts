import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsOptional()
  userName?: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  password: string;

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