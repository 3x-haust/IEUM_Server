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
      const [projectCount, feedbackByStatus, contactsByStatus, interestCount] = await Promise.all([
        this.projects.count({ where: { isPublished: true } }),
        this.countFeedbackByStatus(),
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
      const projects = await this.projects.find({ where: { isPublished: true }, order: { createdAt: 'DESC' } });
      const projectStats = await Promise.all(projects.map((project) => this.projectStats(project.id)));
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

  private async countFeedbackByStatus(): Promise<Record<string, number>> {
    const rows = await this.feedback.createQueryBuilder('feedback').select('feedback.status', 'status').addSelect('COUNT(*)', 'count').groupBy('feedback.status').getRawMany<{ status: string; count: string }>();
    return Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
  }

  private async countContactsByStatus(): Promise<Record<string, number>> {
    const rows = await this.contacts.createQueryBuilder('contact').select('contact.status', 'status').addSelect('COUNT(*)', 'count').groupBy('contact.status').getRawMany<{ status: string; count: string }>();
    return Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
  }

  private async countByDate(repository: Repository<FeedbackEntity> | Repository<ContactEntity> | Repository<ProjectInterestEntity>, alias: string, projectId: string): Promise<DateCount[]> {
    const rows = await repository.createQueryBuilder(alias).select(`DATE(${alias}.createdAt)`, 'date').addSelect('COUNT(*)', 'count').where(`${alias}.projectId = :projectId`, { projectId }).groupBy('date').orderBy('date', 'ASC').getRawMany<{ date: string; count: string }>();
    return rows.map((row) => ({ date: row.date, count: Number(row.count) }));
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
