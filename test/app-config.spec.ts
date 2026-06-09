import { loadAppConfig } from '../src/config/app.config';

describe('loadAppConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CORS_ORIGINS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('allows the local admin Vite origin by default', () => {
    const config = loadAppConfig();

    expect(config.corsOrigins).toContain('http://localhost:5173');
    expect(config.corsOrigins).toContain('http://127.0.0.1:5173');
  });

  it('keeps configured origins and removes duplicates', () => {
    process.env.CORS_ORIGINS = 'https://ieum.mmhs.app, http://localhost:5173, https://ieum.mmhs.app';

    const config = loadAppConfig();

    expect(config.corsOrigins.filter((origin) => origin === 'https://ieum.mmhs.app')).toHaveLength(1);
    expect(config.corsOrigins).toContain('http://localhost:5173');
  });
});
