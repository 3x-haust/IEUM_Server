import dataSource from '../data-source';
import { seedBannedWords } from './banned-words.seed';
import { seedProjects } from './projects.seed';

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    await seedProjects(dataSource);
    await seedBannedWords(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

void main();
