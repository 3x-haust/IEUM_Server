import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CursorPage } from '../../common/dto/pagination.dto';
import { decodeCursor, encodeCursor } from '../../common/utils/cursor';
import { normalizeText } from '../../common/utils/text-normalizer';
import { AuditAction, BannedWordEntity, UserEntity } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { AhoCorasickMatcher } from './aho-corasick';
import { BannedWordListQueryDto, CreateBannedWordDto, UpdateBannedWordDto } from './banned-words.dto';

@Injectable()
export class BannedWordsService {
  private matcher: AhoCorasickMatcher | null = null;
  private matcherVersion = 0;

  constructor(
    @InjectRepository(BannedWordEntity) private readonly bannedWords: Repository<BannedWordEntity>,
    private readonly audit: AuditService
  ) {}

  async list(query: BannedWordListQueryDto): Promise<CursorPage<BannedWordEntity>> {
    const limit = query.limit ?? 20;
    const cursor = decodeCursor(query.cursor);
    const qb = this.bannedWords.createQueryBuilder('word').orderBy('word.createdAt', 'DESC').addOrderBy('word.id', 'DESC').take(limit + 1);
    if (query.search) {
      qb.andWhere('word.word ILIKE :search', { search: `%${query.search}%` });
    }
    if (cursor) {
      qb.andWhere('(word.createdAt, word.id) < (:date, :id)', { date: cursor.date, id: cursor.id });
    }
    const rows = await qb.getMany();
    const items = rows.slice(0, limit);
    const last = items.at(-1);
    return { items, nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null };
  }

  async create(dto: CreateBannedWordDto, actor: UserEntity): Promise<BannedWordEntity> {
    const normalizedWord = this.toNormalizedWord(dto.word);
    await this.ensureUnique(normalizedWord);
    const word = await this.bannedWords.save(this.bannedWords.create({ word: dto.word.trim(), normalizedWord, isActive: true }));
    this.invalidate();
    await this.audit.record(actor, AuditAction.BannedWordCreated, 'banned_word', word.id, { word: word.word });
    return word;
  }

  async update(id: string, dto: UpdateBannedWordDto, actor: UserEntity): Promise<BannedWordEntity> {
    const word = await this.findOne(id);
    if (dto.word !== undefined) {
      const normalizedWord = this.toNormalizedWord(dto.word);
      if (normalizedWord !== word.normalizedWord) {
        await this.ensureUnique(normalizedWord);
      }
      word.word = dto.word.trim();
      word.normalizedWord = normalizedWord;
    }
    if (dto.isActive !== undefined) {
      word.isActive = dto.isActive;
    }
    const saved = await this.bannedWords.save(word);
    this.invalidate();
    await this.audit.record(actor, AuditAction.BannedWordUpdated, 'banned_word', saved.id, { word: saved.word, isActive: saved.isActive });
    return saved;
  }

  async remove(id: string, actor: UserEntity): Promise<{ status: string }> {
    const word = await this.findOne(id);
    await this.bannedWords.remove(word);
    this.invalidate();
    await this.audit.record(actor, AuditAction.BannedWordDeleted, 'banned_word', id, { word: word.word });
    return { status: 'deleted' };
  }

  async findMatches(value: string): Promise<string[]> {
    if (!this.matcher) {
      await this.rebuildMatcher();
    }
    return this.matcher?.find(value) ?? [];
  }

  getVersion(): number {
    return this.matcherVersion;
  }

  private async findOne(id: string): Promise<BannedWordEntity> {
    const word = await this.bannedWords.findOne({ where: { id } });
    if (!word) {
      throw new NotFoundException('Banned word not found');
    }
    return word;
  }

  private async ensureUnique(normalizedWord: string): Promise<void> {
    const existing = await this.bannedWords.findOne({ where: { normalizedWord } });
    if (existing) {
      throw new ConflictException('Banned word already exists');
    }
  }

  private toNormalizedWord(word: string): string {
    const normalizedWord = normalizeText(word);
    if (!normalizedWord) {
      throw new BadRequestException('Banned word cannot be blank');
    }
    return normalizedWord;
  }

  private async rebuildMatcher(): Promise<void> {
    const words = await this.bannedWords.find({ where: { isActive: true } });
    this.matcher = new AhoCorasickMatcher(words.map((word) => word.normalizedWord));
  }

  private invalidate(): void {
    this.matcher = null;
    this.matcherVersion += 1;
  }
}
