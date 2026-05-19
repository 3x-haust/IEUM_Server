import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: unknown;
}

@Injectable()
export class MirimAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieToken = this.extractCookie(request, this.authService.cookieName);
    if (cookieToken) {
      request.user = await this.authService.verifySessionToken(cookieToken);
      return true;
    }
    const bearerToken = this.extractBearerToken(request);
    if (bearerToken) {
      request.user = await this.authService.verifyBearerToken(bearerToken);
      return true;
    }
    throw new UnauthorizedException('Authentication cookie is required');
  }

  private extractBearerToken(request: AuthenticatedRequest): string | null {
    const header = request.headers.authorization;
    const authorization = Array.isArray(header) ? header[0] : header;
    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }
    const token = authorization.slice('Bearer '.length).trim();
    return token || null;
  }

  private extractCookie(request: AuthenticatedRequest, name: string): string | null {
    const header = request.headers.cookie;
    const cookie = Array.isArray(header) ? header.join('; ') : header;
    if (!cookie) {
      return null;
    }
    for (const part of cookie.split(';')) {
      const [key, ...value] = part.trim().split('=');
      if (key === name) {
        return decodeURIComponent(value.join('='));
      }
    }
    return null;
  }
}
