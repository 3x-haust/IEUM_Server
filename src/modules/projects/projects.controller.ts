import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '@3xhaust/nest-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserEntity, UserRole } from '../../database/entities';
import { MirimAuthGuard } from '../auth/mirim-auth.guard';
import { ProjectListQueryDto } from './projects.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('projects')
  @SuccessMessage('Fetched projects')
  listPublic(@Query() query: ProjectListQueryDto) {
    return this.projectsService.listPublic(query);
  }

  @Get('projects/:id')
  @SuccessMessage('Fetched project')
  getPublic(@Param('id') id: string) {
    return this.projectsService.getPublic(id);
  }

  @Get('admin/projects')
  @ApiBearerAuth()
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched admin projects')
  listAdmin(@Query() query: ProjectListQueryDto) {
    return this.projectsService.listAdmin(query);
  }

  @Get('admin/projects/:id')
  @ApiBearerAuth()
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched admin project')
  getAdmin(@Param('id') id: string) {
    return this.projectsService.getAdmin(id);
  }

  @Get('student/projects')
  @ApiBearerAuth()
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched student projects')
  listStudent(@CurrentUser() user: UserEntity) {
    return this.projectsService.listStudentProjects(user);
  }

  @Get('student/projects/:id')
  @ApiBearerAuth()
  @UseGuards(MirimAuthGuard, RolesGuard)
  @Roles(UserRole.Student, UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched student project')
  getStudent(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.projectsService.getStudentProject(id, user);
  }
}
