import { HttpException, Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(ProjectInterestsService.name);

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
      try {
        await this.rateLimit.enforce(`ratelimit:project-interest:${ipHash}`, 30, 60);
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        this.logger.warn(`Project interest rate limit check failed for ${projectId}: ${readErrorMessage(error)}`);
      }
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

    try {
      await this.events.publish(RealtimeEventType.ProjectInterestCreated, projectId, UserRole.Teacher, { interestId: created.id }, 'project_interest', created.id);
    } catch (error) {
      this.logger.warn(`Failed to publish project interest event for ${projectId}: ${readErrorMessage(error)}`);
    }
    return this.toResult(projectId, false);
  }

  async countProjectInterests(projectId: string): Promise<number> {
    return this.interests.count({ where: { projectId } });
  }

  private async toResult(projectId: string, alreadyInterested: boolean): Promise<ProjectInterestResult> {
    return { projectId, interestCount: await this.countProjectInterests(projectId), alreadyInterested };
  }

  private isUniqueViolation(error: unknown): boolean {
    return getDriverErrorCode(error) === '23505';
  }
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function getDriverErrorCode(error: unknown): string | undefined {
  if (error instanceof QueryFailedError) {
    return (error.driverError as { code?: string } | undefined)?.code;
  }
  if (typeof error !== 'object' || error === null || !('driverError' in error)) {
    return undefined;
  }
  const driverError = (error as { driverError?: unknown }).driverError;
  if (typeof driverError !== 'object' || driverError === null || !('code' in driverError)) {
    return undefined;
  }
  return typeof driverError.code === 'string' ? driverError.code : undefined;
}
