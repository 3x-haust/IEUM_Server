import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileAccessLevel, RealtimeEventType, UserRole, VisitorProfileEntity, VisitorType } from '../../database/entities';
import { OcrResult, OcrService } from '../background/ocr.service';
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
    private readonly ocr: OcrService,
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
    const ocrResult = await this.extractBusinessCardOcr(businessCard?.storageKey, businessCardBack?.storageKey);
    const profile = await this.profiles.save(this.profiles.create({
      ageGroup: dto.ageGroup,
      visitorType: dto.visitorType,
      businessCardFileId: businessCard?.id ?? null,
      businessCardBackFileId: businessCardBack?.id ?? null,
      businessCardRegistered: Boolean(businessCard) || Boolean(businessCardBack) || hasManualBusinessCard,
      ocrRawText: ocrResult.rawText,
      ocrName: normalizeManualField(dto.ocrName) ?? ocrResult.name,
      ocrOrganization: normalizeManualField(dto.ocrOrganization) ?? ocrResult.organization,
      ocrPosition: normalizeManualField(dto.ocrPosition) ?? ocrResult.position,
      ocrEmail: normalizeManualField(dto.ocrEmail) ?? ocrResult.email,
      ocrPhone: normalizeManualField(dto.ocrPhone) ?? ocrResult.phone
    }));
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

  private async extractBusinessCardOcr(frontStorageKey?: string, backStorageKey?: string): Promise<OcrResult> {
    const results = await Promise.all([
      frontStorageKey ? this.ocr.extract(frontStorageKey) : Promise.resolve(emptyOcrResult()),
      backStorageKey ? this.ocr.extract(backStorageKey) : Promise.resolve(emptyOcrResult())
    ]);
    return mergeOcrResults(results[0], results[1]);
  }
}

function normalizeManualField(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function emptyOcrResult(): OcrResult {
  return { rawText: null, name: null, organization: null, position: null, email: null, phone: null };
}

function mergeOcrResults(front: OcrResult, back: OcrResult): OcrResult {
  const rawText = [front.rawText, back.rawText].filter((value): value is string => Boolean(value)).join('\n');
  return {
    rawText: rawText || null,
    name: front.name ?? back.name,
    organization: front.organization ?? back.organization,
    position: front.position ?? back.position,
    email: front.email ?? back.email,
    phone: front.phone ?? back.phone
  };
}
