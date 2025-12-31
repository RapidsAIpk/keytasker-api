import { ApiProperty } from '@nestjs/swagger';

export class CreateMediaDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
  })
  file?: any;
}
