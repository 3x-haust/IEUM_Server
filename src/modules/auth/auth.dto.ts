import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginWithMirimTokenDto {
  @ApiProperty({ description: 'Mirim OAuth access token' })
  @IsString()
  @MinLength(1)
  accessToken!: string;
}
