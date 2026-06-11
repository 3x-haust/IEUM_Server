import { Body, Controller, Get, Param, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '@3xhaust/nest-response';
import { memoryStorage } from 'multer';
import { ApiWrappedResponse } from '../../common/dto/api-response.dto';
import { UploadedFileInput } from '../files/files.service';
import { CreateVisitorProfileDto, VisitorProfileResetResponseDto, VisitorProfileResponseDto } from './visitor-profiles.dto';
import { VisitorProfilesService } from './visitor-profiles.service';

interface BusinessCardUploadFields {
  readonly businessCard?: readonly UploadedFileInput[];
  readonly businessCardFront?: readonly UploadedFileInput[];
  readonly businessCardBack?: readonly UploadedFileInput[];
}

@ApiTags('visitor-profiles')
@Controller('visitor-profiles')
export class VisitorProfilesController {
  constructor(private readonly visitorProfilesService: VisitorProfilesService) {}

  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'businessCard', maxCount: 1 },
    { name: 'businessCardFront', maxCount: 1 },
    { name: 'businessCardBack', maxCount: 1 }
  ], { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @SuccessMessage('Created visitor profile')
  @ApiWrappedResponse({ model: VisitorProfileResponseDto, description: 'Created visitor profile', status: 'created' })
  create(@Body() dto: CreateVisitorProfileDto, @UploadedFiles() files?: BusinessCardUploadFields) {
    return this.visitorProfilesService.create(dto, {
      front: files?.businessCardFront?.[0] ?? files?.businessCard?.[0],
      back: files?.businessCardBack?.[0]
    });
  }

  @Get(':id')
  @SuccessMessage('Found visitor profile')
  @ApiWrappedResponse({ model: VisitorProfileResponseDto, description: 'Visitor profile detail' })
  findOne(@Param('id') id: string) {
    return this.visitorProfilesService.findOne(id);
  }

  @Post(':id/reset')
  @SuccessMessage('Confirmed visitor profile reset')
  @ApiWrappedResponse({ model: VisitorProfileResetResponseDto, description: 'Client-side visitor profile reset instruction', status: 'created' })
  reset(@Param('id') id: string) {
    return { visitorProfileId: id, localStorageKey: 'ieum.visitorProfile', status: 'client_should_remove' };
  }
}
