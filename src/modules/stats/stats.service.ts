import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ContactEntity, ContactStatus, FeedbackEntity, FeedbackStatus, ProjectEntity, ProjectInterestEntity, UserEntity } from '../../database/entities';
import { CacheService } from '../cache/cache.service';
import { ProjectsService } from '../projects/projects.service';

type StatusCounts = Record<string, number>;
type DateCount = { readonly date: string; readonly count: number };
type ProjectStatsSnapshot = {
  readonly projectId: string;
  readonly feedbackCount: number;
  readonly contactCount: number;
  readonly interestCount: number;
  readonly feedbackByDate: readonly DateCount[];
  readonly contactsByDate: readonly DateCount[];
  readonly interestsByDate: readonly DateCount[];
};
type StudentProjectStatsSnapshot = {
  readonly projectId: string;
  readonly feedbackCount: number;
  readonly feedbackByDate: readonly DateCount[];
};
type DashboardSnapshot = {
  readonly projectCount: number;
  readonly feedbackCount: number;
  readonly contactCount: number;
  readonly newContactCount: number;
  readonly interestCount: number;
  readonly feedbackByStatus: StatusCounts;
  readonly feedbackByAgeGroup: StatusCounts;
  readonly feedbackByGender: StatusCounts;
  readonly feedbackByVisitorType: StatusCounts;
  readonly contactsByStatus: StatusCounts;
};
type ReportSnapshot = {
  readonly generatedAt: string;
  readonly projectStats: readonly ProjectStatsSnapshot[];
};

