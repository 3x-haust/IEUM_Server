import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { recognize } from 'tesseract.js';

export interface OcrResult {
  rawText: string | null;
  name: string | null;
  organization: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
}

@Injectable()
export class OcrService {
  constructor(private readonly config: ConfigService) {}

  async extract(storageKey: string): Promise<OcrResult> {
    if (this.config.get<string>('OCR_ENABLED') !== 'true') {
      return this.empty();
    }
    try {
      const uploadRoot = this.config.get<string>('UPLOAD_DIR', 'uploads');
      const result = await recognize(join(process.cwd(), uploadRoot, storageKey), 'eng+kor');
      return this.parse(result.data.text);
    } catch {
      return this.empty();
    }
  }

  parse(rawText: string): OcrResult {
    const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const email = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
    const phone = rawText.match(/(?:\+?82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}|\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}/)?.[0] ?? null;
    return {
      rawText,
      name: lines[0] ?? null,
      organization: lines.find((line) => /(주식회사|회사|학교|기관|corp|inc|ltd|company)/i.test(line)) ?? null,
      position: lines.find((line) => /(대표|매니저|팀장|개발자|designer|manager|engineer|ceo|cto)/i.test(line)) ?? null,
      email,
      phone
    };
  }

  private empty(): OcrResult {
    return { rawText: null, name: null, organization: null, position: null, email: null, phone: null };
  }
}
