import type { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { HyphenVisionOcrService } from '../src/modules/background/hyphen-vision-ocr.service';
import { OcrSpaceOcrService } from '../src/modules/background/ocr-space-ocr.service';
import { OcrService } from '../src/modules/background/ocr.service';
import { TesseractOcrService } from '../src/modules/background/tesseract-ocr.service';
import { writeBlankImage } from './support/write-blank-image';

describe('OcrService provider order', () => {
  it('prefers OCR.space over Hyphen vision when both API keys are configured', async () => {
    const uploadRoot = await mkdtemp(join(tmpdir(), 'ieum-ocr-provider-test-'));
    try {
      await writeBlankImage(join(uploadRoot, 'card.png'));
      const config = new ConfigService({
        HYPHEN_VISION_API_KEY: 'hyphen-key',
        OCR_SPACE_API_KEY: 'ocr-space-key',
        UPLOAD_DIR: uploadRoot
      });
      const ocrSpacePostMock = jest.fn().mockResolvedValueOnce({
        status: 200,
        data: {
          ParsedResults: [{ ParsedText: '홍길동\n주식회사 이음\n개발자\nhello@example.com\n010-1234-5678' }],
          OCRExitCode: '1',
          IsErroredOnProcessing: false
        }
      });
      const hyphenPostMock = jest.fn();
      const service = new OcrService(
        config,
        new TesseractOcrService(),
        new OcrSpaceOcrService(config, createHttpService(ocrSpacePostMock)),
        new HyphenVisionOcrService(config, createHttpService(hyphenPostMock))
      );

      const parsed = await service.extract('card.png');

      expect(ocrSpacePostMock).toHaveBeenCalledTimes(1);
      expect(hyphenPostMock).not.toHaveBeenCalled();
      expect(parsed.email).toBe('hello@example.com');
    } finally {
      await rm(uploadRoot, { force: true, recursive: true });
    }
  });
});

function createHttpService(postMock: jest.Mock): HttpService {
  return {
    axiosRef: { post: postMock }
  } as unknown as HttpService;
}
