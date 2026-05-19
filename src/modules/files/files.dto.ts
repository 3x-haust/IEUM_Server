import { ApiProperty } from '@nestjs/swagger';

export class FileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  size: number;

  @ApiProperty({ nullable: true })
  publicUrl: string | null;
}
