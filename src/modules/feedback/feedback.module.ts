import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackEntity } from '../../database/entities';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { BannedWordsModule } from '../banned-words/banned-words.module';
import { CacheModule } from '../cache/cache.module';
import { EventsModule } from '../events/events.module';
import { ProjectsModule } from '../projects/projects.module';
import { VisitorProfilesModule } from '../visitor-profiles/visitor-profiles.module';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

@Module({
  imports: [TypeOrmModule.forFeature([FeedbackEntity]), AuthModule, ProjectsModule, BannedWordsModule, CacheModule, EventsModule, AuditModule, VisitorProfilesModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService]
})
export class FeedbackModule {}
