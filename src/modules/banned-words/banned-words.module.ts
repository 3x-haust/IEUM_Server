import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannedWordEntity } from '../../database/entities';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { BannedWordsController } from './banned-words.controller';
import { BannedWordsService } from './banned-words.service';

@Module({
  imports: [TypeOrmModule.forFeature([BannedWordEntity]), AuthModule, AuditModule],
  controllers: [BannedWordsController],
  providers: [BannedWordsService],
  exports: [BannedWordsService]
})
export class BannedWordsModule {}
