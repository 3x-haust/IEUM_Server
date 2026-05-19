import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';

@Injectable()
export class RateLimitService {
  constructor(private readonly cache: CacheService) {}

  async enforce(key: string, limit: number, ttlSeconds: number): Promise<void> {
    const count = await this.cache.increment(key, ttlSeconds);
    if (count > limit) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
