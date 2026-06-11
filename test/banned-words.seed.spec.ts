import { buildSeedBannedWords } from '../src/database/seeds/banned-words.catalog';
import { normalizeText } from '../src/common/utils/text-normalizer';

describe('banned word seed catalog', () => {
  it('builds a large deduplicated catalog for production seeding', () => {
    const words = buildSeedBannedWords();
    const normalizedWords = new Set(words.map(normalizeText));

    expect(words.length).toBeGreaterThanOrEqual(800);
    expect(normalizedWords.size).toBe(words.length);
    expect(words).toEqual(expect.arrayContaining(['구려', '개구려', '개구려요']));
  });
});
