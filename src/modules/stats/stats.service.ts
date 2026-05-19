import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ContactEntity, ContactStatus, FeedbackEntity, FeedbackStatus, ProjectEntity, UserEntity } from '../../database/entities';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(ProjectEntity) private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(FeedbackEntity) private readonly feedback: Repository<FeedbackEntity>,
    @InjectRepository(ContactEntity) private readonly contacts: Repository<ContactEntity>,
    private readonly projectsService: ProjectsService
  ) {}

  async dashboard(): Promise<unknown> {
    const [projectCount, feedbackCount, contactCount, newContactCount, feedbackByStatus, contactsByStatus] = await Promise.all([
      this.projects.count({ where: { isPublished: true } }),
      this.feedback.count({ where: { status: FeedbackStatus.Public } }),
      this.contacts.count({ where: { status: Not(ContactStatus.Deleted) } }),
      this.contacts.count({ where: { status: ContactStatus.New } }),
      this.countFeedbackByStatus(),
      this.countContactsByStatus()
    ]);
    return { projectCount, feedbackCount, contactCount, newContactCount, feedbackByStatus, contactsByStatus };
  }

  async projectStats(projectId: string): Promise<unknown> {
    const [feedbackCount, contactCount, feedbackByDate, contactsByDate] = await Promise.all([
      this.feedback.count({ where: { projectId, status: FeedbackStatus.Public } }),
      this.contacts.count({ where: { projectId, status: Not(ContactStatus.Deleted) } }),
      this.countByDate(this.feedback, 'feedback', projectId),
      this.countByDate(this.contacts, 'contact', projectId)
    ]);
    return { projectId, feedbackCount, contactCount, feedbackByDate, contactsByDate };
  }

  async studentProjectStats(projectId: string, user: UserEntity): Promise<unknown> {
    await this.projectsService.assertMember(projectId, user);
    const [feedbackCount, feedbackByDate] = await Promise.all([
      this.feedback.count({ where: { projectId, status: FeedbackStatus.Public } }),
      this.countByDate(this.feedback, 'feedback', projectId)
    ]);
    return { projectId, feedbackCount, feedbackByDate };
  }

  async report(): Promise<unknown> {
    const projects = await this.projects.find({ where: { isPublished: true }, order: { createdAt: 'DESC' } });
    const projectStats = await Promise.all(projects.map((project) => this.projectStats(project.id)));
    return { generatedAt: new Date().toISOString(), projectStats };
  }

  private async countFeedbackByStatus(): Promise<Record<string, number>> {
    const rows = await this.feedback.createQueryBuilder('feedback').select('feedback.status', 'status').addSelect('COUNT(*)', 'count').groupBy('feedback.status').getRawMany<{ status: string; count: string }>();
    return Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
  }

  private async countContactsByStatus(): Promise<Record<string, number>> {
    const rows = await this.contacts.createQueryBuilder('contact').select('contact.status', 'status').addSelect('COUNT(*)', 'count').groupBy('contact.status').getRawMany<{ status: string; count: string }>();
    return Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
  }

  private async countByDate(repository: Repository<FeedbackEntity> | Repository<ContactEntity>, alias: string, projectId: string): Promise<Array<{ date: string; count: number }>> {
    const rows = await repository.createQueryBuilder(alias).select(`DATE(${alias}.createdAt)`, 'date').addSelect('COUNT(*)', 'count').where(`${alias}.projectId = :projectId`, { projectId }).groupBy('date').orderBy('date', 'ASC').getRawMany<{ date: string; count: string }>();
    return rows.map((row) => ({ date: row.date, count: Number(row.count) }));
  }
}
