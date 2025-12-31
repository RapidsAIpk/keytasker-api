import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEmail, IsNotEmpty } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsOptional()
  firstName?: string;

  @ApiProperty()
  @IsOptional()
  lastName?: string;

  @ApiProperty()
  @IsOptional()
  userName?: string;

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