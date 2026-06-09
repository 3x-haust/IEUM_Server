import { Controller, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '@3xhaust/nest-response';
import { ApiWrappedResponse } from '../../common/dto/api-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities';
import { MirimAuthGuard } from '../auth/mirim-auth.guard';
import { ProjectInterestResponseDto } from './project-interests.dto';
import { ProjectInterestsService } from './project-interests.service';

@ApiTags('project-interests')
@Controller()
export class ProjectInterestsController {
  constructor(private readonly projectInterestsService: ProjectInterestsService) {}

  @Post('admin/projects/:projectId/interests')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Marked project interest')
  @ApiWrappedResponse({ model: ProjectInterestResponseDto, description: 'Project interest marker result', status: 'created' })
  create(@Param('projectId') projectId: string, @Headers('x-forwarded-for') forwardedFor?: string, @Headers('user-agent') userAgent?: string) {
    return this.projectInterestsService.create(projectId, forwardedFor?.split(',')[0]?.trim(), userAgent);
  }

  @Post('projects/:projectId/interests')
  @SuccessMessage('Marked project interest')
  @ApiWrappedResponse({ model: ProjectInterestResponseDto, description: 'Public project interest marker result', status: 'created' })
  createPublic(@Param('projectId') projectId: string, @Headers('x-forwarded-for') forwardedFor?: string, @Headers('user-agent') userAgent?: string) {
    return this.projectInterestsService.create(projectId, forwardedFor?.split(',')[0]?.trim(), userAgent);
  }
}
