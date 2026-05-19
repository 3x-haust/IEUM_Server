import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorProfileEntity } from '../../database/entities';
import { BackgroundModule } from '../background/background.module';
import { EventsModule } from '../events/events.module';
import { FilesModule } from '../files/files.module';
import { VisitorProfilesController } from './visitor-profiles.controller';
import { VisitorProfilesService } from './visitor-profiles.service';

@Module({
  imports: [TypeOrmModule.forFeature([VisitorProfileEntity]), FilesModule, BackgroundModule, EventsModule],
  controllers: [VisitorProfilesController],
  providers: [VisitorProfilesService],
  exports: [VisitorProfilesService]
})
export class VisitorProfilesModule {}
