import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../database/entities';
import { CacheModule } from '../cache/cache.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MirimAuthGuard } from './mirim-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), CacheModule, HttpModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, MirimAuthGuard],
  exports: [AuthService, MirimAuthGuard]
})
export class AuthModule {}
