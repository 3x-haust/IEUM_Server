import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { parseBusinessCardText } from './ocr-parser';
import type { OcrResult } from './ocr.types';

interface OcrSpaceHttpResponse {
  readonly status: number;
  readonly data: unknown;
}

interface PreparedOcrImage {
  readonly data: Buffer;
  readonly mimeType: 'image/jpeg';
}

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_IMAGE_EDGE = 1280;
const DEFAULT_JPEG_QUALITY = 82;

@Injectable()
export class OcrSpaceOcrService {
  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService
  ) {}

  async extract(imagePath: string): Promise<OcrResult | null> {
    const apiKey = this.config.get<string>('OCR_SPACE_API_KEY', '').trim();
    if (!apiKey || this.config.get<string>('OCR_SPACE_ENABLED', 'true') === 'false') {
      return null;
    }
    const image = await this.prepareImage(imagePath);
    const response = await this.requestOcrSpace(apiKey, image);
    if (response.status < 200 || response.status >= 300) {
      return null;
    }
    const rawText = readParsedText(response.data);
    return rawText ? parseBusinessCardText(rawText) : null;
  }

  private async prepareImage(imagePath: string): Promise<PreparedOcrImage> {
    const maxEdge = readPositiveInteger(this.config.get<string>('OCR_SPACE_MAX_IMAGE_EDGE'), DEFAULT_MAX_IMAGE_EDGE);
    const quality = readJpegQuality(this.config.get<string>('OCR_SPACE_JPEG_QUALITY'), DEFAULT_JPEG_QUALITY);
    const data = await sharp(imagePath)
      .rotate()
      .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    return {
      data,
      mimeType: 'image/jpeg'
    };
  }

  private async requestOcrSpace(apiKey: string, image: PreparedOcrImage): Promise<OcrSpaceHttpResponse> {
    const form = new FormData();
    form.append('base64Image', `data:${image.mimeType};base64,${image.data.toString('base64')}`);
    form.append('language', this.config.get<string>('OCR_SPACE_LANGUAGE', 'kor'));
    form.append('isOverlayRequired', 'false');
    form.append('detectOrientation', 'true');
    form.append('scale', 'true');
    form.append('isTable', this.config.get<string>('OCR_SPACE_IS_TABLE', 'true'));
    form.append('OCREngine', this.config.get<string>('OCR_SPACE_ENGINE', '1'));
    return this.http.axiosRef.post<unknown>(
      this.config.get<string>('OCR_SPACE_BASE_URL', 'https://api.ocr.space/parse/image'),
      form,
      {
        headers: { apikey: apiKey },
        timeout: readPositiveInteger(this.config.get<string>('OCR_SPACE_TIMEOUT_MS'), DEFAULT_TIMEOUT_MS),
        validateStatus: () => true
      }
    );
  }
}

function readParsedText(body: unknown): string | null {
  const record = readRecord(body);
  if (!record || record['IsErroredOnProcessing'] === true) return null;
  const parsedResults = record['ParsedResults'];
  if (!Array.isArray(parsedResults)) return null;
  const text = parsedResults
    .map((result) => readRecord(result)?.['ParsedText'])
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .join('\n')
    .trim();
  return text || null;
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readJpegQuality(value: string | undefined, fallback: number): number {
  const parsed = readPositiveInteger(value, fallback);
  return Math.min(95, Math.max(40, parsed));
}

function readRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  if (!value || typeof value !== 'object') return null;
  return Object.fromEntries(Object.entries(value));
}
