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

export class VisitorProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: AgeGroup })
  ageGroup: AgeGroup;

  @ApiProperty({ enum: VisitorType })
  visitorType: VisitorType;

  @ApiProperty({ format: 'uuid', nullable: true })
  businessCardFileId: string | null;

  @ApiProperty({ example: true })
  businessCardRegistered: boolean;

  @ApiProperty({ nullable: true })
  ocrRawText: string | null;

  @ApiProperty({ nullable: true })
  ocrName: string | null;

  @ApiProperty({ nullable: true })
  ocrOrganization: string | null;

  @ApiProperty({ nullable: true })
  ocrPosition: string | null;

  @ApiProperty({ nullable: true })
  ocrEmail: string | null;

  @ApiProperty({ nullable: true })
  ocrPhone: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class VisitorProfileResetResponseDto {
  @ApiProperty({ format: 'uuid' })
  visitorProfileId: string;

  @ApiProperty({ example: 'ieum.visitorProfile' })
  localStorageKey: string;

  @ApiProperty({ example: 'client_should_remove' })
  status: string;
}
