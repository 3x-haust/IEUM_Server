import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SuccessMessage } from '@3xhaust/nest-response';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities';
import { LoginWithMirimTokenDto } from './auth.dto';
import { AuthService } from './auth.service';
import { MirimAuthGuard } from './mirim-auth.guard';

interface LoginResponse {
  readonly user: UserEntity;
  readonly token: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @SuccessMessage('Logged in')
  @ApiOkResponse({ description: 'Authenticated user' })
  async login(@Body() body: LoginWithMirimTokenDto, @Res({ passthrough: true }) response: Response): Promise<LoginResponse> {
    const session = await this.authService.loginWithMirimToken(body.accessToken);
    response.cookie(this.authService.cookieName, session.token, this.authService.getCookieOptions());
    return session;
  }

  @Get('me')
  @ApiCookieAuth('ieum_auth')
  @UseGuards(MirimAuthGuard)
  @SuccessMessage('Fetched current user')
  @ApiOkResponse({ description: 'Current authenticated user' })
  getMe(@CurrentUser() user: UserEntity): UserEntity {
    return user;
  }

  @Post('logout')
  @ApiCookieAuth('ieum_auth')
  @SuccessMessage('Logged out')
  async logout(@Res({ passthrough: true }) response: Response): Promise<{ status: string }> {
    response.clearCookie(this.authService.cookieName, this.authService.getClearCookieOptions());
    return this.authService.logout();
  }
}
