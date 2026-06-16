import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Kafka, Producer } from 'kafkajs';
import { Repository } from 'typeorm';
import { EventOutboxEntity, OutboxStatus } from '../../database/entities';

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private producer: Producer | null = null;
  private isPublishing = false;

  constructor(
    @InjectRepository(EventOutboxEntity) private readonly outbox: Repository<EventOutboxEntity>,
    private readonly config: ConfigService
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get<string>('KAFKA_ENABLED') !== 'true') {
      return;
    }
    const brokers = this.config.get<string>('KAFKA_BROKERS', 'localhost:9092').split(',').map((broker) => broker.trim()).filter(Boolean);
    this.producer = new Kafka({
      clientId: 'ieum-api',
      brokers,
      connectionTimeout: this.kafkaConnectionTimeoutMs(),
      requestTimeout: this.kafkaRequestTimeoutMs(),
      retry: { retries: this.kafkaRetryCount() }
    }).producer();
    try {
      await this.producer.connect();
    } catch (error: unknown) {
      this.logger.warn(`Kafka producer connect failed; outbox publishing disabled until restart: ${readErrorMessage(error)}`);
      this.producer = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async publishPending(): Promise<void> {
    if (!this.producer || this.isPublishing) {
      return;
    }
    this.isPublishing = true;
    try {
      const events = await this.outbox.find({ where: { status: OutboxStatus.Pending }, order: { createdAt: 'ASC' }, take: 50 });
      for (const event of events) {
        try {
          await this.producer.send({ topic: event.topic, messages: [{ key: event.eventKey ?? event.id, value: JSON.stringify(event.payload) }] });
          event.status = OutboxStatus.Published;
          event.publishedAt = new Date();
          event.lastError = null;
        } catch (error: unknown) {
          event.retryCount += 1;
          event.lastError = readErrorMessage(error);
          if (event.retryCount >= 5) {
            event.status = OutboxStatus.Failed;
          }
        }
        try {
          await this.outbox.save(event);
        } catch (error: unknown) {
          this.logger.warn(`Failed to update outbox event ${event.id}: ${readErrorMessage(error)}`);
        }
      }
    } catch (error: unknown) {
      this.logger.warn(`Failed to publish pending outbox events: ${readErrorMessage(error)}`);
    } finally {
      this.isPublishing = false;
    }
  }

  private kafkaConnectionTimeoutMs(): number {
    return Number(this.config.get<string>('KAFKA_CONNECTION_TIMEOUT_MS', '1000'));
  }

  private kafkaRequestTimeoutMs(): number {
    return Number(this.config.get<string>('KAFKA_REQUEST_TIMEOUT_MS', '2500'));
  }

  private kafkaRetryCount(): number {
    return Number(this.config.get<string>('KAFKA_RETRIES', '1'));
  }
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown_error';
}
