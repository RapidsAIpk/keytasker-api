import { SortEnum } from '@config/constants';
import { ApiProperty } from '@nestjs/swagger';

export class SortDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  sort: SortEnum;
}
