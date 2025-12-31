import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  token: string;

  @ApiProperty()
  newPassword: string;
}
