import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { HyphenVisionOcrService } from './hyphen-vision-ocr.service';
import { OcrSpaceOcrService } from './ocr-space-ocr.service';
import { parseBusinessCardText } from './ocr-parser';
import { emptyOcrResult, type OcrResult } from './ocr.types';
import { TesseractOcrService } from './tesseract-ocr.service';

@Injectable()
export class OcrService {
  constructor(
    private readonly config: ConfigService,
    private readonly tesseract: TesseractOcrService,
    private readonly ocrSpace: OcrSpaceOcrService,
    private readonly vision: HyphenVisionOcrService
  ) {}

  async extract(storageKey: string): Promise<OcrResult> {
    if (this.config.get<string>('OCR_ENABLED', 'true') === 'false') {
      return emptyOcrResult();
    }
    try {
      const uploadRoot = this.config.get<string>('UPLOAD_DIR', 'uploads');
      const imagePath = resolve(process.cwd(), uploadRoot, storageKey);
      const ocrSpaceResult = await this.ocrSpace.extract(imagePath).catch((error: unknown) => {
        if (error instanceof Error) return null;
        throw error;
      });
      if (ocrSpaceResult) return ocrSpaceResult;
      const visionResult = await this.vision.extract(imagePath).catch((error: unknown) => {
        if (error instanceof Error) return null;
        throw error;
      });
      if (visionResult) return visionResult;
      const rawText = await this.tesseract.recognizeBusinessCardVariants(imagePath);
      return this.parse(rawText);
    } catch {
      return emptyOcrResult();
    }
  }

  parse(rawText: string): OcrResult {
    return parseBusinessCardText(rawText);
  }
}
