import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CursorPage } from '../../common/dto/pagination.dto';
import { decodeCursor, encodeCursor } from '../../common/utils/cursor';
import { hashIp } from '../../common/utils/ip-hash';
import { stripHtml } from '../../common/utils/text-normalizer';
import { AuditAction, FeedbackEntity, FeedbackStatus, RealtimeEventType, UserEntity, UserRole } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { BannedWordsService } from '../banned-words/banned-words.service';
import { RateLimitService } from '../cache/rate-limit.service';
import { EventsService } from '../events/events.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateFeedbackDto, FeedbackListQueryDto, UpdateFeedbackStatusDto } from './feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(FeedbackEntity) private readonly feedback: Repository<FeedbackEntity>,
    private readonly projects: ProjectsService,
    private readonly bannedWords: BannedWordsService,
    private readonly rateLimit: RateLimitService,
    private readonly events: EventsService,
    private readonly audit: AuditService
  ) {}

  async create(projectId: string, dto: CreateFeedbackDto, ip: string | undefined, userAgent: string | undefined): Promise<FeedbackEntity> {
    await this.projects.findProject(projectId, true);
    const ipHash = hashIp(ip);
    if (ipHash) {
      await this.rateLimit.enforce(`ratelimit:feedback:${ipHash}`, 10, 60);
    }
    const content = stripHtml(dto.content).trim();
    const matches = await this.bannedWords.findMatches(content);
    const status = matches.length ? FeedbackStatus.Blocked : FeedbackStatus.Public;
    const moderationReason = matches.length ? `banned_words:${matches.join(',')}` : null;
    const saved = await this.feedback.save(this.feedback.create({ projectId, content, status, moderationReason, ipHash, userAgent: userAgent ?? null }));
    await this.events.publish(RealtimeEventType.FeedbackCreated, projectId, UserRole.Student, { feedbackId: saved.id, status: saved.status }, 'feedback', saved.id);
    return saved;
  }

  async listAdmin(query: FeedbackListQueryDto): Promise<CursorPage<FeedbackEntity>> {
    return this.list(query, false);
  }

  async listStudent(projectId: string, user: UserEntity, query: FeedbackListQueryDto): Promise<CursorPage<FeedbackEntity>> {
    await this.projects.assertMember(projectId, user);
    return this.list({ ...query, projectId, status: FeedbackStatus.Public }, true);
  }

  async updateStatus(id: string, dto: UpdateFeedbackStatusDto, actor: UserEntity): Promise<FeedbackEntity> {
    const feedback = await this.feedback.findOne({ where: { id } });
    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }
    const previousStatus = feedback.status;
    feedback.status = dto.status;
    feedback.moderationReason = dto.moderationReason ?? feedback.moderationReason;
    const saved = await this.feedback.save(feedback);
    await this.audit.record(actor, AuditAction.FeedbackStatusChanged, 'feedback', saved.id, { previousStatus, status: saved.status, moderationReason: saved.moderationReason });
    await this.events.publish(RealtimeEventType.FeedbackStatusChanged, saved.projectId, UserRole.Student, { feedbackId: saved.id, status: saved.status }, 'feedback', saved.id);
    return saved;
  }

  private async list(query: FeedbackListQueryDto, publicOnly: boolean): Promise<CursorPage<FeedbackEntity>> {
    const limit = query.limit ?? 20;
    const cursor = decodeCursor(query.cursor);
    const qb = this.feedback.createQueryBuilder('feedback').where(publicOnly ? 'feedback.status = :publicStatus' : 'feedback.status != :deletedStatus', { publicStatus: FeedbackStatus.Public, deletedStatus: FeedbackStatus.Deleted }).orderBy('feedback.createdAt', 'DESC').addOrderBy('feedback.id', 'DESC').take(limit + 1);
    if (query.projectId) {
      qb.andWhere('feedback.projectId = :projectId', { projectId: query.projectId });
    }
    if (query.status && !publicOnly) {
      qb.andWhere('feedback.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere(new Brackets((nested) => nested.where('feedback.content ILIKE :search', { search: `%${query.search}%` })));
    }
    if (cursor) {
      qb.andWhere('(feedback.createdAt, feedback.id) < (:date, :id)', { date: cursor.date, id: cursor.id });
    }
    const rows = await qb.getMany();
    const items = rows.slice(0, limit);
    const last = items.at(-1);
    return { items, nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null };
  }
}
