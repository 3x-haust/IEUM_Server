import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AgeGroup, VisitorType } from './enums';
import { FileEntity } from './file.entity';

@Entity('visitor_profiles')
export class VisitorProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'age_group', type: 'enum', enum: AgeGroup })
  ageGroup: AgeGroup;

  @Column({ name: 'visitor_type', type: 'enum', enum: VisitorType })
  visitorType: VisitorType;

  @Column({ name: 'business_card_file_id', type: 'uuid', nullable: true })
  businessCardFileId: string | null;

  @ManyToOne(() => FileEntity, { nullable: true })
  @JoinColumn({ name: 'business_card_file_id' })
  businessCardFile: FileEntity | null;

  @Column({ name: 'business_card_registered', default: false })
  businessCardRegistered: boolean;

  @Column({ name: 'ocr_raw_text', type: 'text', nullable: true })
  ocrRawText: string | null;

  @Column({ name: 'ocr_name', type: 'varchar', length: 100, nullable: true })
  ocrName: string | null;

  @Column({ name: 'ocr_organization', type: 'varchar', length: 150, nullable: true })
  ocrOrganization: string | null;

  @Column({ name: 'ocr_position', type: 'varchar', length: 100, nullable: true })
  ocrPosition: string | null;

  @Column({ name: 'ocr_email', type: 'varchar', length: 255, nullable: true })
  ocrEmail: string | null;

  @Column({ name: 'ocr_phone', type: 'varchar', length: 50, nullable: true })
  ocrPhone: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
