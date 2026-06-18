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

export class FeedbackAudienceCountMapDto {
  @ApiProperty({ example: 5, required: false })
  child?: number;

  @ApiProperty({ example: 12, required: false })
  youth?: number;

  @ApiProperty({ example: 37, required: false })
  adult?: number;

  @ApiProperty({ example: 4, required: false })
  senior?: number;

  @ApiProperty({ example: 18, required: false })
  male?: number;

  @ApiProperty({ example: 21, required: false })
  female?: number;

  @ApiProperty({ example: 30, required: false })
  general?: number;

  @ApiProperty({ example: 9, required: false })
  recruiter?: number;

  @ApiProperty({ example: 3, required: false })
  other?: number;
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

  @ApiProperty({ type: FeedbackAudienceCountMapDto })
  feedbackByAgeGroup: FeedbackAudienceCountMapDto;

  @ApiProperty({ type: FeedbackAudienceCountMapDto })
  feedbackByGender: FeedbackAudienceCountMapDto;

  @ApiProperty({ type: FeedbackAudienceCountMapDto })
  feedbackByVisitorType: FeedbackAudienceCountMapDto;

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
