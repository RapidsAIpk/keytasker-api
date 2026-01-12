import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class BonusSubmissionDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Bonus screenshot file (required)',
  })
  @IsOptional()
  bonusScreenshot?: any;
}