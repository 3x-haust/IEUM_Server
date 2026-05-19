import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { FeedbackStatus } from './enums';
import { ProjectEntity } from './project.entity';

@Entity('feedback')
@Index(['projectId', 'status', 'createdAt'])
@Index(['status', 'createdAt'])
export class FeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => ProjectEntity, (project) => project.feedback, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: FeedbackStatus })
  status: FeedbackStatus;

  @Column({ name: 'moderation_reason', type: 'text', nullable: true })
  moderationReason: string | null;

  @Column({ name: 'ip_hash', type: 'varchar', length: 255, nullable: true })
  ipHash: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
