import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactEntity, FeedbackEntity, ProjectEntity } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity, FeedbackEntity, ContactEntity]), AuthModule, ProjectsModule],
  controllers: [StatsController],
  providers: [StatsService]
})
export class StatsModule {}
