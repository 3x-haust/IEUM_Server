import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '@3xhaust/nest-response';
import { ApiWrappedCursorResponse, ApiWrappedResponse } from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserEntity, UserRole } from '../../database/entities';
import { MirimAuthGuard } from '../auth/mirim-auth.guard';
import { AdminProjectDetailResponseDto, AdminProjectSummaryResponseDto, ProjectDetailResponseDto, ProjectListQueryDto, ProjectSummaryResponseDto } from './projects.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('projects')
  @SuccessMessage('Fetched projects')
  @ApiWrappedCursorResponse(ProjectSummaryResponseDto, 'Public project list')
  listPublic(@Query() query: ProjectListQueryDto) {
    return this.projectsService.listPublic(query);
  }

  @Get('projects/:id')
  @SuccessMessage('Fetched project')
  @ApiWrappedResponse({ model: ProjectDetailResponseDto, description: 'Public project detail' })
  getPublic(@Param('id') id: string) {
    return this.projectsService.getPublic(id);
  }

  @Get('admin/projects')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched admin projects')
  @ApiWrappedCursorResponse(AdminProjectSummaryResponseDto, 'Admin project list')
  listAdmin(@Query() query: ProjectListQueryDto) {
    return this.projectsService.listAdmin(query);
  }

  @Get('admin/projects/:id')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched admin project')
  @ApiWrappedResponse({ model: AdminProjectDetailResponseDto, description: 'Admin project detail' })
  getAdmin(@Param('id') id: string) {
    return this.projectsService.getAdmin(id);
  }

  @Get('student/projects')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched student projects')
  @ApiWrappedResponse({ model: ProjectSummaryResponseDto, isArray: true, description: 'Projects owned by the current student' })
  listStudent(@CurrentUser() user: UserEntity) {
    return this.projectsService.listStudentProjects(user);
  }

  @Get('student/projects/:id')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched student project')
  @ApiWrappedResponse({ model: ProjectDetailResponseDto, description: 'Project detail for a project member' })
  getStudent(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.projectsService.getStudentProject(id, user);
  }
}
