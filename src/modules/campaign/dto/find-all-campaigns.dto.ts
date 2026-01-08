import { SortDto } from '@modules/shared/dto/sort.dto';
import { ApiProperty } from '@nestjs/swagger';

export class FindAllCampaignsDto {
  @ApiProperty()
  page: number;

  @ApiProperty({
    type: SortDto,
  })
  sortDto: SortDto;
}