import { Injectable, MessageEvent } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Observable, Subject, filter, map } from 'rxjs';
import { MoreThan, Repository } from 'typeorm';
import { RealtimeEventEntity, RealtimeEventType, UserRole } from '../../database/entities';

@Injectable()
export class RealtimeService {
  private readonly stream = new Subject<RealtimeEventEntity>();

  constructor(@InjectRepository(RealtimeEventEntity) private readonly events: Repository<RealtimeEventEntity>) {}

  async record(type: RealtimeEventType, projectId: string | null, targetRole: UserRole | null, payload: Record<string, unknown>): Promise<RealtimeEventEntity> {
    const event = this.events.create({ id: randomUUID(), type, projectId, targetRole, payload, createdAt: new Date() });
    await this.events.query(
      'INSERT INTO realtime_events(id, type, project_id, target_role, payload, created_at) VALUES ($1, $2, $3, $4, $5::jsonb, $6)',
      [event.id, type, projectId, targetRole, JSON.stringify(payload), event.createdAt]
    );
    this.stream.next(event);
    return event;
  }

  subscribe(role: UserRole): Observable<MessageEvent> {
    return this.stream.asObservable().pipe(
      filter((event) => !event.targetRole || event.targetRole === role || role === UserRole.Admin),
      map((event) => ({ id: event.id, type: event.type, data: event }))
    );
  }

  async recent(after?: string): Promise<RealtimeEventEntity[]> {
    return this.events.find({ where: after ? { id: MoreThan(after) } : {}, order: { createdAt: 'DESC' }, take: 100 });
  }
}
