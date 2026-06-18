import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CursorPage } from '../../common/dto/pagination.dto';
import { decodeCursor, encodeCursor } from '../../common/utils/cursor';
import { ContactEntity, ContactStatus, FeedbackEntity, FeedbackStatus, ProjectEntity, ProjectInterestEntity, ProjectMemberEntity, UserEntity, UserRole } from '../../database/entities';
import { ProjectListQueryDto } from './projects.dto';

type ProjectCounts = {
  readonly feedbackCount: number;
  readonly contactCount: number;
  readonly interestCount: number;
};

type CountRow = {
  readonly projectId: string;
  readonly count: string;
};

const EMPTY_PROJECT_COUNTS: ProjectCounts = { feedbackCount: 0, contactCount: 0, interestCount: 0 };

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity) private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(ProjectMemberEntity) private readonly members: Repository<ProjectMemberEntity>,
    @InjectRepository(FeedbackEntity) private readonly feedback: Repository<FeedbackEntity>,
    @InjectRepository(ContactEntity) private readonly contacts: Repository<ContactEntity>,
    @InjectRepository(ProjectInterestEntity) private readonly interests: Repository<ProjectInterestEntity>
  ) {}

  async listPublic(query: ProjectListQueryDto): Promise<CursorPage<unknown>> {
    const page = await this.listBase(query, true);
    const counts =
      query.includeCounts !== false
        ? await this.countProjects(page.items.map((project) => project.id))
        : new Map<string, ProjectCounts>();
    return { items: page.items.map((project) => this.toSummary(project, false, counts.get(project.id))), nextCursor: page.nextCursor };
  }

  async listAdmin(query: ProjectListQueryDto): Promise<CursorPage<unknown>> {
    const page = await this.listBase(query, false);
    const counts = await this.countProjects(page.items.map((project) => project.id));
    return { items: page.items.map((project) => this.toSummary(project, true, counts.get(project.id))), nextCursor: page.nextCursor };
  }

  async listStudentProjects(user: UserEntity): Promise<unknown[]> {
    const rows = await this.members.createQueryBuilder('member')
      .leftJoinAndSelect('member.project', 'project')
      .leftJoinAndSelect('member.user', 'memberUser')
      .where(this.memberUserMatch(user))
      .orderBy('project.createdAt', 'DESC')
      .addOrderBy('member.displayOrder', 'ASC')
      .getMany();
    const projects = uniqueProjects(rows.map((row) => row.project).filter((project) => !project.deletedAt));
    const counts = await this.countProjects(projects.map((project) => project.id));
    return projects.map((project) => this.toSummary(project, false, counts.get(project.id)));
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
    const membershipExists = await this.members.createQueryBuilder('member')
      .leftJoin('member.user', 'memberUser')
      .where('member.projectId = :projectId', { projectId })
      .andWhere(this.memberUserMatch(user))
      .getExists();
    if (!membershipExists) {
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
        nested.where('project.serviceName ILIKE :search', { search: `%${query.search}%` }).orWhere('project.teamName ILIKE :search', { search: `%${query.search}%` }).orWhere('project.description ILIKE :search', { search: `%${query.search}%` }).orWhere('project.boothSlot ILIKE :search', { search: `%${query.search}%` });
      }));
    }
    if (query.category) {
      qb.andWhere('project.experienceCategory = :category', { category: query.category });
    }
    if (query.memberUserId) {
      qb.innerJoin('project.members', 'memberFilter', 'memberFilter.userId = :memberUserId', { memberUserId: query.memberUserId });
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

  private toSummary(project: ProjectEntity, includeHidden: boolean, counts: ProjectCounts = EMPTY_PROJECT_COUNTS): unknown {
    return {
      id: project.id,
      serviceName: project.serviceName,
      teamName: project.teamName,
      description: project.description,
      thumbnailUrl: project.thumbnailFile?.publicUrl ?? project.thumbnailPath,
      thumbnailPath: project.thumbnailPath,
      experienceCategory: project.experienceCategory,
      boothSlot: project.boothSlot,
      zone: project.boothSlot,
      developmentStacks: project.developmentStacks,
      designStacks: project.designStacks,
      stackGroups: project.stackGroups,
      featureDescriptions: project.featureDescriptions,
      acceptsFeedback: project.acceptsFeedback,
      isPublished: project.isPublished,
      feedbackCount: counts.feedbackCount,
      contactCount: counts.contactCount,
      ...(includeHidden ? { interestCount: counts.interestCount } : {}),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
  }

  private async toDetail(project: ProjectEntity, includeHidden: boolean): Promise<unknown> {
    const counts = await this.countProjects([project.id]);
    const summary = this.toSummary(project, includeHidden, counts.get(project.id));
    const members = (project.members ?? []).sort((a, b) => a.displayOrder - b.displayOrder).map((member) => ({ id: member.user.id, name: member.user.name, displayOrder: member.displayOrder, roles: member.roles }));
    return { ...summary as Record<string, unknown>, members };
  }

  private async countProjects(projectIds: string[]): Promise<Map<string, ProjectCounts>> {
    const counts = new Map(projectIds.map((projectId) => [projectId, { ...EMPTY_PROJECT_COUNTS }]));
    if (projectIds.length === 0) {
      return counts;
    }
    const [feedbackRows, contactRows, interestRows] = await Promise.all([
      this.feedback.createQueryBuilder('feedback')
        .select('feedback.projectId', 'projectId')
        .addSelect('COUNT(*)', 'count')
        .where('feedback.projectId IN (:...projectIds)', { projectIds })
        .andWhere('feedback.status = :status', { status: FeedbackStatus.Public })
        .groupBy('feedback.projectId')
        .getRawMany<CountRow>(),
      this.contacts.createQueryBuilder('contact')
        .select('contact.projectId', 'projectId')
        .addSelect('COUNT(*)', 'count')
        .where('contact.projectId IN (:...projectIds)', { projectIds })
        .andWhere('contact.status != :status', { status: ContactStatus.Deleted })
        .groupBy('contact.projectId')
        .getRawMany<CountRow>(),
      this.interests.createQueryBuilder('interest')
        .select('interest.projectId', 'projectId')
        .addSelect('COUNT(*)', 'count')
        .where('interest.projectId IN (:...projectIds)', { projectIds })
        .groupBy('interest.projectId')
        .getRawMany<CountRow>()
    ]);
    for (const row of feedbackRows) {
      const current = counts.get(row.projectId) ?? EMPTY_PROJECT_COUNTS;
      counts.set(row.projectId, { ...current, feedbackCount: Number(row.count) });
    }
    for (const row of contactRows) {
      const current = counts.get(row.projectId) ?? EMPTY_PROJECT_COUNTS;
      counts.set(row.projectId, { ...current, contactCount: Number(row.count) });
    }
    for (const row of interestRows) {
      const current = counts.get(row.projectId) ?? EMPTY_PROJECT_COUNTS;
      counts.set(row.projectId, { ...current, interestCount: Number(row.count) });
    }
    return counts;
  }

  private memberUserMatch(user: UserEntity): Brackets {
    const memberNames = studentNameCandidates(user.name);
    return new Brackets((nested) => {
      nested.where('member.userId = :userId', { userId: user.id });
      if (memberNames.length > 0) {
        nested.orWhere('memberUser.name IN (:...memberNames)', { memberNames });
      }
    });
  }
}

function uniqueProjects(projects: ProjectEntity[]): ProjectEntity[] {
  const seen = new Set<string>();
  return projects.filter((project) => {
    if (seen.has(project.id)) return false;
    seen.add(project.id);
    return true;
  });
}

function studentNameCandidates(name: string): string[] {
  const trimmed = name.trim();
  const withoutStudentNumber = trimmed.replace(/^\d{4}\s+/, '').trim();
  return [...new Set([trimmed, withoutStudentNumber].filter(Boolean))];
}
