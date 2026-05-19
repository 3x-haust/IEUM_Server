import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AuditAction } from './enums';
import { UserEntity } from './user.entity';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actor: UserEntity | null;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ name: 'resource_type', length: 50 })
  resourceType: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
