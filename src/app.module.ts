import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { loadAppConfig } from './config/app.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CacheModule } from './modules/cache/cache.module';
import { FilesModule } from './modules/files/files.module';
import { HealthModule } from './modules/health/health.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadAppConfig] }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    DatabaseModule,
    CacheModule,
    AuthModule,
    UsersModule,
    FilesModule,
    ProjectsModule,
    HealthModule
  ]
})
export class AppModule {}
