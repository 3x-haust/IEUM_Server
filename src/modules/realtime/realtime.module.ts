import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RealtimeEventEntity } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [TypeOrmModule.forFeature([RealtimeEventEntity]), AuthModule],
  controllers: [RealtimeController],
  providers: [RealtimeService],
  exports: [RealtimeService]
})
export class RealtimeModule {}
