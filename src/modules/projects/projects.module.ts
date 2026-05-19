import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactEntity, FeedbackEntity, ProjectEntity, ProjectMemberEntity } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity, ProjectMemberEntity, FeedbackEntity, ContactEntity]), AuthModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService]
})
export class ProjectsModule {}
