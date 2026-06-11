import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';
import { extname } from 'path';
import { parseBusinessCardText } from './ocr-parser';
import type { OcrResult } from './ocr.types';

interface VisionHttpResponse {
  readonly status: number;
  readonly data: unknown;
}

const OCR_PROMPT = [
  'Read all visible text from this business card image and return only compact JSON.',
  'Schema: {"rawText": string|null, "name": string|null, "organization": string|null, "position": string|null, "email": string|null, "phone": string|null}.',
  'Use null for unknown fields. Preserve Korean and English text exactly when readable.',
  'Do not guess missing characters. Include every readable text line in rawText.'
].join('\n');

const NORMALIZE_PROMPT = [
  'You normalize OCR output from a business card into reliable contact fields.',
  'Return only compact JSON with this schema: {"rawText": string|null, "name": string|null, "organization": string|null, "position": string|null, "email": string|null, "phone": string|null}.',
  'Rules:',
  '- Correct obvious OCR duplication such as Sunggyun -> Sungyun, Technolo.gy -> Technology, Hyphynphen/Hyphphen -> Hyphen.',
  '- Prefer valid emails and phone numbers that match common formats. Keep null when unreadable.',
  '- A card back or logo-only image usually has organization but no person name.',
  '- Do not invent fields that are not supported by the OCR text.',
  '- Preserve Korean names when present, but use the clearly printed Latin name when that is the main name.'
].join('\n');

@Injectable()
export class HyphenVisionOcrService {
  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService
  ) {}

  async extract(imagePath: string): Promise<OcrResult | null> {
    const apiKey = this.config.get<string>('HYPHEN_VISION_API_KEY', '').trim();
    if (!apiKey || this.config.get<string>('HYPHEN_VISION_ENABLED', 'true') === 'false') {
      return null;
    }
    const dataUrl = await this.createDataUrl(imagePath);
    const response = await this.requestVision(apiKey, dataUrl);
    if (response.status < 200 || response.status >= 300) {
      return null;
    }
    const visionResult = readVisionResult(response.data);
    if (!visionResult) return null;
    return await this.normalizeResult(apiKey, visionResult);
  }

  private async createDataUrl(imagePath: string): Promise<string> {
    const buffer = await readFile(imagePath);
    return `data:${mimeTypeForPath(imagePath)};base64,${buffer.toString('base64')}`;
  }

  private async requestVision(apiKey: string, imageUrl: string): Promise<VisionHttpResponse> {
    const model = this.config.get<string>('HYPHEN_VISION_MODEL', 'hyphen-vision');
    return this.requestChatCompletion(apiKey, model, [
      {
        role: 'user',
        content: [
          { type: 'text', text: OCR_PROMPT },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ]);
  }

  private async normalizeResult(apiKey: string, result: OcrResult): Promise<OcrResult> {
    if (this.config.get<string>('HYPHEN_LLM_NORMALIZE_ENABLED', 'true') === 'false') {
      return result;
    }
    const model = this.config.get<string>('HYPHEN_LLM_MODEL', 'qwen3.6-35b');
    const response = await this.requestChatCompletion(apiKey, model, [
      { role: 'system', content: NORMALIZE_PROMPT },
      { role: 'user', content: JSON.stringify(result) }
    ]);
    if (response.status < 200 || response.status >= 300) {
      return result;
    }
    return readVisionResult(response.data) ?? result;
  }

  private async requestChatCompletion(apiKey: string, model: string, messages: readonly ChatMessage[]): Promise<VisionHttpResponse> {
    const baseUrl = this.config.get<string>('HYPHEN_VISION_BASE_URL', 'https://ai.hyphen.it.com/v1').replace(/\/$/, '');
    return this.http.axiosRef.post<unknown>(
      `${baseUrl}/chat/completions`,
      {
        model,
        messages,
        chat_template_kwargs: { enable_thinking: true }
      },
      {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: Number(this.config.get<string>('HYPHEN_VISION_TIMEOUT_MS', '25000')),
        validateStatus: () => true
      }
    );
  }
}

type ChatMessage = {
  readonly role: 'system' | 'user';
  readonly content: string | readonly ChatContentPart[];
};

type ChatContentPart =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'image_url'; readonly image_url: { readonly url: string } };

function readVisionResult(body: unknown): OcrResult | null {
  const content = readMessageContent(body);
  if (!content) return null;
  const parsed = parseJsonObject(extractJsonText(content));
  if (!parsed) return parseBusinessCardText(content);
  return {
    rawText: readNullableString(parsed, 'rawText'),
    name: readNullableString(parsed, 'name'),
    organization: readNullableString(parsed, 'organization'),
    position: readNullableString(parsed, 'position'),
    email: readNullableString(parsed, 'email'),
    phone: readNullableString(parsed, 'phone')
  };
}

function readMessageContent(body: unknown): string | null {
  const choices = readRecord(body)?.['choices'];
  if (!Array.isArray(choices)) return null;
  const firstChoice = readRecord(choices[0]);
  const message = readRecord(firstChoice?.['message']);
  const content = message?.['content'];
  return typeof content === 'string' && content.trim() ? content.trim() : null;
}

function extractJsonText(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1);
  }
  return content;
}

function parseJsonObject(value: string): Readonly<Record<string, unknown>> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return readRecord(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

function readNullableString(record: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  if (!value || typeof value !== 'object') return null;
  return Object.fromEntries(Object.entries(value));
}

function mimeTypeForPath(imagePath: string): string {
  const extension = extname(imagePath).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  return 'image/png';
}
