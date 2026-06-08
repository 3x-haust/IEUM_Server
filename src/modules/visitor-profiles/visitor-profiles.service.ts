import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileAccessLevel, RealtimeEventType, UserRole, VisitorProfileEntity, VisitorType } from '../../database/entities';
import { OcrQueueService } from '../background/ocr-queue.service';
import { EventsService } from '../events/events.service';
import { FilesService, UploadedFileInput } from '../files/files.service';
import { CreateVisitorProfileDto } from './visitor-profiles.dto';

@Injectable()
export class VisitorProfilesService {
  constructor(
    @InjectRepository(VisitorProfileEntity) private readonly profiles: Repository<VisitorProfileEntity>,
    private readonly files: FilesService,
    private readonly ocrQueue: OcrQueueService,
    private readonly events: EventsService
  ) {}

  async create(dto: CreateVisitorProfileDto, file?: UploadedFileInput): Promise<VisitorProfileEntity> {
    const hasManualBusinessCard = [dto.ocrName, dto.ocrOrganization, dto.ocrPosition, dto.ocrEmail, dto.ocrPhone]
      .some((value) => typeof value === 'string' && value.trim().length > 0);
    if (dto.visitorType === VisitorType.Recruiter && !file && !hasManualBusinessCard) {
      throw new BadRequestException('Business card image or manual business card fields are required for recruiter visitor profiles');
    }
    const businessCard = file ? await this.files.saveImage(file, FileAccessLevel.Private) : null;
    const profile = await this.profiles.save(this.profiles.create({
      ageGroup: dto.ageGroup,
      visitorType: dto.visitorType,
      businessCardFileId: businessCard?.id ?? null,
      businessCardRegistered: Boolean(businessCard) || hasManualBusinessCard,
      ocrRawText: null,
      ocrName: normalizeManualField(dto.ocrName),
      ocrOrganization: normalizeManualField(dto.ocrOrganization),
      ocrPosition: normalizeManualField(dto.ocrPosition),
      ocrEmail: normalizeManualField(dto.ocrEmail),
      ocrPhone: normalizeManualField(dto.ocrPhone)
    }));
    if (businessCard) {
      await this.ocrQueue.enqueueVisitorProfile(profile.id, businessCard.storageKey);
    }
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

function normalizeManualField(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
