import dataSource from './data-source';
import { seedBannedWords } from './seeds/banned-words.seed';
import { seedProjects } from './seeds/projects.seed';

const DEFAULT_ATTEMPTS = 30;
const DEFAULT_DELAY_MS = 2000;

async function main(): Promise<void> {
  await initializeWithRetry();
  try {
    await dataSource.runMigrations();
    await seedProjects(dataSource);
    await seedBannedWords(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

async function initializeWithRetry(): Promise<void> {
  const attempts = Number(process.env.DATABASE_STARTUP_ATTEMPTS ?? DEFAULT_ATTEMPTS);
  const delayMs = Number(process.env.DATABASE_STARTUP_DELAY_MS ?? DEFAULT_DELAY_MS);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await dataSource.initialize();
      return;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await delay(delayMs);
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error('Database initialization failed');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

void main();
