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
