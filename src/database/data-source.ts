import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { AuditLogEntity, BannedWordEntity, ContactEntity, EventOutboxEntity, FeedbackEntity, FileEntity, ProjectEntity, ProjectMemberEntity, RealtimeEventEntity, UserEntity, VisitorProfileEntity } from './entities';
import { InitIeumSchema1710000000000 } from './migrations/1710000000000-init-ieum-schema';

config();

const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false;

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'ieum',
  ssl,
  entities: [AuditLogEntity, BannedWordEntity, ContactEntity, EventOutboxEntity, FeedbackEntity, FileEntity, ProjectEntity, ProjectMemberEntity, RealtimeEventEntity, UserEntity, VisitorProfileEntity],
  migrations: [InitIeumSchema1710000000000],
  synchronize: false
});
