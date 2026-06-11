import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { AuditLogEntity, BannedWordEntity, ContactEntity, EventOutboxEntity, FeedbackEntity, FileEntity, ProjectEntity, ProjectInterestEntity, ProjectMemberEntity, RealtimeEventEntity, UserEntity, VisitorProfileEntity } from './entities';
import { InitIeumSchema1710000000000 } from './migrations/1710000000000-init-ieum-schema';
import { AddProjectInterests1764000000000 } from './migrations/1764000000000-add-project-interests';
import { AddProjectMemberRoles1764800000000 } from './migrations/1764800000000-add-project-member-roles';
import { AddProjectCatalogFields1781000000000 } from './migrations/1781000000000-add-project-catalog-fields';
import { AddProjectFeedbackFlag1781100000000 } from './migrations/1781100000000-add-project-feedback-flag';
import { AddUserProfileImageUrl1781200000000 } from './migrations/1781200000000-add-user-profile-image-url';
import { AddBusinessCardBackFiles1781300000000 } from './migrations/1781300000000-add-business-card-back-files';

config();

const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false;
const poolMax = Number(process.env.DATABASE_POOL_MAX ?? '10');

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'ieum',
  ssl,
  entities: [AuditLogEntity, BannedWordEntity, ContactEntity, EventOutboxEntity, FeedbackEntity, FileEntity, ProjectEntity, ProjectInterestEntity, ProjectMemberEntity, RealtimeEventEntity, UserEntity, VisitorProfileEntity],
  migrations: [InitIeumSchema1710000000000, AddProjectInterests1764000000000, AddProjectMemberRoles1764800000000, AddProjectCatalogFields1781000000000, AddProjectFeedbackFlag1781100000000, AddUserProfileImageUrl1781200000000, AddBusinessCardBackFiles1781300000000],
  synchronize: false,
  extra: {
    max: poolMax,
    connectionTimeoutMillis: Number(process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS ?? '3000'),
    idleTimeoutMillis: Number(process.env.DATABASE_POOL_IDLE_TIMEOUT_MS ?? '30000')
  }
});