const STATS_CACHE_TTL_SECONDS = 30;
const REPORT_CACHE_TTL_SECONDS = 60;

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(ProjectEntity) private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(FeedbackEntity) private readonly feedback: Repository<FeedbackEntity>,
    @InjectRepository(ContactEntity) private readonly contacts: Repository<ContactEntity>,
    @InjectRepository(ProjectInterestEntity) private readonly interests: Repository<ProjectInterestEntity>,
    private readonly cache: CacheService,
    private readonly projectsService: ProjectsService
  ) {}

  async dashboard(): Promise<DashboardSnapshot> {
    return this.readThrough('stats:dashboard', STATS_CACHE_TTL_SECONDS, async () => {
      const [projectCount, feedbackByStatus, feedbackByAgeGroup, feedbackByGender, feedbackByVisitorType, contactsByStatus, interestCount] = await Promise.all([
        this.projects.count({ where: { isPublished: true } }),
        this.countFeedbackByStatus(),
        this.countFeedbackByField('ageGroup'),
        this.countFeedbackByField('gender'),
        this.countFeedbackByField('visitorType'),
        this.countContactsByStatus(),
        this.interests.count()
      ]);
      const deletedContactStatus = `${ContactStatus.Deleted}`;
      const contactCount = Object.entries(contactsByStatus)
        .filter(([status]) => status !== deletedContactStatus)
        .reduce((sum, [, count]) => sum + count, 0);
      return {
        projectCount,
        feedbackCount: feedbackByStatus[FeedbackStatus.Public] ?? 0,
        contactCount,
        newContactCount: contactsByStatus[ContactStatus.New] ?? 0,
        interestCount,
        feedbackByStatus,
        feedbackByAgeGroup,
        feedbackByGender,
        feedbackByVisitorType,
        contactsByStatus
      };
    });
  }

  async projectStats(projectId: string): Promise<ProjectStatsSnapshot> {
    return this.readThrough(`stats:project:${projectId}`, STATS_CACHE_TTL_SECONDS, () => this.buildProjectStats(projectId));
  }

  async studentProjectStats(projectId: string, user: UserEntity): Promise<StudentProjectStatsSnapshot> {
    await this.projectsService.assertMember(projectId, user);
    return this.readThrough(`stats:student-project:${projectId}`, STATS_CACHE_TTL_SECONDS, async () => {
      const [feedbackCount, feedbackByDate] = await Promise.all([
        this.feedback.count({ where: { projectId, status: FeedbackStatus.Public } }),
        this.countByDate(this.feedback, 'feedback', projectId)
      ]);
      return { projectId, feedbackCount, feedbackByDate };
    });
  }

  async report(): Promise<ReportSnapshot> {
    return this.readThrough('stats:report', REPORT_CACHE_TTL_SECONDS, async () => {
      const projects = await this.projects.find({ select: { id: true }, where: { isPublished: true }, order: { createdAt: 'DESC' } });
      const projectStats = await this.buildProjectStatsBatch(projects.map((project) => project.id));
      return { generatedAt: new Date().toISOString(), projectStats };
    });
  }

  private async buildProjectStats(projectId: string): Promise<ProjectStatsSnapshot> {
    const [feedbackCount, contactCount, interestCount, feedbackByDate, contactsByDate, interestsByDate] = await Promise.all([
      this.feedback.count({ where: { projectId, status: FeedbackStatus.Public } }),
      this.contacts.count({ where: { projectId, status: Not(ContactStatus.Deleted) } }),
      this.interests.count({ where: { projectId } }),
      this.countByDate(this.feedback, 'feedback', projectId),
      this.countByDate(this.contacts, 'contact', projectId),
      this.countByDate(this.interests, 'interest', projectId)
    ]);
    return { projectId, feedbackCount, contactCount, interestCount, feedbackByDate, contactsByDate, interestsByDate };
  }

  private async buildProjectStatsBatch(projectIds: string[]): Promise<ProjectStatsSnapshot[]> {
    if (projectIds.length === 0) {
      return [];
    }
    const [feedbackCounts, contactCounts, interestCounts, feedbackByDate, contactsByDate, interestsByDate] = await Promise.all([
      this.countByProject(this.feedback, 'feedback', projectIds, 'feedback.status = :status', { status: FeedbackStatus.Public }),
      this.countByProject(this.contacts, 'contact', projectIds, 'contact.status != :status', { status: ContactStatus.Deleted }),
      this.countByProject(this.interests, 'interest', projectIds),
      this.countByProjectDate(this.feedback, 'feedback', projectIds),
      this.countByProjectDate(this.contacts, 'contact', projectIds),
      this.countByProjectDate(this.interests, 'interest', projectIds)
    ]);
    return projectIds.map((projectId) => ({
      projectId,
      feedbackCount: feedbackCounts.get(projectId) ?? 0,
      contactCount: contactCounts.get(projectId) ?? 0,
      interestCount: interestCounts.get(projectId) ?? 0,
      feedbackByDate: feedbackByDate.get(projectId) ?? [],
      contactsByDate: contactsByDate.get(projectId) ?? [],
      interestsByDate: interestsByDate.get(projectId) ?? []
    }));
  }

  private async countFeedbackByStatus(): Promise<Record<string, number>> {
    const rows = await this.feedback.createQueryBuilder('feedback').select('feedback.status', 'status').addSelect('COUNT(*)', 'count').groupBy('feedback.status').getRawMany<{ status: string; count: string }>();
    return Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
  }

  private async countFeedbackByField(field: 'ageGroup' | 'gender' | 'visitorType'): Promise<Record<string, number>> {
    const rows = await this.feedback.createQueryBuilder('feedback')
      .select(`feedback.${field}`, 'key')
      .addSelect('COUNT(*)', 'count')
      .where('feedback.status != :deletedStatus', { deletedStatus: FeedbackStatus.Deleted })
      .andWhere(`feedback.${field} IS NOT NULL`)
      .groupBy(`feedback.${field}`)
      .getRawMany<{ key: string; count: string }>();
    return Object.fromEntries(rows.map((row) => [row.key, Number(row.count)]));
  }

  private async countContactsByStatus(): Promise<Record<string, number>> {
    const rows = await this.contacts.createQueryBuilder('contact').select('contact.status', 'status').addSelect('COUNT(*)', 'count').groupBy('contact.status').getRawMany<{ status: string; count: string }>();
    return Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
  }

  private async countByDate(repository: Repository<FeedbackEntity> | Repository<ContactEntity> | Repository<ProjectInterestEntity>, alias: string, projectId: string): Promise<DateCount[]> {
    const rows = await repository.createQueryBuilder(alias).select(`DATE(${alias}.createdAt)`, 'date').addSelect('COUNT(*)', 'count').where(`${alias}.projectId = :projectId`, { projectId }).groupBy('date').orderBy('date', 'ASC').getRawMany<{ date: string; count: string }>();
    return rows.map((row) => ({ date: row.date, count: Number(row.count) }));
  }

  private async countByProject(
    repository: Repository<FeedbackEntity> | Repository<ContactEntity> | Repository<ProjectInterestEntity>,
    alias: string,
    projectIds: string[],
    extraWhere?: string,
    extraParams: Record<string, unknown> = {}
  ): Promise<Map<string, number>> {
    const qb = repository.createQueryBuilder(alias)
      .select(`${alias}.projectId`, 'projectId')
      .addSelect('COUNT(*)', 'count')
      .where(`${alias}.projectId IN (:...projectIds)`, { projectIds })
      .groupBy(`${alias}.projectId`);
    if (extraWhere) {
      qb.andWhere(extraWhere, extraParams);
    }
    const rows = await qb.getRawMany<{ projectId: string; count: string }>();
    return new Map(rows.map((row) => [row.projectId, Number(row.count)]));
  }

  private async countByProjectDate(
    repository: Repository<FeedbackEntity> | Repository<ContactEntity> | Repository<ProjectInterestEntity>,
    alias: string,
    projectIds: string[]
  ): Promise<Map<string, DateCount[]>> {
    const rows = await repository.createQueryBuilder(alias)
      .select(`${alias}.projectId`, 'projectId')
      .addSelect(`DATE(${alias}.createdAt)`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where(`${alias}.projectId IN (:...projectIds)`, { projectIds })
      .groupBy(`${alias}.projectId`)
      .addGroupBy('date')
      .orderBy(`${alias}.projectId`, 'ASC')
      .addOrderBy('date', 'ASC')
      .getRawMany<{ projectId: string; date: string; count: string }>();
    const counts = new Map<string, DateCount[]>();
    for (const row of rows) {
      const items = counts.get(row.projectId) ?? [];
      items.push({ date: row.date, count: Number(row.count) });
      counts.set(row.projectId, items);
    }
    return counts;
  }

  private async readThrough<T>(key: string, ttlSeconds: number, producer: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached) {
      return cached;
    }
    const value = await producer();
    await this.cache.set(key, value, ttlSeconds);
    return value;
  }
}
