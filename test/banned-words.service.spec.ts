jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined
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
    UpdateDateColumn: decorator
  };
}, { virtual: true });

import { BannedWordsService } from '../src/modules/banned-words/banned-words.service';

describe('BannedWordsService', () => {
  it('shares one matcher rebuild across concurrent cold lookups', async () => {
    const bannedWords = {
      find: jest.fn().mockResolvedValue([{ normalizedWord: 'badword' }])
    };
    const service = new BannedWordsService(bannedWords as never, {} as never);

    const [left, right] = await Promise.all([
      service.findMatches('badword message'),
      service.findMatches('another badword message')
    ]);

    expect(bannedWords.find).toHaveBeenCalledTimes(1);
    expect(left).toEqual(['badword']);
    expect(right).toEqual(['badword']);
  });

  it('falls back to the built-in catalog when database words are empty', async () => {
    const bannedWords = {
      find: jest.fn().mockResolvedValue([])
    };
    const service = new BannedWordsService(bannedWords as never, {} as never);

    await expect(service.findMatches('씨발 같은 말')).resolves.toContain('씨발');
  });
});
