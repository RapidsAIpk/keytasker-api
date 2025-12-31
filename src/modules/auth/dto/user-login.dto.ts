import { ApiProperty } from '@nestjs/swagger';

export class UserLoginDto {
  @ApiProperty()
  userId: number;

  @ApiProperty()
  ipAddress: string;

  @ApiProperty()
  deviceInfo: any;

  @ApiProperty()
  loginTime: Date;
}
