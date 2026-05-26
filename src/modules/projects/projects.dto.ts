import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CursorPaginationDto } from '../../common/dto/pagination.dto';

export class ProjectListQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stack?: string;
}

export class ProjectSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'IEUM' })
  serviceName: string;

  @ApiProperty({ example: '3xhaust' })
  teamName: string;

  @ApiProperty({ nullable: true, example: '행사 프로젝트 피드백 플랫폼' })
  description: string | null;

  @ApiProperty({ nullable: true, example: 'https://cdn.example.com/project.png' })
  thumbnailUrl: string | null;

  @ApiProperty({ type: [String], example: ['NestJS', 'PostgreSQL'] })
  developmentStacks: string[];

  @ApiProperty({ type: [String], example: ['Figma'] })
  designStacks: string[];

  @ApiProperty({ example: true })
  isPublished: boolean;

  @ApiProperty({ example: 12 })
  feedbackCount: number;

  @ApiProperty({ example: 3 })
  contactCount: number;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class ProjectMemberResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: '유성윤' })
  name: string;

  @ApiProperty({ example: 0 })
  displayOrder: number;
}

export class ProjectDetailResponseDto extends ProjectSummaryResponseDto {
  @ApiProperty({ type: [ProjectMemberResponseDto] })
  members: ProjectMemberResponseDto[];
}

export class AdminProjectSummaryResponseDto extends ProjectSummaryResponseDto {
  @ApiProperty({ example: 28, description: '선생님/관리자가 발표 후보로 관심 표시한 누적 수' })
  interestCount: number;
}

export class AdminProjectDetailResponseDto extends AdminProjectSummaryResponseDto {
  @ApiProperty({ type: [ProjectMemberResponseDto] })
  members: ProjectMemberResponseDto[];
}
