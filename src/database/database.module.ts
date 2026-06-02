import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity, BannedWordEntity, ContactEntity, EventOutboxEntity, FeedbackEntity, FileEntity, ProjectEntity, ProjectInterestEntity, ProjectMemberEntity, RealtimeEventEntity, UserEntity, VisitorProfileEntity } from './entities';

export const databaseEntities = [AuditLogEntity, BannedWordEntity, ContactEntity, EventOutboxEntity, FeedbackEntity, FileEntity, ProjectEntity, ProjectInterestEntity, ProjectMemberEntity, RealtimeEventEntity, UserEntity, VisitorProfileEntity];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: Number(config.get<string>('DATABASE_PORT', '5432')),
        username: config.get<string>('DATABASE_USER', 'postgres'),
        password: config.get<string>('DATABASE_PASSWORD', 'postgres'),
        database: config.get<string>('DATABASE_NAME', 'ieum'),
        ssl: config.get<string>('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        entities: databaseEntities,
        autoLoadEntities: true,
        synchronize: config.get<string>('DATABASE_SYNCHRONIZE') === 'true',
        extra: {
          max: Number(config.get<string>('DATABASE_POOL_MAX', '10')),
          connectionTimeoutMillis: Number(config.get<string>('DATABASE_POOL_CONNECTION_TIMEOUT_MS', '3000')),
          idleTimeoutMillis: Number(config.get<string>('DATABASE_POOL_IDLE_TIMEOUT_MS', '30000'))
        }
      })
    })
  ]
})
export class DatabaseModule {}
