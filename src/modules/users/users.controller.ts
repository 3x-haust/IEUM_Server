import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '@3xhaust/nest-response';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities';
import { MirimAuthGuard } from '../auth/mirim-auth.guard';
import { UserListQueryDto } from './users.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiCookieAuth('ieum_auth')
@UseGuards(MirimAuthGuard, RolesGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.Teacher, UserRole.Admin)
  @SuccessMessage('Fetched users')
  list(@Query() query: UserListQueryDto) {
    return this.usersService.list(query);
  }
}
