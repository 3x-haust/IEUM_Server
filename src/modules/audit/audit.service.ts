import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction, AuditLogEntity, UserEntity } from '../../database/entities';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLogEntity) private readonly logs: Repository<AuditLogEntity>) {}

  async record(actor: UserEntity | null, action: AuditAction, resourceType: string, resourceId: string | null, metadata?: Record<string, unknown>): Promise<AuditLogEntity> {
    return this.logs.save(this.logs.create({ actorUserId: actor?.id ?? null, action, resourceType, resourceId, metadata: metadata ?? null }));
  }
}
