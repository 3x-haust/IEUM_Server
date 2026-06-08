import dataSource from './data-source';
import { seedBannedWords } from './seeds/banned-words.seed';
import { seedProjects } from './seeds/projects.seed';

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
    await seedProjects(dataSource);
    await seedBannedWords(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

void main();
