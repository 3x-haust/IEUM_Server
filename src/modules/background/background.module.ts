import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactEntity, EventOutboxEntity, VisitorProfileEntity } from '../../database/entities';
import { HyphenVisionOcrService } from './hyphen-vision-ocr.service';
import { OcrService } from './ocr.service';
import { OcrQueueService } from './ocr-queue.service';
import { OutboxPublisherService } from './outbox-publisher.service';
import { TesseractOcrService } from './tesseract-ocr.service';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([EventOutboxEntity, VisitorProfileEntity, ContactEntity])],
  providers: [HyphenVisionOcrService, OcrService, OcrQueueService, OutboxPublisherService, TesseractOcrService],
  exports: [OcrService, OcrQueueService, OutboxPublisherService]
})
export class BackgroundModule {}
