import { HttpService } from '@nestjs/axios';
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

interface ProviderHttpResponse {
  status: number;
  data: unknown;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
    private readonly http: HttpService,
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
    const options = this.getCookieOptions();
    delete options.maxAge;
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
    const response = await this.requestMirimTokenVerification(baseUrl, token);
    if (response.status < 200 || response.status >= 300) {
      throw new UnauthorizedException('Invalid access token');
    }
    const mirimUser = this.extractMirimUser(response.data) ?? await this.fetchMirimUserInfo(baseUrl, token);
    if (!mirimUser?.id || !mirimUser.email) {
      throw new UnauthorizedException('Invalid access token payload');
    }
    const oauthId = String(mirimUser.id);
    const role = this.resolveRole(oauthId, mirimUser.role);
    const grade = this.readGrade(mirimUser.grade);
    this.assertGraduationExhibitionAccess(role, grade);
    return {
      oauthId,
      name: mirimUser.nickname ?? mirimUser.name ?? mirimUser.email,
      email: mirimUser.email,
      role,
      grade
    };
  }

  private async requestMirimTokenVerification(baseUrl: string, token: string): Promise<ProviderHttpResponse> {
    try {
      return await this.http.axiosRef.post<unknown>(
        `${baseUrl}/api/v1/oauth/verify-token`,
        { token },
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          validateStatus: () => true
        }
      );
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private async fetchMirimUserInfo(baseUrl: string, token: string): Promise<MirimUserPayload | null> {
    const response = await this.requestMirimUserInfo(baseUrl, token);
    if (response.status < 200 || response.status >= 300) {
      throw new UnauthorizedException('Invalid access token');
    }
    return this.extractMirimUser(response.data);
  }

  private async requestMirimUserInfo(baseUrl: string, token: string): Promise<ProviderHttpResponse> {
    try {
      return await this.http.axiosRef.get<unknown>(
        `${baseUrl}/api/v1/user`,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          validateStatus: () => true
        }
      );
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
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
    return { oauthId, name, email, role: resolvedRole, grade: 3 };
  }

  private extractMirimUser(body: unknown): MirimUserPayload | null {
    const candidates = [body, this.readRecordField(body, 'data'), this.readRecordField(body, 'user')];
    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'object' && 'id' in candidate) {
        return candidate as MirimUserPayload;
      }
    }
    return null;
  }

  private readRecordField(value: unknown, key: string): unknown {
    if (!value || typeof value !== 'object' || !(key in value)) {
      return null;
    }
    return (value as Record<string, unknown>)[key];
  }

  private resolveRole(oauthId: string, providerRole?: string): UserRole {
    const admins = this.config.get<string>('ADMIN_MIRIM_OAUTH_IDS', '').split(',').map((id) => id.trim()).filter(Boolean);
    if (admins.includes(oauthId)) {
      return UserRole.Admin;
    }
    const teachers = this.config.get<string>('TEACHER_MIRIM_OAUTH_IDS', '').split(',').map((id) => id.trim()).filter(Boolean);
    if (teachers.includes(oauthId)) {
      return UserRole.Teacher;
    }
    if (providerRole && ['teacher', '교사', '선생님', 'staff', 'admin_teacher'].includes(providerRole.toLowerCase())) {
      return UserRole.Teacher;
    }
    return UserRole.Student;
  }

  private readGrade(value: string | number | undefined): number | null {
    if (typeof value === 'number' && Number.isInteger(value)) {
      return value;
    }
    if (typeof value !== 'string') {
      return null;
    }
    const match = value.match(/\d+/);
    if (!match) {
      return null;
    }
    const parsed = Number(match[0]);
    return Number.isInteger(parsed) ? parsed : null;
  }

  private assertGraduationExhibitionAccess(role: UserRole, grade: number | null): void {
    if (role !== UserRole.Student) {
      return;
    }
    if (grade === 3) {
      return;
    }
    throw new UnauthorizedException('Graduation exhibition access is limited to third-grade students');
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
