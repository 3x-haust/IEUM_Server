import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectInterestEntity } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { EventsModule } from '../events/events.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectInterestsController } from './project-interests.controller';
import { ProjectInterestsService } from './project-interests.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectInterestEntity]), AuthModule, ProjectsModule, CacheModule, EventsModule],
  controllers: [ProjectInterestsController],
  providers: [ProjectInterestsService],
  exports: [ProjectInterestsService]
})
export class ProjectInterestsModule {}
