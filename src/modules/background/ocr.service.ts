import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import sharp from 'sharp';
import { createWorker, PSM, Worker } from 'tesseract.js';

export interface OcrResult {
  rawText: string | null;
  name: string | null;
  organization: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
}

const MAX_OCR_WORKERS = 2;

@Injectable()
export class OcrService implements OnModuleDestroy {
  private createdWorkerCount = 0;
  private readonly idleWorkers: Worker[] = [];
  private readonly allWorkers: Worker[] = [];
  private readonly waiters: ((worker: Worker) => void)[] = [];

  constructor(private readonly config: ConfigService) {}

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.allWorkers.map((worker) => worker.terminate().catch(() => undefined)));
  }

  async extract(storageKey: string): Promise<OcrResult> {
    if (this.config.get<string>('OCR_ENABLED', 'true') === 'false') {
      return this.empty();
    }
    try {
      const uploadRoot = this.config.get<string>('UPLOAD_DIR', 'uploads');
      const imagePath = resolve(process.cwd(), uploadRoot, storageKey);
      const rawText = await this.recognizeBusinessCardVariants(imagePath);
      return this.parse(rawText);
    } catch {
      return this.empty();
    }
  }

  private async recognizeBusinessCardVariants(imagePath: string): Promise<string> {
    const tempDir = await mkdtemp(join(tmpdir(), 'ieum-ocr-'));
    try {
      const variantPaths = await createOcrImageVariants(imagePath, tempDir);
      const worker = await this.acquireWorker();
      try {
        const texts: string[] = [];
        for (const variantPath of variantPaths) {
          const result = await worker.recognize(variantPath, { rotateAuto: true });
          texts.push(result.data.text);
          const merged = mergeRawTexts(texts);
          if (this.hasCompleteCardFields(merged)) {
            return merged;
          }
        }
        return mergeRawTexts(texts);
      } finally {
        this.releaseWorker(worker);
      }
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  }

  private hasCompleteCardFields(rawText: string): boolean {
    const parsed = this.parse(rawText);
    return Boolean(parsed.name && parsed.email && parsed.phone);
  }

  private async acquireWorker(): Promise<Worker> {
    const idle = this.idleWorkers.pop();
    if (idle) return idle;
    if (this.createdWorkerCount < MAX_OCR_WORKERS) {
      this.createdWorkerCount += 1;
      try {
        const worker = await createWorker('eng+kor');
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          preserve_interword_spaces: '1',
          user_defined_dpi: '300'
        });
        this.allWorkers.push(worker);
        return worker;
      } catch (error) {
        this.createdWorkerCount -= 1;
        throw error;
      }
    }
    return new Promise<Worker>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  private releaseWorker(worker: Worker): void {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(worker);
      return;
    }
    this.idleWorkers.push(worker);
  }

  parse(rawText: string): OcrResult {
    const lines = normalizeOcrLines(rawText);
    const email = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
    const phone = rawText.match(/(?:\+?82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}|\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}/)?.[0] ?? null;
    const organization = findOrganization(lines);
    const position = lines.find((line) => isPositionLine(line)) ?? null;
    return {
      rawText,
      name: findName(lines, organization, position, email, phone),
      organization,
      position,
      email,
      phone
    };
  }

  private empty(): OcrResult {
    return { rawText: null, name: null, organization: null, position: null, email: null, phone: null };
  }
}

async function createOcrImageVariants(imagePath: string, tempDir: string): Promise<string[]> {
  const metadata = await sharp(imagePath, { failOn: 'none' }).metadata();
  const sourceWidth = metadata.width ?? 0;
  const resizeWidth = Math.round(Math.min(Math.max(sourceWidth * 2.4, 1600), 2400));
  const base = () =>
    sharp(imagePath, { failOn: 'none' })
      .rotate()
      .resize({ width: resizeWidth, withoutEnlargement: false })
      .grayscale()
      .normalize()
      .median(1)
      .sharpen({ sigma: 1.15, m1: 1.55, m2: 2.35 });

  const enhancedPath = join(tempDir, `${randomUUID()}-enhanced.png`);
  const highContrastPath = join(tempDir, `${randomUUID()}-contrast.png`);
  const darkTextBinaryPath = join(tempDir, `${randomUUID()}-dark-text.png`);
  const lightTextBinaryPath = join(tempDir, `${randomUUID()}-light-text.png`);

  await Promise.all([
    base().png().toFile(enhancedPath),
    base().linear(1.45, -28).png().toFile(highContrastPath),
    base().linear(1.35, -18).threshold(156).png().toFile(darkTextBinaryPath),
    base().negate().linear(1.35, -18).threshold(156).png().toFile(lightTextBinaryPath)
  ]);
  // 인식 성공률이 높은 순서로 정렬 — 핵심 필드가 모이면 뒤 변형은 건너뛴다
  return [enhancedPath, highContrastPath, darkTextBinaryPath, lightTextBinaryPath];
}

