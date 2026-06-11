import { DataSource } from 'typeorm';
import { BannedWordEntity } from '../entities';
import { normalizeText } from '../../common/utils/text-normalizer';

const bannedWords = [
  'badword',
  '구려',
  '구리다',
  '구림',
  '별로',
  '노잼',
  '최악',
  '엉망',
  '허접',
  '한심',
  '노답',
  '극혐',
  '역겨',
  '짜증',
  '망해',
  '망함',
  '망작',
  '쓰레기',
  '개판',
  '꺼져',
  '닥쳐',
  '멍청',
  '바보',
  '찐따',
  '재수없',
  '못생',
  '역겹',
  '혐오',
  '죽어',
  '죽여',
  '자살',
  '시발',
  '씨발',
  'ㅅㅂ',
  'ㅆㅂ',
  '병신',
  'ㅂㅅ',
  '지랄',
  'ㅈㄹ',
  '좆',
  'ㅈ같',
  '개같',
  '꺼지',
  '닥치',
  '썅',
  '미친',
  '미쳤',
  '개새',
  '새끼',
  'ㅅㄲ',
  '년',
  '놈',
  '년아',
  '놈아',
  '애미',
  '느금',
  '니엄',
  '꺼져라',
  '닥쳐라',
  '엿먹',
  'ㅗ',
  '개소리',
  '헛소리',
  '븅신',
  '등신',
  '꼴통',
  '무식',
  '못함',
  '구데기',
  '구더기',
  '역하다',
  '싫어',
  '꼴보기',
  '비호감',
  '망쳐',
  '망쳤',
  '처망',
  '개못',
  '개노잼',
  '개별로',
  '개최악'
] as const;

export async function seedBannedWords(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(BannedWordEntity);
  for (const word of bannedWords) {
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
