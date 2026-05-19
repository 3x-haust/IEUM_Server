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
    if (dto.visitorType === VisitorType.Recruiter && !file) {
      throw new BadRequestException('Business card image is required for recruiter visitor profiles');
    }
    const businessCard = file ? await this.files.saveImage(file, FileAccessLevel.Private) : null;
    const profile = await this.profiles.save(this.profiles.create({
      ageGroup: dto.ageGroup,
      visitorType: dto.visitorType,
      businessCardFileId: businessCard?.id ?? null,
      businessCardRegistered: Boolean(businessCard),
      ocrRawText: null,
      ocrName: null,
      ocrOrganization: null,
      ocrPosition: null,
      ocrEmail: null,
      ocrPhone: null
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
