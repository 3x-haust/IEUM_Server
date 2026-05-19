import { Body, Controller, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '@3xhaust/nest-response';
import { memoryStorage } from 'multer';
import { UploadedFileInput } from '../files/files.service';
import { CreateVisitorProfileDto } from './visitor-profiles.dto';
import { VisitorProfilesService } from './visitor-profiles.service';

@ApiTags('visitor-profiles')
@Controller('visitor-profiles')
export class VisitorProfilesController {
  constructor(private readonly visitorProfilesService: VisitorProfilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('businessCard', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @SuccessMessage('Created visitor profile')
  create(@Body() dto: CreateVisitorProfileDto, @UploadedFile() file?: UploadedFileInput) {
    return this.visitorProfilesService.create(dto, file);
  }

  @Post(':id/reset')
  @SuccessMessage('Confirmed visitor profile reset')
  reset(@Param('id') id: string) {
    return { visitorProfileId: id, localStorageKey: 'ieum.visitorProfile', status: 'client_should_remove' };
  }
}
