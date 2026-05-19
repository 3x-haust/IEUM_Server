import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Not, Repository } from 'typeorm';
import { CursorPage } from '../../common/dto/pagination.dto';
import { decodeCursor, encodeCursor } from '../../common/utils/cursor';
import { ContactEntity, ContactStatus, FeedbackEntity, FeedbackStatus, ProjectEntity, ProjectMemberEntity, UserEntity, UserRole } from '../../database/entities';
import { ProjectListQueryDto } from './projects.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity) private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(ProjectMemberEntity) private readonly members: Repository<ProjectMemberEntity>,
    @InjectRepository(FeedbackEntity) private readonly feedback: Repository<FeedbackEntity>,
    @InjectRepository(ContactEntity) private readonly contacts: Repository<ContactEntity>
  ) {}

  async listPublic(query: ProjectListQueryDto): Promise<CursorPage<unknown>> {
    const page = await this.listBase(query, true);
    return { items: await Promise.all(page.items.map((project) => this.toSummary(project, false))), nextCursor: page.nextCursor };
  }

  async listAdmin(query: ProjectListQueryDto): Promise<CursorPage<unknown>> {
    const page = await this.listBase(query, false);
    return { items: await Promise.all(page.items.map((project) => this.toSummary(project, true))), nextCursor: page.nextCursor };
  }

  async listStudentProjects(user: UserEntity): Promise<unknown[]> {
    const rows = await this.members.find({ where: { userId: user.id }, relations: { project: true }, order: { displayOrder: 'ASC' } });
    return Promise.all(rows.filter((row) => !row.project.deletedAt).map((row) => this.toSummary(row.project, false)));
  }

  async getPublic(id: string): Promise<unknown> {
    const project = await this.findProject(id, true);
    return this.toDetail(project, false);
  }

  async getAdmin(id: string): Promise<unknown> {
    const project = await this.findProject(id, false);
    return this.toDetail(project, true);
  }

  async getStudentProject(id: string, user: UserEntity): Promise<unknown> {
    await this.assertMember(id, user);
    return this.getPublic(id);
  }

  async assertMember(projectId: string, user: UserEntity): Promise<void> {
    if ([UserRole.Teacher, UserRole.Admin].includes(user.role)) {
      return;
    }
    const membership = await this.members.findOne({ where: { projectId, userId: user.id } });
    if (!membership) {
      throw new ForbiddenException('Project membership is required');
    }
  }

  async isProjectMember(projectId: string, userId: string): Promise<boolean> {
    return Boolean(await this.members.findOne({ where: { projectId, userId } }));
  }

  async findProject(id: string, publishedOnly: boolean): Promise<ProjectEntity> {
    const project = await this.projects.findOne({ where: { id }, relations: { thumbnailFile: true, members: { user: true } }, order: { members: { displayOrder: 'ASC' } } });
    if (!project || project.deletedAt || (publishedOnly && !project.isPublished)) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  private async listBase(query: ProjectListQueryDto, publishedOnly: boolean): Promise<CursorPage<ProjectEntity>> {
    const limit = query.limit ?? 20;
    const cursor = decodeCursor(query.cursor);
    const qb = this.projects.createQueryBuilder('project')
      .leftJoinAndSelect('project.thumbnailFile', 'thumbnailFile')
      .where('project.deletedAt IS NULL')
      .orderBy('project.createdAt', 'DESC')
      .addOrderBy('project.id', 'DESC')
      .take(limit + 1);
    if (publishedOnly) {
      qb.andWhere('project.isPublished = true');
    }
    if (query.search) {
      qb.andWhere(new Brackets((nested) => {
        nested.where('project.serviceName ILIKE :search', { search: `%${query.search}%` }).orWhere('project.teamName ILIKE :search', { search: `%${query.search}%` }).orWhere('project.description ILIKE :search', { search: `%${query.search}%` });
      }));
    }
    if (query.stack) {
      qb.andWhere('(:stack = ANY(project.developmentStacks) OR :stack = ANY(project.designStacks))', { stack: query.stack });
    }
    if (cursor) {
      qb.andWhere('(project.createdAt, project.id) < (:date, :id)', { date: cursor.date, id: cursor.id });
    }
    const rows = await qb.getMany();
    const items = rows.slice(0, limit);
    const last = items.at(-1);
    return { items, nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null };
  }

  private async toSummary(project: ProjectEntity, includeHidden: boolean): Promise<unknown> {
    const [feedbackCount, contactCount] = await Promise.all([
      this.feedback.count({ where: { projectId: project.id, status: FeedbackStatus.Public } }),
      this.contacts.count({ where: { projectId: project.id, status: includeHidden ? Not(ContactStatus.Deleted) : Not(ContactStatus.Deleted) } })
    ]);
    return {
      id: project.id,
      serviceName: project.serviceName,
      teamName: project.teamName,
      description: project.description,
      thumbnailUrl: project.thumbnailFile?.publicUrl ?? null,
      developmentStacks: project.developmentStacks,
      designStacks: project.designStacks,
      isPublished: project.isPublished,
      feedbackCount,
      contactCount,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
  }

  private async toDetail(project: ProjectEntity, includeHidden: boolean): Promise<unknown> {
    const summary = await this.toSummary(project, includeHidden);
    const members = (project.members ?? []).sort((a, b) => a.displayOrder - b.displayOrder).map((member) => ({ id: member.user.id, name: member.user.name, displayOrder: member.displayOrder }));
    return { ...summary as Record<string, unknown>, members };
  }
}
