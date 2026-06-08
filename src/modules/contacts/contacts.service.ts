import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Not, Repository } from 'typeorm';
import { CursorPage } from '../../common/dto/pagination.dto';
import { decodeCursor, encodeCursor } from '../../common/utils/cursor';
import { hashIp } from '../../common/utils/ip-hash';
import { AuditAction, ContactEntity, ContactStatus, RealtimeEventType, UserEntity, UserRole, VisitorType } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { RateLimitService } from '../cache/rate-limit.service';
import { EventsService } from '../events/events.service';
import { ProjectsService } from '../projects/projects.service';
import { VisitorProfilesService } from '../visitor-profiles/visitor-profiles.service';
import { ContactListQueryDto, CreateContactDto, UpdateContactOcrDto, UpdateContactStatusDto } from './contacts.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(ContactEntity) private readonly contacts: Repository<ContactEntity>,
    private readonly visitorProfiles: VisitorProfilesService,
    private readonly projects: ProjectsService,
    private readonly rateLimit: RateLimitService,
    private readonly events: EventsService,
    private readonly audit: AuditService
  ) {}

  async create(projectId: string, dto: CreateContactDto, ip: string | undefined, userAgent: string | undefined): Promise<ContactEntity> {
    await this.projects.findProject(projectId, true);
    const profile = await this.visitorProfiles.findOne(dto.visitorProfileId);
    if (profile.visitorType !== VisitorType.Recruiter) {
      throw new BadRequestException('Only recruiter visitor profiles can create contacts');
    }
    if (!profile.businessCardRegistered) {
      throw new BadRequestException('Recruiter visitor profile requires a business card');
    }
    const isMember = await this.projects.isProjectMember(projectId, dto.targetMemberUserId);
    if (!isMember) {
      throw new BadRequestException('Target member must belong to the project');
    }
    const ipHash = hashIp(ip);
    if (ipHash) {
      await this.rateLimit.enforce(`ratelimit:contact:${ipHash}`, 10, 600);
    }
    const saved = await this.contacts.save(this.contacts.create({
      projectId,
      visitorProfileId: profile.id,
      targetMemberUserId: dto.targetMemberUserId,
      ageGroup: profile.ageGroup,
      visitorType: profile.visitorType,
      name: dto.name ?? profile.ocrName,
      organization: dto.organization ?? profile.ocrOrganization,
      position: dto.position ?? profile.ocrPosition,
      email: dto.email ?? profile.ocrEmail,
      phone: dto.phone ?? profile.ocrPhone,
      memo: dto.memo ?? null,
      businessCardFileId: profile.businessCardFileId,
      ocrRawText: profile.ocrRawText,
      ocrName: profile.ocrName,
      ocrOrganization: profile.ocrOrganization,
      ocrPosition: profile.ocrPosition,
      ocrEmail: profile.ocrEmail,
      ocrPhone: profile.ocrPhone,
      status: ContactStatus.New,
      ipHash,
      userAgent: userAgent ?? null
    }));
    await this.events.publish(RealtimeEventType.ContactCreated, projectId, UserRole.Teacher, { contactId: saved.id, projectId }, 'contact', saved.id);
    return saved;
  }

  async list(query: ContactListQueryDto): Promise<CursorPage<ContactEntity>> {
    const limit = query.limit ?? 20;
    const cursor = decodeCursor(query.cursor);
    const qb = this.contacts.createQueryBuilder('contact').leftJoinAndSelect('contact.targetMemberUser', 'targetMemberUser').leftJoinAndSelect('contact.project', 'project').where('contact.status != :deletedStatus', { deletedStatus: ContactStatus.Deleted }).orderBy('contact.createdAt', 'DESC').addOrderBy('contact.id', 'DESC').take(limit + 1);
    if (query.projectId) {
      qb.andWhere('contact.projectId = :projectId', { projectId: query.projectId });
    }
    if (query.targetMemberUserId) {
      qb.andWhere('contact.targetMemberUserId = :targetMemberUserId', { targetMemberUserId: query.targetMemberUserId });
    }
    if (query.visitorType) {
      qb.andWhere('contact.visitorType = :visitorType', { visitorType: query.visitorType });
    }
    if (query.status) {
      qb.andWhere('contact.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere(new Brackets((nested) => {
        nested.where('contact.name ILIKE :search', { search: `%${query.search}%` }).orWhere('contact.organization ILIKE :search', { search: `%${query.search}%` }).orWhere('contact.email ILIKE :search', { search: `%${query.search}%` }).orWhere('contact.phone ILIKE :search', { search: `%${query.search}%` });
      }));
    }
    if (cursor) {
      qb.andWhere('(contact.createdAt, contact.id) < (:date, :id)', { date: cursor.date, id: cursor.id });
    }
    const rows = await qb.getMany();
    const items = rows.slice(0, limit);
    const last = items.at(-1);
    return { items, nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null };
  }

  async getDetail(id: string, actor: UserEntity): Promise<ContactEntity> {
    const contact = await this.contacts.findOne({ where: { id, status: Not(ContactStatus.Deleted) }, relations: { targetMemberUser: true, project: true, businessCardFile: true } });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    await this.audit.record(actor, AuditAction.ContactViewed, 'contact', contact.id, { projectId: contact.projectId });
    return contact;
  }

  async updateStatus(id: string, dto: UpdateContactStatusDto, actor: UserEntity): Promise<ContactEntity> {
    const contact = await this.contacts.findOne({ where: { id } });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    const previousStatus = contact.status;
    contact.status = dto.status;
    const saved = await this.contacts.save(contact);
    await this.audit.record(actor, AuditAction.ContactStatusChanged, 'contact', saved.id, { previousStatus, status: saved.status });
    await this.events.publish(RealtimeEventType.ContactStatusChanged, saved.projectId, UserRole.Teacher, { contactId: saved.id, status: saved.status }, 'contact', saved.id);
    return saved;
  }

  async updateOcr(id: string, dto: UpdateContactOcrDto, actor: UserEntity): Promise<ContactEntity> {
    const contact = await this.contacts.findOne({ where: { id } });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    contact.ocrName = dto.ocrName ?? contact.ocrName;
    contact.ocrOrganization = dto.ocrOrganization ?? contact.ocrOrganization;
    contact.ocrPosition = dto.ocrPosition ?? contact.ocrPosition;
    contact.ocrEmail = dto.ocrEmail ?? contact.ocrEmail;
    contact.ocrPhone = dto.ocrPhone ?? contact.ocrPhone;
    const saved = await this.contacts.save(contact);
    await this.audit.record(actor, AuditAction.ContactOcrUpdated, 'contact', saved.id, { fields: Object.keys(dto) });
    return saved;
  }
}
