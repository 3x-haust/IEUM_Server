import { ApiProperty } from '@nestjs/swagger';

export class StatusResponseDto {
  @ApiProperty()
  status: string;
}
