import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventOutboxEntity, OutboxStatus, RealtimeEventType, UserRole } from '../../database/entities';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventOutboxEntity) private readonly outbox: Repository<EventOutboxEntity>,
    private readonly realtime: RealtimeService
  ) {}

  async publish(type: RealtimeEventType, projectId: string | null, targetRole: UserRole | null, payload: Record<string, unknown>, aggregateType: string, aggregateId: string | null): Promise<void> {
    await this.realtime.record(type, projectId, targetRole, payload);
    await this.outbox.query(
      'INSERT INTO event_outbox(topic, event_key, event_type, aggregate_type, aggregate_id, payload, status) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)',
      [this.topicFor(type), aggregateId, type, aggregateType, aggregateId, JSON.stringify(payload), OutboxStatus.Pending]
    );
  }

  private topicFor(type: RealtimeEventType): string {
    const topics: Record<RealtimeEventType, string> = {
      [RealtimeEventType.FeedbackCreated]: 'ieum.feedback.created.v1',
      [RealtimeEventType.FeedbackStatusChanged]: 'ieum.feedback.status-changed.v1',
      [RealtimeEventType.ContactCreated]: 'ieum.contact.created.v1',
      [RealtimeEventType.ContactStatusChanged]: 'ieum.contact.status-changed.v1',
      [RealtimeEventType.ProjectInterestCreated]: 'ieum.project-interest.created.v1',
      [RealtimeEventType.VisitorProfileCreated]: 'ieum.visitor-profile.created.v1',
      [RealtimeEventType.FileUploaded]: 'ieum.file.uploaded.v1',
      [RealtimeEventType.AuditCreated]: 'ieum.audit.created.v1'
    };
    return topics[type];
  }
}
