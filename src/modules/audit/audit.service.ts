import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction, AuditLogEntity, UserEntity } from '../../database/entities';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLogEntity) private readonly logs: Repository<AuditLogEntity>) {}

  async record(actor: UserEntity | null, action: AuditAction, resourceType: string, resourceId: string | null, metadata?: Record<string, unknown>): Promise<void> {
    await this.logs.query(
      'INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id, metadata) VALUES ($1, $2, $3, $4, $5::jsonb)',
      [actor?.id ?? null, action, resourceType, resourceId, metadata ? JSON.stringify(metadata) : null]
    );
  }
}
