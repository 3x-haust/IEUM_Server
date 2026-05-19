import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RateLimitService } from './rate-limit.service';

@Module({
  providers: [CacheService, RateLimitService],
  exports: [CacheService, RateLimitService]
})
export class CacheModule {}
