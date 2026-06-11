import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileAccessLevel, RealtimeEventType, UserRole, VisitorProfileEntity, VisitorType } from '../../database/entities';
import { OcrQueueService } from '../background/ocr-queue.service';
import { EventsService } from '../events/events.service';
import { FilesService, UploadedFileInput } from '../files/files.service';
import { CreateVisitorProfileDto } from './visitor-profiles.dto';

interface BusinessCardUploadInput {
  readonly front?: UploadedFileInput;
  readonly back?: UploadedFileInput;
}

@Injectable()
export class VisitorProfilesService {
  constructor(
    @InjectRepository(VisitorProfileEntity) private readonly profiles: Repository<VisitorProfileEntity>,
    private readonly files: FilesService,
    private readonly ocrQueue: OcrQueueService,
    private readonly events: EventsService
  ) {}

  async create(dto: CreateVisitorProfileDto, uploads: BusinessCardUploadInput = {}): Promise<VisitorProfileEntity> {
    const hasManualBusinessCard = [dto.ocrName, dto.ocrOrganization, dto.ocrPosition, dto.ocrEmail, dto.ocrPhone]
      .some((value) => typeof value === 'string' && value.trim().length > 0);
    if (dto.visitorType === VisitorType.Recruiter && !uploads.front && !uploads.back && !hasManualBusinessCard) {
      throw new BadRequestException('Business card image or manual business card fields are required for recruiter visitor profiles');
    }
    const businessCard = uploads.front ? await this.files.saveImage(uploads.front, FileAccessLevel.Private) : null;
    const businessCardBack = uploads.back ? await this.files.saveImage(uploads.back, FileAccessLevel.Private) : null;
    const profile = await this.profiles.save(this.profiles.create({
      ageGroup: dto.ageGroup,
      visitorType: dto.visitorType,
      businessCardFileId: businessCard?.id ?? null,
      businessCardBackFileId: businessCardBack?.id ?? null,
      businessCardRegistered: Boolean(businessCard) || Boolean(businessCardBack) || hasManualBusinessCard,
      ocrRawText: null,
      ocrName: normalizeManualField(dto.ocrName),
      ocrOrganization: normalizeManualField(dto.ocrOrganization),
      ocrPosition: normalizeManualField(dto.ocrPosition),
      ocrEmail: normalizeManualField(dto.ocrEmail),
      ocrPhone: normalizeManualField(dto.ocrPhone)
    }));
    await this.enqueueBusinessCardOcr(profile.id, businessCard?.storageKey, businessCardBack?.storageKey);
    await this.events.publish(RealtimeEventType.VisitorProfileCreated, null, UserRole.Teacher, { visitorProfileId: profile.id, visitorType: profile.visitorType }, 'visitor_profile', profile.id);
    return profile;
  }

  async findOne(id: string): Promise<VisitorProfileEntity> {
    const profile = await this.profiles.findOne({
      where: { id },
      relations: { businessCardFile: true, businessCardBackFile: true }
    });
    if (!profile) {
      throw new NotFoundException('Visitor profile not found');
    }
    return profile;
  }

  private async enqueueBusinessCardOcr(profileId: string, frontStorageKey?: string, backStorageKey?: string): Promise<void> {
    const storageKeys = [frontStorageKey, backStorageKey].filter((value): value is string => Boolean(value));
    await this.ocrQueue.enqueueVisitorProfile(profileId, storageKeys);
  }
}

function normalizeManualField(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
