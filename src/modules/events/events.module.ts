import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventOutboxEntity } from '../../database/entities';
import { RealtimeModule } from '../realtime/realtime.module';
import { EventsService } from './events.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventOutboxEntity]), RealtimeModule],
  providers: [EventsService],
  exports: [EventsService]
})
export class EventsModule {}
