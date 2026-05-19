import { Controller, Get, Header, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '@3xhaust/nest-response';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FileAccessLevel, UserEntity, UserRole } from '../../database/entities';
import { MirimAuthGuard } from '../auth/mirim-auth.guard';
import { FilesService, UploadedFileInput } from './files.service';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('public/:id')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async getPublic(@Param('id') id: string) {
    return (await this.filesService.streamPublic(id)).stream;
  }

  @Post('admin/project-thumbnails')
  @ApiBearerAuth()
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @SuccessMessage('Uploaded project thumbnail')
  async uploadProjectThumbnail(@UploadedFile() file: UploadedFileInput, @CurrentUser() user: UserEntity) {
    return this.filesService.toResponse(await this.filesService.saveImage(file, FileAccessLevel.Public, user));
  }

  @Get('admin/private/:id')
  @ApiBearerAuth()
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  async getPrivate(@Param('id') id: string) {
    return (await this.filesService.streamPrivate(id)).stream;
  }
}
