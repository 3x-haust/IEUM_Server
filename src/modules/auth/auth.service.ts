import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import type { CookieOptions } from 'express';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from '../../database/entities';
import { CacheService } from '../cache/cache.service';
import { JwtSessionPayload, MirimUserPayload, VerifiedUserPayload } from './auth.types';

interface AuthSession {
  token: string;
  user: UserEntity;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
    private readonly jwt: JwtService
  ) {}

  get cookieName(): string {
    return this.config.get<string>('AUTH_COOKIE_NAME', 'ieum_auth');
  }

  async loginWithMirimToken(token: string): Promise<AuthSession> {
    const payload = await this.verifyProviderToken(token);
    const user = await this.syncUser(payload);
    return { user, token: await this.signSessionToken(user) };
  }

  async verifySessionToken(token: string): Promise<UserEntity> {
    const payload = await this.jwt.verifyAsync<JwtSessionPayload>(token, { secret: this.jwtSecret() });
    if (payload.typ !== 'access' || !payload.sub) {
      throw new UnauthorizedException('Invalid authentication cookie');
    }
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Invalid authentication cookie');
    }
    return user;
  }

  async verifyBearerToken(token: string): Promise<UserEntity> {
    const payload = await this.verifyProviderToken(token);
    return this.syncUser(payload);
  }

  getCookieOptions(): CookieOptions {
    const sameSite = this.cookieSameSite();
    const secure = this.cookieSecure(sameSite);
    const domain = this.config.get<string>('AUTH_COOKIE_DOMAIN', '').trim();
    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: this.cookieMaxAgeSeconds() * 1000,
      ...(domain ? { domain } : {})
    };
  }

  getClearCookieOptions(): CookieOptions {
    const { maxAge: _, ...options } = this.getCookieOptions();
    return options;
  }

  async logout(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  private async signSessionToken(user: UserEntity): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, oauthId: user.oauthId, role: user.role, typ: 'access' } satisfies JwtSessionPayload,
      { secret: this.jwtSecret(), expiresIn: this.cookieMaxAgeSeconds() }
    );
  }

  private async syncUser(payload: VerifiedUserPayload): Promise<UserEntity> {
    const existing = await this.users.findOne({ where: { oauthId: payload.oauthId } });
    const user = this.users.create({
      ...(existing ?? {}),
      oauthProvider: 'mirim_oauth',
      oauthId: payload.oauthId,
      name: payload.name,
      email: payload.email,
      role: payload.role
    });
    return this.users.save(user);
  }

  private async verifyProviderToken(token: string): Promise<VerifiedUserPayload> {
    const cacheKey = this.tokenCacheKey(token);
    const cached = await this.cache.get<VerifiedUserPayload>(cacheKey);
    if (cached) {
      return cached;
    }
    const payload = await this.verifyTokenWithProvider(token);
    await this.cache.set(cacheKey, payload, Number(this.config.get<string>('TOKEN_CACHE_TTL_SECONDS', '300')));
    return payload;
  }

  private async verifyTokenWithProvider(token: string): Promise<VerifiedUserPayload> {
    if (this.config.get<string>('AUTH_DEV_TOKENS') === 'true' || this.config.get<string>('NODE_ENV') === 'test') {
      const devPayload = this.parseDevToken(token);
      if (devPayload) {
        return devPayload;
      }
    }
    const baseUrl = this.config.get<string>('MIRIM_OAUTH_BASE_URL', 'https://api-auth.mmhs.app').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/v1/oauth/verify-token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (!response.ok) {
      throw new UnauthorizedException('Invalid access token');
    }
    const body = await response.json() as { data?: unknown; user?: unknown } | MirimUserPayload;
    const mirimUser = this.extractMirimUser(body);
    if (!mirimUser?.id || !mirimUser.email) {
      throw new UnauthorizedException('Invalid access token payload');
    }
    return {
      oauthId: mirimUser.id,
      name: mirimUser.nickname ?? mirimUser.name ?? mirimUser.email,
      email: mirimUser.email,
      role: this.resolveRole(mirimUser.id, mirimUser.role)
    };
  }

  private parseDevToken(token: string): VerifiedUserPayload | null {
    if (!token.startsWith('dev:')) {
      return null;
    }
    const [, oauthId, role = UserRole.Student, name = oauthId, email = `${oauthId}@example.com`] = token.split(':');
    if (!oauthId) {
      return null;
    }
    const resolvedRole = Object.values(UserRole).includes(role as UserRole) ? role as UserRole : UserRole.Student;
    return { oauthId, name, email, role: resolvedRole };
  }

  private extractMirimUser(body: { data?: unknown; user?: unknown } | MirimUserPayload): MirimUserPayload | null {
    const candidates = [body, 'data' in body ? body.data : null, 'user' in body ? body.user : null];
    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'object' && 'id' in candidate) {
        return candidate as MirimUserPayload;
      }
    }
    return null;
  }

  private resolveRole(oauthId: string, providerRole?: string): UserRole {
    const admins = this.config.get<string>('ADMIN_MIRIM_OAUTH_IDS', '').split(',').map((id) => id.trim()).filter(Boolean);
    if (admins.includes(oauthId)) {
      return UserRole.Admin;
    }
    if (providerRole && ['teacher', '교사', '선생님', 'staff', 'admin_teacher'].includes(providerRole.toLowerCase())) {
      return UserRole.Teacher;
    }
    return UserRole.Student;
  }

  private tokenCacheKey(token: string): string {
    const env = this.config.get<string>('NODE_ENV', 'development');
    const hash = createHash('sha256').update(token).digest('hex');
    return `ieum:${env}:auth:token:${hash}`;
  }

  private jwtSecret(): string {
    const secret = this.config.get<string>('JWT_SECRET', '').trim();
    if (secret) {
      return secret;
    }
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new UnauthorizedException('JWT secret is not configured');
    }
    return 'ieum-development-secret';
  }

  private cookieMaxAgeSeconds(): number {
    const value = Number(this.config.get<string>('AUTH_COOKIE_MAX_AGE_SECONDS', String(60 * 60 * 24 * 7)));
    return Number.isFinite(value) && value > 0 ? value : 60 * 60 * 24 * 7;
  }

  private cookieSecure(sameSite: CookieOptions['sameSite']): boolean {
    if (sameSite === 'none') {
      return true;
    }
    const configured = this.config.get<string>('AUTH_COOKIE_SECURE');
    if (configured === 'true') {
      return true;
    }
    if (configured === 'false') {
      return false;
    }
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private cookieSameSite(): CookieOptions['sameSite'] {
    const value = this.config.get<string>('AUTH_COOKIE_SAMESITE', 'lax').toLowerCase();
    if (value === 'strict' || value === 'none') {
      return value;
    }
    return 'lax';
  }
}
