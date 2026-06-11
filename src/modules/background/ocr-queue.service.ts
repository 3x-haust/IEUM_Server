import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue, Worker } from 'bullmq';
import { Repository } from 'typeorm';
import { ContactEntity, VisitorProfileEntity } from '../../database/entities';
import { OcrResult, OcrService } from './ocr.service';

type OcrJob = { visitorProfileId: string; storageKeys: readonly string[] };

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

  async enqueueVisitorProfile(visitorProfileId: string, storageKeys: readonly string[]): Promise<void> {
    if (storageKeys.length === 0) return;
    if (this.queue) {
      await this.queue.add('visitor-profile', { visitorProfileId, storageKeys }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
      return;
    }
    setImmediate(() => {
      void this.processVisitorProfile({ visitorProfileId, storageKeys });
    });
  }

  private async processVisitorProfile(job: OcrJob): Promise<void> {
    const results = await Promise.all(job.storageKeys.map((storageKey) => this.ocr.extract(storageKey)));
    const result = mergeOcrResults(results);
    const profile = await this.profiles.findOne({ where: { id: job.visitorProfileId } });
    const rawText = [profile?.ocrRawText, result.rawText].filter((value): value is string => Boolean(value)).join('\n');
    await this.profiles.update(job.visitorProfileId, {
      ocrRawText: rawText || null,
      ocrName: profile?.ocrName ?? result.name,
      ocrOrganization: profile?.ocrOrganization ?? result.organization,
      ocrPosition: profile?.ocrPosition ?? result.position,
      ocrEmail: profile?.ocrEmail ?? result.email,
      ocrPhone: profile?.ocrPhone ?? result.phone
    });
    const contacts = await this.contacts.find({ where: { visitorProfileId: job.visitorProfileId } });
    await Promise.all(contacts.map((contact) => this.contacts.update(contact.id, {
      ocrRawText: [contact.ocrRawText, result.rawText].filter((value): value is string => Boolean(value)).join('\n') || null,
      ocrName: contact.ocrName ?? result.name,
      ocrOrganization: contact.ocrOrganization ?? result.organization,
      ocrPosition: contact.ocrPosition ?? result.position,
      ocrEmail: contact.ocrEmail ?? result.email,
      ocrPhone: contact.ocrPhone ?? result.phone
    })));
  }
}

function mergeOcrResults(results: readonly OcrResult[]): OcrResult {
  const rawText = results.map((result) => result.rawText).filter((value): value is string => Boolean(value)).join('\n');
  const firstValue = (field: keyof OcrResult) =>
    results.map((result) => result[field]).find((value): value is string => typeof value === 'string' && value.length > 0) ?? null;
  return {
    rawText: rawText || null,
    name: firstValue('name'),
    organization: firstValue('organization'),
    position: firstValue('position'),
    email: firstValue('email'),
    phone: firstValue('phone')
  };
}
