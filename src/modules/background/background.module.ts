import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventOutboxEntity } from '../../database/entities';
import { OcrService } from './ocr.service';
import { OutboxPublisherService } from './outbox-publisher.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventOutboxEntity])],
  providers: [OcrService, OutboxPublisherService],
  exports: [OcrService, OutboxPublisherService]
})
export class BackgroundModule {}
