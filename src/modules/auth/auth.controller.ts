import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '@3xhaust/nest-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities';
import { AuthService } from './auth.service';
import { MirimAuthGuard } from './mirim-auth.guard';

@ApiTags('auth')
@ApiBearerAuth()
@UseGuards(MirimAuthGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @SuccessMessage('Fetched current user')
  @ApiOkResponse({ description: 'Current authenticated user' })
  getMe(@CurrentUser() user: UserEntity): UserEntity {
    return user;
  }

  @Post('logout')
  @SuccessMessage('Logged out')
  logout(): Promise<{ status: string }> {
    return this.authService.logout();
  }
}
