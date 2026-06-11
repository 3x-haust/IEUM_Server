import { DataSource } from 'typeorm';
import { BannedWordEntity } from '../entities';
import { normalizeText } from '../../common/utils/text-normalizer';
import { buildSeedBannedWords } from './banned-words.catalog';

export const seedBannedWordsList = buildSeedBannedWords();

export async function seedBannedWords(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(BannedWordEntity);
  for (const word of seedBannedWordsList) {
    const normalizedWord = normalizeText(word);
    const existing = await repository.findOne({ where: [{ word }, { normalizedWord }] });
    if (!existing) {
      await repository.save(repository.create({ word, normalizedWord, isActive: true }));
    } else if (!existing.isActive) {
      existing.isActive = true;
      await repository.save(existing);
    }
  }
}
