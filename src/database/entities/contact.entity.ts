import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AgeGroup, ContactStatus, VisitorType } from './enums';
import { ProjectEntity } from './project.entity';
import { VisitorProfileEntity } from './visitor-profile.entity';
import { UserEntity } from './user.entity';
import { FileEntity } from './file.entity';

@Entity('contacts')
@Index(['projectId', 'status', 'createdAt'])
@Index(['targetMemberUserId', 'createdAt'])
export class ContactEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => ProjectEntity, (project) => project.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Column({ name: 'visitor_profile_id', type: 'uuid' })
  visitorProfileId: string;

  @ManyToOne(() => VisitorProfileEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'visitor_profile_id' })
  visitorProfile: VisitorProfileEntity;

  @Column({ name: 'target_member_user_id', type: 'uuid' })
  targetMemberUserId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'target_member_user_id' })
  targetMemberUser: UserEntity;

  @Column({ name: 'age_group', type: 'enum', enum: AgeGroup })
  ageGroup: AgeGroup;

  @Column({ name: 'visitor_type', type: 'enum', enum: VisitorType })
  visitorType: VisitorType;

  @Column({ length: 100, nullable: true })
  name: string | null;

  @Column({ length: 150, nullable: true })
  organization: string | null;

  @Column({ length: 100, nullable: true })
  position: string | null;

  @Column({ length: 255, nullable: true })
  email: string | null;

  @Column({ length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @Column({ name: 'business_card_file_id', type: 'uuid', nullable: true })
  businessCardFileId: string | null;

  @ManyToOne(() => FileEntity, { nullable: true })
  @JoinColumn({ name: 'business_card_file_id' })
  businessCardFile: FileEntity | null;

  @Column({ name: 'ocr_raw_text', type: 'text', nullable: true })
  ocrRawText: string | null;

  @Column({ name: 'ocr_name', length: 100, nullable: true })
  ocrName: string | null;

  @Column({ name: 'ocr_organization', length: 150, nullable: true })
  ocrOrganization: string | null;

  @Column({ name: 'ocr_position', length: 100, nullable: true })
  ocrPosition: string | null;

  @Column({ name: 'ocr_email', length: 255, nullable: true })
  ocrEmail: string | null;

  @Column({ name: 'ocr_phone', length: 50, nullable: true })
  ocrPhone: string | null;

  @Column({ type: 'enum', enum: ContactStatus, default: ContactStatus.New })
  status: ContactStatus;

  @Column({ name: 'ip_hash', length: 255, nullable: true })
  ipHash: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
