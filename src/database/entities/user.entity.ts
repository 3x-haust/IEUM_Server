import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from './enums';
import { ProjectMemberEntity } from './project-member.entity';
import { FileEntity } from './file.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'oauth_provider', length: 50, default: 'mirim_oauth' })
  oauthProvider: string;

  @Column({ name: 'oauth_id', length: 100, unique: true })
  oauthId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255 })
  email: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.Student })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ProjectMemberEntity, (member) => member.user)
  memberships: ProjectMemberEntity[];

  @OneToMany(() => FileEntity, (file) => file.createdBy)
  files: FileEntity[];
}
