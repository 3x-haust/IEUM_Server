import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { CursorPaginationDto } from '../../common/dto/pagination.dto';
import { FeedbackStatus } from '../../database/entities';

export class CreateFeedbackDto {
  @ApiProperty({ minLength: 2, maxLength: 500 })
  @IsString()
  @Length(2, 500)
  content: string;
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
