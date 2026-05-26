import { ApiProperty } from '@nestjs/swagger';

export class ProjectInterestResponseDto {
  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty({ example: 29, description: '현재 프로젝트 관심 표시 누적 수' })
  interestCount: number;

  @ApiProperty({ example: false, description: '같은 방문자 신호가 이미 저장되어 있었는지 여부' })
  alreadyInterested: boolean;
}
