import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CursorPaginationDto } from '../../common/dto/pagination.dto';
import { ProjectMemberRole } from '../../database/entities';

export class ProjectListQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stack?: string;

  @ApiPropertyOptional({ example: 'global' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class ProjectStackGroupResponseDto {
  @ApiProperty({ example: 'Language' })
  category: string;

  @ApiProperty({ example: '#5B8DEF' })
  color: string;

  @ApiProperty({ type: [String], example: ['TypeScript', 'JavaScript'] })
  items: string[];
}

export class ProjectFeatureDescriptionResponseDto {
  @ApiProperty({ example: '프리쿠라 촬영' })
  title: string;

  @ApiProperty({ example: '일본 프리쿠라 스타일의 사진 촬영 및 프레임 적용 기능 제공' })
  description: string;
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

  @ApiProperty({ nullable: true, example: '/assets/projects/35.png' })
  thumbnailPath: string | null;

  @ApiProperty({ nullable: true, example: 'global' })
  experienceCategory: string | null;

  @ApiProperty({ nullable: true, example: 'G1' })
  boothSlot: string | null;

  @ApiProperty({ type: [String], example: ['NestJS', 'PostgreSQL'] })
  developmentStacks: string[];

  @ApiProperty({ type: [String], example: ['Figma'] })
  designStacks: string[];

  @ApiProperty({ type: [ProjectStackGroupResponseDto] })
  stackGroups: ProjectStackGroupResponseDto[];

  @ApiProperty({ type: [ProjectFeatureDescriptionResponseDto] })
  featureDescriptions: ProjectFeatureDescriptionResponseDto[];

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

  @ApiProperty({ enum: ProjectMemberRole, isArray: true, example: [ProjectMemberRole.Backend, ProjectMemberRole.Frontend] })
  roles: ProjectMemberRole[];
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
