import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AgeGroup, VisitorType } from '../../database/entities';

export class CreateVisitorProfileDto {
  @ApiProperty({ enum: AgeGroup })
  @IsEnum(AgeGroup)
  ageGroup: AgeGroup;

  @ApiProperty({ enum: VisitorType })
  @IsEnum(VisitorType)
  visitorType: VisitorType;
}
