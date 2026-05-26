import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { hashIp } from '../../common/utils/ip-hash';
import { ProjectInterestEntity, RealtimeEventType, UserRole } from '../../database/entities';
import { RateLimitService } from '../cache/rate-limit.service';
import { EventsService } from '../events/events.service';
import { ProjectsService } from '../projects/projects.service';

export interface ProjectInterestResult {
  projectId: string;
  interestCount: number;
  alreadyInterested: boolean;
}

@Injectable()
export class ProjectInterestsService {
  constructor(
    @InjectRepository(ProjectInterestEntity) private readonly interests: Repository<ProjectInterestEntity>,
    private readonly projects: ProjectsService,
    private readonly rateLimit: RateLimitService,
    private readonly events: EventsService
  ) {}

  async create(projectId: string, ip: string | undefined, userAgent: string | undefined): Promise<ProjectInterestResult> {
    await this.projects.findProject(projectId, true);
    const ipHash = hashIp(ip);
    if (ipHash) {
      await this.rateLimit.enforce(`ratelimit:project-interest:${ipHash}`, 30, 60);
      const existing = await this.interests.findOne({ where: { projectId, ipHash } });
      if (existing) {
        return this.toResult(projectId, true);
      }
    }

    let created: ProjectInterestEntity | null = null;
    try {
      created = await this.interests.save(this.interests.create({ projectId, ipHash, userAgent: userAgent ?? null }));
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return this.toResult(projectId, true);
      }
      throw error;
    }

    await this.events.publish(RealtimeEventType.ProjectInterestCreated, projectId, UserRole.Teacher, { interestId: created.id }, 'project_interest', created.id);
    return this.toResult(projectId, false);
  }

  async countProjectInterests(projectId: string): Promise<number> {
    return this.interests.count({ where: { projectId } });
  }

  private async toResult(projectId: string, alreadyInterested: boolean): Promise<ProjectInterestResult> {
    return { projectId, interestCount: await this.countProjectInterests(projectId), alreadyInterested };
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof QueryFailedError && (error.driverError as { code?: string } | undefined)?.code === '23505';
  }
}
