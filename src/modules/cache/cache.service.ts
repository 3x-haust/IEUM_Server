import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type CacheEntry = { value: string; expiresAt: number };

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly memory = new Map<string, CacheEntry>();
  private readonly redis: Redis | null;

  constructor(private readonly config: ConfigService) {
    this.redis = this.config.get<string>('REDIS_ENABLED') === 'true' ? new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'), { lazyConnect: true, maxRetriesPerRequest: 1 }) : null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      await this.ensureRedis();
      const raw = await this.redis.get(key);
      return raw ? JSON.parse(raw) as T : null;
    }
    const entry = this.memory.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (this.redis) {
      await this.ensureRedis();
      await this.redis.set(key, raw, 'EX', ttlSeconds);
      return;
    }
    this.memory.set(key, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async delete(key: string): Promise<void> {
    if (this.redis) {
      await this.ensureRedis();
      await this.redis.del(key);
      return;
    }
    this.memory.delete(key);
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    if (this.redis) {
      await this.ensureRedis();
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, ttlSeconds);
      }
      return current;
    }
    const entry = this.memory.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      this.memory.set(key, { value: JSON.stringify(1), expiresAt: Date.now() + ttlSeconds * 1000 });
      return 1;
    }
    const next = Number(JSON.parse(entry.value)) + 1;
    this.memory.set(key, { value: JSON.stringify(next), expiresAt: entry.expiresAt });
    return next;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  private async ensureRedis(): Promise<void> {
    if (this.redis && this.redis.status === 'wait') {
      await this.redis.connect();
    }
  }
}
