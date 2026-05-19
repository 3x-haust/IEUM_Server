import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '@3xhaust/nest-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserEntity, UserRole } from '../../database/entities';
import { MirimAuthGuard } from '../auth/mirim-auth.guard';
import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('admin/dashboard')
  @ApiBearerAuth()
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched dashboard')
  dashboard() {
    return this.statsService.dashboard();
  }

  @Get('admin/reports')
  @ApiBearerAuth()
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched report')
  report() {
    return this.statsService.report();
  }

  @Get('admin/projects/:projectId/stats')
  @ApiBearerAuth()
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched project stats')
  projectStats(@Param('projectId') projectId: string) {
    return this.statsService.projectStats(projectId);
  }

  @Get('student/projects/:projectId/stats')
  @ApiBearerAuth()
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched student project stats')
  studentStats(@Param('projectId') projectId: string, @CurrentUser() user: UserEntity) {
    return this.statsService.studentProjectStats(projectId, user);
  }
}
