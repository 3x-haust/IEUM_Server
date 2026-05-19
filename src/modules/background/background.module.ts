import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactEntity, EventOutboxEntity, VisitorProfileEntity } from '../../database/entities';
import { OcrService } from './ocr.service';
import { OcrQueueService } from './ocr-queue.service';
import { OutboxPublisherService } from './outbox-publisher.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventOutboxEntity, VisitorProfileEntity, ContactEntity])],
  providers: [OcrService, OcrQueueService, OutboxPublisherService],
  exports: [OcrService, OcrQueueService, OutboxPublisherService]
})
export class BackgroundModule {}