function mergeRawTexts(texts: readonly string[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const text of texts) {
    for (const line of text.split(/\r?\n/)) {
      const normalized = line.trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      lines.push(normalized);
    }
  }
  return lines.join('\n');
}

const ORGANIZATION_PATTERN = /(주식회사|회사|학교|기관|corp|inc|ltd|company|studio|labs?|group|hyphen)/i;
const POSITION_PATTERN = /(대표|매니저|팀장|개발자|디자이너|기획자|designer|manager|engineer|ceo|cto|lead|director|founder)/i;

function normalizeOcrLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => normalizeOcrLine(line))
    .filter((line): line is string => Boolean(line))
    .filter((line) => !isNoiseLine(line));
}

function normalizeOcrLine(line: string): string | null {
  const stripped = line
    .replace(/[|｜]/g, ' ')
    .replace(/[^\w@.+\-\s가-힣]/g, ' ')
    .replace(/\b\d+\s*개\b/g, ' ')
    .replace(/\b[A-Z]{1,2}\s*개\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!stripped) return null;

  const trailingBrand = stripped.match(/(?:^| )([A-Z][A-Za-z][A-Za-z-]*(?:\s+[A-Z][A-Za-z][A-Za-z-]*)?)$/);
  if (trailingBrand?.[1] && stripped !== trailingBrand[1] && !looksLikePersonName(stripped)) {
    return trailingBrand[1];
  }
  return stripped;
}

function isNoiseLine(line: string): boolean {
  if (line.length <= 1) return true;
  if (/^[A-Z]{1,2}$/i.test(line)) return true;
  if (/^[A-Z]\s+\d+$/i.test(line)) return true;
  if (/^\d+$/.test(line)) return true;
  return false;
}

function findOrganization(lines: readonly string[]): string | null {
  const explicit = lines.find((line) => ORGANIZATION_PATTERN.test(line));
  if (explicit) return stripOrganizationNoise(explicit);

  const counts = new Map<string, number>();
  for (const line of lines) {
    if (!looksLikeBrandName(line)) continue;
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  const repeated = [...counts.entries()].find(([, count]) => count > 1)?.[0];
  if (repeated) return repeated;

  return lines.find((line) => looksLikeBrandName(line) && !looksLikePersonName(line)) ?? null;
}

function stripOrganizationNoise(line: string): string {
  const matchedBrand = line.match(/([A-Z][A-Za-z][A-Za-z-]*(?:\s+[A-Z][A-Za-z][A-Za-z-]*)?)$/);
  if (matchedBrand?.[1] && !/^(corp|inc|ltd|company|group|labs?|studio)$/i.test(matchedBrand[1])) {
    return matchedBrand[1];
  }
  return line;
}

function findName(
  lines: readonly string[],
  organization: string | null,
  position: string | null,
  email: string | null,
  phone: string | null,
): string | null {
  const candidates = lines
    .filter((line) => line !== organization && line !== position)
    .filter((line) => line !== email && line !== phone)
    .filter((line) => !ORGANIZATION_PATTERN.test(line))
    .map((line) => sanitizeNameCandidate(line))
    .filter((line): line is string => Boolean(line))
    .filter((line) => looksLikePersonName(line));

  if (candidates.length >= 2 && isLatinName(candidates[0]) && isLatinName(candidates[1])) {
    return `${candidates[0]} ${candidates[1]}`;
  }
  return candidates[0] ?? null;
}

function sanitizeNameCandidate(line: string): string | null {
  const tokens = line.split(/\s+/).filter(Boolean);
  const cleaned = tokens.filter((token) => !/^[A-Z]$/i.test(token) && !/^\d+$/.test(token));
  const normalized = cleaned.join(' ').trim();
  return normalized || null;
}

function isPositionLine(line: string): boolean {
  return POSITION_PATTERN.test(line);
}

function looksLikeBrandName(line: string): boolean {
  if (/[0-9@]/.test(line)) return false;
  if (line.length < 3) return false;
  return /^[A-Z][A-Za-z-]*(?:\s+[A-Z][A-Za-z-]*)?$/.test(line) || /[가-힣]{2,}/.test(line);
}

function looksLikePersonName(line: string): boolean {
  if (/[0-9@]/.test(line)) return false;
  if (/^[가-힣]{2,5}$/.test(line)) return true;
  return isLatinName(line);
}

function isLatinName(line: string | undefined): line is string {
  if (!line) return false;
  const tokens = line.split(/\s+/);
  if (tokens.length > 3) return false;
  return tokens.every((token) => /^[A-Z][a-zA-Z'-]{1,}$/.test(token));
}
