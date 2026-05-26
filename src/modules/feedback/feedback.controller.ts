import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '@3xhaust/nest-response';
import { ApiWrappedCursorResponse, ApiWrappedResponse } from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserEntity, UserRole } from '../../database/entities';
import { MirimAuthGuard } from '../auth/mirim-auth.guard';
import { CreateFeedbackDto, FeedbackListQueryDto, FeedbackResponseDto, UpdateFeedbackStatusDto } from './feedback.dto';
import { FeedbackService } from './feedback.service';

@ApiTags('feedback')
@Controller()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('projects/:projectId/feedback')
  @SuccessMessage('Created feedback')
  @ApiWrappedResponse({ model: FeedbackResponseDto, description: 'Created project feedback', status: 'created' })
  create(@Param('projectId') projectId: string, @Body() dto: CreateFeedbackDto, @Headers('x-forwarded-for') forwardedFor?: string, @Headers('user-agent') userAgent?: string) {
    return this.feedbackService.create(projectId, dto, forwardedFor?.split(',')[0]?.trim(), userAgent);
  }

  @Get('student/projects/:projectId/feedback')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched student feedback')
  @ApiWrappedCursorResponse(FeedbackResponseDto, 'Public feedback visible to project members')
  listStudent(@Param('projectId') projectId: string, @Query() query: FeedbackListQueryDto, @CurrentUser() user: UserEntity) {
    return this.feedbackService.listStudent(projectId, user, query);
  }

  @Get('admin/feedback')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched feedback')
  @ApiWrappedCursorResponse(FeedbackResponseDto, 'Admin feedback list')
  listAdmin(@Query() query: FeedbackListQueryDto) {
    return this.feedbackService.listAdmin(query);
  }

  @Patch('admin/feedback/:id/status')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Updated feedback status')
  @ApiWrappedResponse({ model: FeedbackResponseDto, description: 'Updated feedback moderation status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateFeedbackStatusDto, @CurrentUser() user: UserEntity) {
    return this.feedbackService.updateStatus(id, dto, user);
  }
}
