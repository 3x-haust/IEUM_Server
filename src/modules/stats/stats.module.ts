import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactEntity, FeedbackEntity, ProjectEntity, ProjectInterestEntity } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { ProjectsModule } from '../projects/projects.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity, FeedbackEntity, ContactEntity, ProjectInterestEntity]), AuthModule, CacheModule, ProjectsModule],
  controllers: [StatsController],
  providers: [StatsService]
})
export class StatsModule {}
