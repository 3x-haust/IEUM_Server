import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { loadAppConfig } from './config/app.config';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BannedWordsModule } from './modules/banned-words/banned-words.module';
import { CacheModule } from './modules/cache/cache.module';
import { EventsModule } from './modules/events/events.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { FilesModule } from './modules/files/files.module';
import { HealthModule } from './modules/health/health.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadAppConfig] }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    DatabaseModule,
    CacheModule,
    AuthModule,
    AuditModule,
    EventsModule,
    RealtimeModule,
    UsersModule,
    FilesModule,
    ProjectsModule,
    BannedWordsModule,
    FeedbackModule,
    HealthModule
  ]
})
export class AppModule {}
