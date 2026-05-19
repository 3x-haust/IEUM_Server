import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue, Worker } from 'bullmq';
import { Repository } from 'typeorm';
import { ContactEntity, VisitorProfileEntity } from '../../database/entities';
import { OcrService } from './ocr.service';

type OcrJob = { visitorProfileId: string; storageKey: string };

@Injectable()
export class OcrQueueService implements OnModuleInit, OnModuleDestroy {
  private queue: Queue<OcrJob> | null = null;
  private worker: Worker<OcrJob> | null = null;

  constructor(
    @InjectRepository(VisitorProfileEntity) private readonly profiles: Repository<VisitorProfileEntity>,
    @InjectRepository(ContactEntity) private readonly contacts: Repository<ContactEntity>,
    private readonly ocr: OcrService,
    private readonly config: ConfigService
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get<string>('REDIS_ENABLED') !== 'true' || this.config.get<string>('OCR_QUEUE_ENABLED') !== 'true') {
      return;
    }
    const connection = { url: this.config.get<string>('REDIS_URL', 'redis://localhost:6379') };
    this.queue = new Queue<OcrJob>('ieum-ocr', { connection });
    this.worker = new Worker<OcrJob>('ieum-ocr', async (job) => this.processVisitorProfile(job.data), { connection });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueueVisitorProfile(visitorProfileId: string, storageKey: string): Promise<void> {
    if (this.queue) {
      await this.queue.add('visitor-profile', { visitorProfileId, storageKey }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
      return;
    }
    setImmediate(() => {
      void this.processVisitorProfile({ visitorProfileId, storageKey });
    });
  }

  private async processVisitorProfile(job: OcrJob): Promise<void> {
    const result = await this.ocr.extract(job.storageKey);
    await this.profiles.update(job.visitorProfileId, {
      ocrRawText: result.rawText,
      ocrName: result.name,
      ocrOrganization: result.organization,
      ocrPosition: result.position,
      ocrEmail: result.email,
      ocrPhone: result.phone
    });
    await this.contacts.update({ visitorProfileId: job.visitorProfileId }, {
      ocrRawText: result.rawText,
      ocrName: result.name,
      ocrOrganization: result.organization,
      ocrPosition: result.position,
      ocrEmail: result.email,
      ocrPhone: result.phone
    });
  }
}
