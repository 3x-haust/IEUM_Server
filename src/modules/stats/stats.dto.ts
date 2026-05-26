import { ApiProperty } from '@nestjs/swagger';

export class StatusCountMapDto {
  @ApiProperty({ example: 12, required: false })
  public?: number;

  @ApiProperty({ example: 2, required: false })
  blocked?: number;

  @ApiProperty({ example: 1, required: false })
  deleted?: number;

  @ApiProperty({ example: 5, required: false })
  new?: number;

  @ApiProperty({ example: 3, required: false })
  checked?: number;

  @ApiProperty({ example: 1, required: false })
  archived?: number;
}

export class DateCountDto {
  @ApiProperty({ example: '2026-05-26' })
  date: string;

  @ApiProperty({ example: 7 })
  count: number;
}

export class DashboardStatsResponseDto {
  @ApiProperty({ example: 24 })
  projectCount: number;

  @ApiProperty({ example: 112 })
  feedbackCount: number;

  @ApiProperty({ example: 9 })
  contactCount: number;

  @ApiProperty({ example: 4 })
  newContactCount: number;

  @ApiProperty({ example: 231 })
  interestCount: number;

  @ApiProperty({ type: StatusCountMapDto })
  feedbackByStatus: StatusCountMapDto;

  @ApiProperty({ type: StatusCountMapDto })
  contactsByStatus: StatusCountMapDto;
}

export class ProjectStatsResponseDto {
  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty({ example: 12 })
  feedbackCount: number;

  @ApiProperty({ example: 3 })
  contactCount: number;

  @ApiProperty({ example: 28 })
  interestCount: number;

  @ApiProperty({ type: [DateCountDto] })
  feedbackByDate: DateCountDto[];

  @ApiProperty({ type: [DateCountDto] })
  contactsByDate: DateCountDto[];

  @ApiProperty({ type: [DateCountDto] })
  interestsByDate: DateCountDto[];
}

export class StudentProjectStatsResponseDto {
  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty({ example: 12 })
  feedbackCount: number;

  @ApiProperty({ type: [DateCountDto] })
  feedbackByDate: DateCountDto[];
}

export class ReportResponseDto {
  @ApiProperty({ format: 'date-time' })
  generatedAt: string;

  @ApiProperty({ type: [ProjectStatsResponseDto] })
  projectStats: ProjectStatsResponseDto[];
}
