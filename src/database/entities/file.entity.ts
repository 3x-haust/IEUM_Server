import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FileAccessLevel } from './enums';
import { UserEntity } from './user.entity';

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'original_name', length: 255 })
  originalName: string;

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ name: 'storage_key', type: 'text' })
  storageKey: string;

  @Column({ name: 'public_url', type: 'text', nullable: true })
  publicUrl: string | null;

  @Column({ name: 'access_level', type: 'enum', enum: FileAccessLevel, default: FileAccessLevel.Private })
  accessLevel: FileAccessLevel;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => UserEntity, (user) => user.files, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: UserEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
