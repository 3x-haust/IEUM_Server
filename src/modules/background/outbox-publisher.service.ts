import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Kafka, Producer } from 'kafkajs';
import { Repository } from 'typeorm';
import { EventOutboxEntity, OutboxStatus } from '../../database/entities';

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private producer: Producer | null = null;

  constructor(
    @InjectRepository(EventOutboxEntity) private readonly outbox: Repository<EventOutboxEntity>,
    private readonly config: ConfigService
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get<string>('KAFKA_ENABLED') !== 'true') {
      return;
    }
    const brokers = this.config.get<string>('KAFKA_BROKERS', 'localhost:9092').split(',').map((broker) => broker.trim()).filter(Boolean);
    this.producer = new Kafka({ clientId: 'ieum-api', brokers }).producer();
    await this.producer.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async publishPending(): Promise<void> {
    if (!this.producer) {
      return;
    }
    const events = await this.outbox.find({ where: { status: OutboxStatus.Pending }, order: { createdAt: 'ASC' }, take: 50 });
    for (const event of events) {
      try {
        await this.producer.send({ topic: event.topic, messages: [{ key: event.eventKey ?? event.id, value: JSON.stringify(event.payload) }] });
        event.status = OutboxStatus.Published;
        event.publishedAt = new Date();
        event.lastError = null;
      } catch (error) {
        event.retryCount += 1;
        event.lastError = error instanceof Error ? error.message : 'unknown_error';
        if (event.retryCount >= 5) {
          event.status = OutboxStatus.Failed;
        }
      }
      await this.outbox.save(event);
    }
  }
}
