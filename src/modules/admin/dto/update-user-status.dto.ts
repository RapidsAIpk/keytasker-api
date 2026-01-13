import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';

export class UpdateUserStatusDto {
 
  @ApiProperty({
    enum: AccountStatus,
  })
  accountStatus: AccountStatus;

  @ApiProperty({
    example: '6597b7ef01d3f9f2267c6961',
  })
  id: string
}