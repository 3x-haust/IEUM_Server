import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RealtimeEventType, UserRole } from './enums';
import { ProjectEntity } from './project.entity';

@Entity('realtime_events')
export class RealtimeEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: RealtimeEventType })
  type: RealtimeEventType;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @ManyToOne(() => ProjectEntity, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity | null;

  @Column({ name: 'target_role', type: 'enum', enum: UserRole, nullable: true })
  targetRole: UserRole | null;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
