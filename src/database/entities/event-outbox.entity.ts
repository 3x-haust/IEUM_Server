import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { OutboxStatus } from './enums';

@Entity('event_outbox')
export class EventOutboxEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  topic: string;

  @Column({ name: 'event_key', type: 'varchar', length: 120, nullable: true })
  eventKey: string | null;

  @Column({ name: 'event_type', length: 120 })
  eventType: string;

  @Column({ name: 'aggregate_type', length: 80 })
  aggregateType: string;

  @Column({ name: 'aggregate_id', type: 'uuid', nullable: true })
  aggregateId: string | null;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'enum', enum: OutboxStatus, default: OutboxStatus.Pending })
  status: OutboxStatus;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
