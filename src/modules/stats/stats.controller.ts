import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '@3xhaust/nest-response';
import { ApiWrappedResponse } from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserEntity, UserRole } from '../../database/entities';
import { MirimAuthGuard } from '../auth/mirim-auth.guard';
import { DashboardStatsResponseDto, ProjectStatsResponseDto, ReportResponseDto, StudentProjectStatsResponseDto } from './stats.dto';
import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('admin/dashboard')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched dashboard')
  @ApiWrappedResponse({ model: DashboardStatsResponseDto, description: 'Admin dashboard stats' })
  dashboard() {
    return this.statsService.dashboard();
  }

  @Get('admin/reports')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched report')
  @ApiWrappedResponse({ model: ReportResponseDto, description: 'Admin report with per-project stats' })
  report() {
    return this.statsService.report();
  }

  @Get('admin/projects/:projectId/stats')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched project stats')
  @ApiWrappedResponse({ model: ProjectStatsResponseDto, description: 'Admin project stats' })
  projectStats(@Param('projectId') projectId: string) {
    return this.statsService.projectStats(projectId);
  }

  @Get('student/projects/:projectId/stats')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched student project stats')
  @ApiWrappedResponse({ model: StudentProjectStatsResponseDto, description: 'Student-visible project stats' })
  studentStats(@Param('projectId') projectId: string, @CurrentUser() user: UserEntity) {
    return this.statsService.studentProjectStats(projectId, user);
  }
}
