export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigins: string[];
  uploadDir: string;
  publicFileBaseUrl: string;
  adminMirimOauthIds: string[];
  mirimOauthBaseUrl: string;
  tokenCacheTtlSeconds: number;
  redisEnabled: boolean;
  redisUrl: string;
  kafkaEnabled: boolean;
  kafkaBrokers: string[];
  authDevTokens: boolean;
  jwtSecret: string;
  authCookieName: string;
  authCookieDomain: string;
  authCookieSecure: string;
  authCookieSameSite: string;
  authCookieMaxAgeSeconds: number;
}

export function loadAppConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean),
    uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
    publicFileBaseUrl: process.env.PUBLIC_FILE_BASE_URL ?? 'http://localhost:3000/files/public',
    adminMirimOauthIds: (process.env.ADMIN_MIRIM_OAUTH_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean),
    mirimOauthBaseUrl: process.env.MIRIM_OAUTH_BASE_URL ?? 'https://api-auth.mmhs.app',
    tokenCacheTtlSeconds: Number(process.env.TOKEN_CACHE_TTL_SECONDS ?? 300),
    redisEnabled: process.env.REDIS_ENABLED === 'true',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    kafkaEnabled: process.env.KAFKA_ENABLED === 'true',
    kafkaBrokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',').map((broker) => broker.trim()).filter(Boolean),
    authDevTokens: process.env.AUTH_DEV_TOKENS === 'true' || process.env.NODE_ENV === 'test',
    jwtSecret: process.env.JWT_SECRET ?? '',
    authCookieName: process.env.AUTH_COOKIE_NAME ?? 'ieum_auth',
    authCookieDomain: process.env.AUTH_COOKIE_DOMAIN ?? '',
    authCookieSecure: process.env.AUTH_COOKIE_SECURE ?? '',
    authCookieSameSite: process.env.AUTH_COOKIE_SAMESITE ?? 'lax',
    authCookieMaxAgeSeconds: Number(process.env.AUTH_COOKIE_MAX_AGE_SECONDS ?? 60 * 60 * 24 * 7)
  };
}
