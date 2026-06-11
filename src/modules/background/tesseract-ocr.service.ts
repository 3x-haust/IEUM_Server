import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import { createWorker, PSM, type Worker } from 'tesseract.js';

const MAX_OCR_WORKERS = 2;

@Injectable()
export class TesseractOcrService implements OnModuleDestroy {
  private createdWorkerCount = 0;
  private readonly idleWorkers: Worker[] = [];
  private readonly allWorkers: Worker[] = [];
  private readonly waiters: ((worker: Worker) => void)[] = [];

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.allWorkers.map((worker) => worker.terminate().catch(() => undefined)));
  }

  async recognizeBusinessCardVariants(imagePath: string): Promise<string> {
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
          if (hasCompleteCardFields(merged)) return merged;
        }
        return mergeRawTexts(texts);
      } finally {
        this.releaseWorker(worker);
      }
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
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

function hasCompleteCardFields(rawText: string): boolean {
  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(rawText);
  const hasPhone = /(?:\+?82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}|\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}/.test(rawText);
  return hasEmail && hasPhone;
}
