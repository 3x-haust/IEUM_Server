import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { CursorPaginationDto } from '../../common/dto/pagination.dto';
import { ContactStatus, VisitorType } from '../../database/entities';

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
