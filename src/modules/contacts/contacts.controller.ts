import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '@3xhaust/nest-response';
import { ApiWrappedCursorResponse, ApiWrappedResponse } from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserEntity, UserRole } from '../../database/entities';
import { MirimAuthGuard } from '../auth/mirim-auth.guard';
import { ContactListQueryDto, ContactResponseDto, CreateContactDto, UpdateContactOcrDto, UpdateContactStatusDto } from './contacts.dto';
import { ContactsService } from './contacts.service';

@ApiTags('contacts')
@Controller()
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post('projects/:projectId/contacts')
  @SuccessMessage('Created contact')
  @ApiWrappedResponse({ model: ContactResponseDto, description: 'Created recruiter contact request', status: 'created' })
  create(@Param('projectId') projectId: string, @Body() dto: CreateContactDto, @Headers('x-forwarded-for') forwardedFor?: string, @Headers('user-agent') userAgent?: string) {
    return this.contactsService.create(projectId, dto, forwardedFor?.split(',')[0]?.trim(), userAgent);
  }

  @Get('admin/contacts')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched contacts')
  @ApiWrappedCursorResponse(ContactResponseDto, 'Admin contact list')
  list(@Query() query: ContactListQueryDto) {
    return this.contactsService.list(query);
  }

  @Get('admin/contacts/:id')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched contact')
  @ApiWrappedResponse({ model: ContactResponseDto, description: 'Admin contact detail' })
  detail(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.contactsService.getDetail(id, user);
  }

  @Patch('admin/contacts/:id/status')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Updated contact status')
  @ApiWrappedResponse({ model: ContactResponseDto, description: 'Updated contact status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateContactStatusDto, @CurrentUser() user: UserEntity) {
    return this.contactsService.updateStatus(id, dto, user);
  }

  @Patch('admin/contacts/:id/ocr')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Updated contact OCR')
  @ApiWrappedResponse({ model: ContactResponseDto, description: 'Updated contact OCR fields' })
  updateOcr(@Param('id') id: string, @Body() dto: UpdateContactOcrDto, @CurrentUser() user: UserEntity) {
    return this.contactsService.updateOcr(id, dto, user);
  }
}
