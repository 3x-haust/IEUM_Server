import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { CursorPaginationDto } from '../../common/dto/pagination.dto';
import { AgeGroup, ContactStatus, VisitorType } from '../../database/entities';

export class CreateContactDto {
  @ApiProperty()
  @IsUUID()
  visitorProfileId: string;

  @ApiProperty()
  @IsUUID()
  targetMemberUserId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 150)
  organization?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[0-9+\-\s()]{8,20}$/)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  memo?: string;
}

export class ContactListQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  targetMemberUserId?: string;

  @ApiPropertyOptional({ enum: VisitorType })
  @IsOptional()
  @IsEnum(VisitorType)
  visitorType?: VisitorType;

  @ApiPropertyOptional({ enum: ContactStatus })
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdateContactStatusDto {
  @ApiProperty({ enum: ContactStatus })
  @IsEnum(ContactStatus)
  status: ContactStatus;
}

export class UpdateContactOcrDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ocrName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ocrOrganization?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ocrPosition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  ocrEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[0-9+\-\s()]{8,20}$/)
  ocrPhone?: string;
}

export class ContactResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty({ format: 'uuid' })
  visitorProfileId: string;

  @ApiProperty({ format: 'uuid' })
  targetMemberUserId: string;

  @ApiProperty({ enum: AgeGroup })
  ageGroup: AgeGroup;

  @ApiProperty({ enum: VisitorType })
  visitorType: VisitorType;

  @ApiProperty({ nullable: true, example: '유성윤' })
  name: string | null;

  @ApiProperty({ nullable: true, example: '3xhaust' })
  organization: string | null;

  @ApiProperty({ nullable: true, example: 'Backend Developer' })
  position: string | null;

  @ApiProperty({ nullable: true, example: 'hello@example.com' })
  email: string | null;

  @ApiProperty({ nullable: true, example: '010-1234-5678' })
  phone: string | null;

  @ApiProperty({ nullable: true, example: '프로젝트 설명을 더 듣고 싶습니다.' })
  memo: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  businessCardFileId: string | null;

  @ApiProperty({ nullable: true })
  ocrRawText: string | null;

  @ApiProperty({ nullable: true })
  ocrName: string | null;

  @ApiProperty({ nullable: true })
  ocrOrganization: string | null;

  @ApiProperty({ nullable: true })
  ocrPosition: string | null;

  @ApiProperty({ nullable: true })
  ocrEmail: string | null;

  @ApiProperty({ nullable: true })
  ocrPhone: string | null;

  @ApiProperty({ enum: ContactStatus })
  status: ContactStatus;

  @ApiProperty({ nullable: true, example: 'a5f3...' })
  ipHash: string | null;

  @ApiProperty({ nullable: true, example: 'Mozilla/5.0' })
  userAgent: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}
