import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileAccessLevel, RealtimeEventType, UserRole, VisitorProfileEntity, VisitorType } from '../../database/entities';
import { OcrService } from '../background/ocr.service';
import { EventsService } from '../events/events.service';
import { FilesService, UploadedFileInput } from '../files/files.service';
import { CreateVisitorProfileDto } from './visitor-profiles.dto';

@Injectable()
export class VisitorProfilesService {
  constructor(
    @InjectRepository(VisitorProfileEntity) private readonly profiles: Repository<VisitorProfileEntity>,
    private readonly files: FilesService,
    private readonly ocr: OcrService,
    private readonly events: EventsService
  ) {}

  async create(dto: CreateVisitorProfileDto, file?: UploadedFileInput): Promise<VisitorProfileEntity> {
    if (dto.visitorType === VisitorType.Recruiter && !file) {
      throw new BadRequestException('Business card image is required for recruiter visitor profiles');
    }
    const businessCard = file ? await this.files.saveImage(file, FileAccessLevel.Private) : null;
    const ocr = businessCard ? await this.ocr.extract(businessCard.storageKey) : { rawText: null, name: null, organization: null, position: null, email: null, phone: null };
    const profile = await this.profiles.save(this.profiles.create({
      ageGroup: dto.ageGroup,
      visitorType: dto.visitorType,
      businessCardFileId: businessCard?.id ?? null,
      businessCardRegistered: Boolean(businessCard),
      ocrRawText: ocr.rawText,
      ocrName: ocr.name,
      ocrOrganization: ocr.organization,
      ocrPosition: ocr.position,
      ocrEmail: ocr.email,
      ocrPhone: ocr.phone
    }));
    await this.events.publish(RealtimeEventType.VisitorProfileCreated, null, UserRole.Teacher, { visitorProfileId: profile.id, visitorType: profile.visitorType }, 'visitor_profile', profile.id);
    return profile;
  }

  async findOne(id: string): Promise<VisitorProfileEntity> {
    const profile = await this.profiles.findOne({ where: { id }, relations: { businessCardFile: true } });
    if (!profile) {
      throw new NotFoundException('Visitor profile not found');
    }
    return profile;
  }
}
