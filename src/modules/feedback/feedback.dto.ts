import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { CursorPaginationDto } from '../../common/dto/pagination.dto';
import { FeedbackStatus, VisitorType } from '../../database/entities';

export const FEEDBACK_AGE_GROUPS = ['child', 'youth', 'adult', 'senior', 'middle_school', 'high_school', 'university', 'other'] as const;
export const FEEDBACK_GENDERS = ['male', 'female', 'other'] as const;

export class CreateFeedbackDto {
  @ApiProperty({ minLength: 2, maxLength: 500 })
  @IsString()
  @Length(2, 500)
  content: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  visitorProfileId?: string | null;

  @ApiPropertyOptional({ enum: FEEDBACK_AGE_GROUPS, nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(FEEDBACK_AGE_GROUPS)
  ageGroup?: string | null;

  @ApiPropertyOptional({ enum: VisitorType, nullable: true })
  @IsOptional()
  @IsEnum(VisitorType)
  visitorType?: VisitorType | null;

  @ApiPropertyOptional({ enum: FEEDBACK_GENDERS, nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(FEEDBACK_GENDERS)
  gender?: string | null;
}

export class FeedbackListQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ enum: FeedbackStatus })
  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdateFeedbackStatusDto {
  @ApiProperty({ enum: FeedbackStatus })
  @IsEnum(FeedbackStatus)
  status: FeedbackStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moderationReason?: string;
}

export class FeedbackResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  visitorProfileId: string | null;

  @ApiProperty({ nullable: true, example: 'adult' })
  ageGroup: string | null;

  @ApiProperty({ nullable: true, example: 'general' })
  visitorType: string | null;

  @ApiProperty({ nullable: true, example: 'male' })
  gender: string | null;

  @ApiProperty({ example: '발표에서 기술 선택 이유를 더 듣고 싶어요.' })
  content: string;

  @ApiProperty({ enum: FeedbackStatus })
  status: FeedbackStatus;

  @ApiProperty({ nullable: true, example: null })
  moderationReason: string | null;

  @ApiProperty({ nullable: true, example: 'a5f3...' })
  ipHash: string | null;

  @ApiProperty({ nullable: true, example: 'Mozilla/5.0' })
  userAgent: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}
