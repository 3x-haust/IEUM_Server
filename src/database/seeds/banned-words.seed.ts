import { DataSource } from 'typeorm';
import { BannedWordEntity } from '../entities';
import { normalizeText } from '../../common/utils/text-normalizer';

export async function seedBannedWords(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(BannedWordEntity);
  for (const word of ['badword']) {
    const normalizedWord = normalizeText(word);
    const existing = await repository.findOne({ where: [{ word }, { normalizedWord }] });
    if (!existing) {
      await repository.save(repository.create({ word, normalizedWord, isActive: true }));
    }
  }
}
