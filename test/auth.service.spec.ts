jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('typeorm', () => {
  const decorator = () => () => undefined;
  return {
    Column: decorator,
    CreateDateColumn: decorator,
    DeleteDateColumn: decorator,
    Entity: decorator,
    Index: decorator,
    JoinColumn: decorator,
    ManyToOne: decorator,
    OneToMany: decorator,
    PrimaryGeneratedColumn: decorator,
    Unique: decorator,
    UpdateDateColumn: decorator,
  };
}, { virtual: true });

import { UnauthorizedException } from '@nestjs/common';
import type { HttpService } from '@nestjs/axios';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import { UserEntity, UserRole } from '../src/database/entities';
import type { CacheService } from '../src/modules/cache/cache.service';
import { AuthService } from '../src/modules/auth/auth.service';

let httpPost: jest.Mock = jest.fn();
let httpGet: jest.Mock = jest.fn();

describe('AuthService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('allows a third-grade Mirim student to log in', async () => {
    const service = createService();
    mockMirimVerifyToken({
      id: 'student-3',
      email: 'student3@e-mirim.hs.kr',
      nickname: '삼학년',
      role: 'student',
      grade: 3,
    });

    const user = await service.verifyBearerToken('provider-token');

    expect(user).toEqual(expect.objectContaining({
      oauthId: 'student-3',
      role: UserRole.Student,
    }));
  });

  it('rejects Mirim students below third grade', async () => {
    const service = createService();
    mockMirimVerifyToken({
      id: 'student-2',
      email: 'student2@e-mirim.hs.kr',
      nickname: '이학년',
      role: 'student',
      grade: 2,
    });

    await expect(service.verifyBearerToken('provider-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows teacher accounts without a student grade restriction', async () => {
    const service = createService();
    mockMirimVerifyToken({
      id: 'teacher-1',
      email: 'teacher@e-mirim.hs.kr',
      nickname: '선생님',
      role: 'teacher',
    });

    const user = await service.verifyBearerToken('provider-token');

    expect(user).toEqual(expect.objectContaining({
      oauthId: 'teacher-1',
      role: UserRole.Teacher,
    }));
  });

  it('promotes configured numeric Mirim OAuth ids to admin', async () => {
    const service = createService({ adminMirimOauthIds: '12' });
    mockMirimVerifyToken({
      id: 12,
      email: 's2424@e-mirim.hs.kr',
      nickname: '3xhaust',
      role: 'student',
      grade: 3,
    });

    const user = await service.verifyBearerToken('provider-token');

    expect(user).toEqual(expect.objectContaining({
      oauthId: '12',
      role: UserRole.Admin,
    }));
  });

  it('loads Mirim user info when token verification only confirms validity', async () => {
    const service = createService();
    httpPost.mockResolvedValue({
      status: 200,
      data: { status: 200, message: 'ok' },
    });
    httpGet.mockResolvedValue({
      status: 200,
      data: {
        status: 200,
        data: {
          id: 'teacher-from-user-endpoint',
          email: 'teacher-user@e-mirim.hs.kr',
          nickname: '유저조회',
          role: 'teacher',
        },
      },
    });

    const user = await service.verifyBearerToken('provider-token');

    expect(httpGet).toHaveBeenCalledWith(
      'https://api-auth.mmhs.app/api/v1/user',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer provider-token' }),
        validateStatus: expect.any(Function),
      })
    );
    expect(user).toEqual(expect.objectContaining({
      oauthId: 'teacher-from-user-endpoint',
      email: 'teacher-user@e-mirim.hs.kr',
      role: UserRole.Teacher,
    }));
  });

  it('maps Mirim OAuth transport failures to an authentication failure', async () => {
    const service = createService();
    httpPost.mockRejectedValue(new TypeError('fetch failed'));

    await expect(service.verifyBearerToken('provider-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function createService(options: { readonly adminMirimOauthIds?: string } = {}): AuthService {
  httpPost = jest.fn();
  httpGet = jest.fn();
  const users = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((user: Partial<UserEntity>) => ({ id: 'user-id', ...user })),
    save: jest.fn(async (user: UserEntity) => user),
  } as unknown as Repository<UserEntity>;
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        AUTH_DEV_TOKENS: 'false',
        NODE_ENV: 'development',
        MIRIM_OAUTH_BASE_URL: 'https://api-auth.mmhs.app',
        TOKEN_CACHE_TTL_SECONDS: '300',
        ADMIN_MIRIM_OAUTH_IDS: options.adminMirimOauthIds ?? '',
      };
      return values[key] ?? fallback;
    }),
  } as unknown as ConfigService;
  const cache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  } as unknown as CacheService;
  const http = {
    axiosRef: {
      post: httpPost,
      get: httpGet,
    },
  } as unknown as HttpService;
  const jwt = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  } as unknown as JwtService;

  return new AuthService(users, config, cache, http, jwt);
}

function mockMirimVerifyToken(user: Record<string, unknown>): void {
  httpPost.mockResolvedValue({
    status: 200,
    data: { data: user },
  });
}
