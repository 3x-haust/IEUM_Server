import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CursorPage } from '../../common/dto/pagination.dto';
import { normalizeText } from '../../common/utils/text-normalizer';
import { AuditAction, BannedWordEntity, UserEntity } from '../../database/entities';
import { seedBannedWordsList } from '../../database/seeds/banned-words.seed';
import { AuditService } from '../audit/audit.service';
import { AhoCorasickMatcher } from './aho-corasick';
import { BannedWordListQueryDto, CreateBannedWordDto, UpdateBannedWordDto } from './banned-words.dto';

@Injectable()
export class BannedWordsService {
  private matcher: AhoCorasickMatcher | null = null;
  private rebuildMatcherPromise: Promise<void> | null = null;
  private matcherVersion = 0;

  constructor(
    @InjectRepository(BannedWordEntity) private readonly bannedWords: Repository<BannedWordEntity>,
    private readonly audit: AuditService
  ) {}

  async list(query: BannedWordListQueryDto): Promise<CursorPage<BannedWordEntity>> {
    const limit = query.limit ?? 20;
    const offset = query.page ? (query.page - 1) * limit : decodeOffsetCursor(query.cursor);
    const qb = this.bannedWords.createQueryBuilder('word');
    if (query.search) {
      qb.andWhere('word.word ILIKE :search', { search: `%${query.search}%` });
    }
    const [total, activeTotal] = await Promise.all([
      qb.clone().getCount(),
      qb.clone().andWhere('word.isActive = :isActive', { isActive: true }).getCount()
    ]);
    const rows = await qb.orderBy('word.word', 'ASC').addOrderBy('word.id', 'ASC').skip(offset).take(limit + 1).getMany();
    const items = rows.slice(0, limit);
    return {
      items,
      nextCursor: rows.length > limit ? encodeOffsetCursor(offset + limit) : null,
      total,
      activeTotal,
      inactiveTotal: total - activeTotal
    };
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
    await this.ensureMatcher();
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

  private async ensureMatcher(): Promise<void> {
    if (this.matcher) {
      return;
    }
    if (!this.rebuildMatcherPromise) {
      const version = this.matcherVersion;
      const rebuild = this.rebuildMatcher(version);
      const tracked = rebuild.finally(() => {
        if (this.rebuildMatcherPromise === tracked) {
          this.rebuildMatcherPromise = null;
        }
      });
      this.rebuildMatcherPromise = tracked;
    }
    await this.rebuildMatcherPromise;
    if (!this.matcher) {
      await this.ensureMatcher();
    }
  }

  private async rebuildMatcher(version: number): Promise<void> {
    const words = await this.bannedWords.find({ where: { isActive: true } });
    const matcher = new AhoCorasickMatcher(
      words.length > 0
        ? words.map((word) => word.normalizedWord)
        : [...seedBannedWordsList],
    );
    if (version === this.matcherVersion) {
      this.matcher = matcher;
    }
  }

  private invalidate(): void {
    this.matcher = null;
    this.rebuildMatcherPromise = null;
    this.matcherVersion += 1;
  }
}

function encodeOffsetCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset }), 'utf8').toString('base64url');
}

function decodeOffsetCursor(cursor?: string): number {
  if (!cursor) {
    return 0;
  }
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { offset?: unknown };
    if (typeof parsed.offset !== 'number' || !Number.isInteger(parsed.offset) || parsed.offset < 1) {
      return 0;
    }
    return parsed.offset;
  } catch {
    return 0;
  }
}
