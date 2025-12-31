// SaveDeviceInfoDto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SaveDeviceInfoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ipAddress: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  deviceInfo: string;
}
