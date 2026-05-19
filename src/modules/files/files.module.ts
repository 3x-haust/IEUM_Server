import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity]), AuthModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService]
})
export class FilesModule {}
