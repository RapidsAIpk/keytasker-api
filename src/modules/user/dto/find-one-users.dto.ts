import { SortDto } from '@modules/shared/dto/sort.dto';
import { ApiProperty } from '@nestjs/swagger';

export class FindOneUsersDto {
  @ApiProperty({
    example: '6597b7ef01d3f9f2267c6961',
  })
  id: string;
}
