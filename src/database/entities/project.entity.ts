import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { FileEntity } from './file.entity';
import { ProjectMemberEntity } from './project-member.entity';
import { FeedbackEntity } from './feedback.entity';
import { ContactEntity } from './contact.entity';

@Entity('projects')
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_name', length: 100 })
  serviceName: string;

  @Column({ name: 'team_name', length: 100 })
  teamName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'thumbnail_file_id', type: 'uuid', nullable: true })
  thumbnailFileId: string | null;

  @ManyToOne(() => FileEntity, { nullable: true })
  @JoinColumn({ name: 'thumbnail_file_id' })
  thumbnailFile: FileEntity | null;

  @Column({ name: 'development_stacks', type: 'text', array: true, default: () => "'{}'" })
  developmentStacks: string[];

  @Column({ name: 'design_stacks', type: 'text', array: true, default: () => "'{}'" })
  designStacks: string[];

  @Column({ name: 'is_published', default: true })
  isPublished: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => ProjectMemberEntity, (member) => member.project)
  members: ProjectMemberEntity[];

  @OneToMany(() => FeedbackEntity, (feedback) => feedback.project)
  feedback: FeedbackEntity[];

  @OneToMany(() => ContactEntity, (contact) => contact.project)
  contacts: ContactEntity[];
}
