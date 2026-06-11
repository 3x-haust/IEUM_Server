import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import { OcrService } from '../src/modules/background/ocr.service';

const recognizeMock = jest.fn();
const setParametersMock = jest.fn();
const terminateMock = jest.fn();

jest.mock('tesseract.js', () => ({
  PSM: { SPARSE_TEXT: '11' },
  createWorker: jest.fn(async () => ({
    recognize: recognizeMock,
    setParameters: setParametersMock,
    terminate: terminateMock
  }))
}));

describe('OcrService', () => {
  beforeEach(() => {
    recognizeMock.mockReset();
    setParametersMock.mockReset();
    terminateMock.mockReset();
    terminateMock.mockResolvedValue(undefined);
  });

  it('extracts email phone and basic lines from text', () => {
    const service = new OcrService(new ConfigService({ OCR_ENABLED: 'false' }));
    const parsed = service.parse('홍길동\n주식회사 이음\n개발자\nhello@example.com\n010-1234-5678');
    expect(parsed.name).toBe('홍길동');
    expect(parsed.organization).toBe('주식회사 이음');
    expect(parsed.position).toBe('개발자');
    expect(parsed.email).toBe('hello@example.com');
    expect(parsed.phone).toBe('010-1234-5678');
  });

  it('recovers a latin name and organization from noisy business card OCR', () => {
    const service = new OcrService(new ConfigService({ OCR_ENABLED: 'false' }));
    const parsed = service.parse('| Lyu A\n\nSungyun\n\nrE\n\n15 개 Hyphen\nFF 개\n\nHyphen\nA 4 개\n');
    expect(parsed.name).toBe('Lyu Sungyun');
    expect(parsed.organization).toBe('Hyphen');
  });

  it('uses Tesseract OCR by default when OCR_ENABLED is omitted', async () => {
    const uploadRoot = await mkdtemp(join(tmpdir(), 'ieum-ocr-test-'));
    try {
      await sharp({
        create: {
          width: 320,
          height: 180,
          channels: 3,
          background: '#ffffff'
        }
      }).png().toFile(join(uploadRoot, 'card.png'));
      recognizeMock.mockResolvedValue({
        data: { text: '홍길동\n주식회사 이음\n개발자\nhello@example.com\n010-1234-5678' }
      });

      const service = new OcrService(new ConfigService({ UPLOAD_DIR: uploadRoot }));
      const parsed = await service.extract('card.png');

      expect(recognizeMock).toHaveBeenCalled();
      expect(parsed.email).toBe('hello@example.com');
      await service.onModuleDestroy();
    } finally {
      await rm(uploadRoot, { force: true, recursive: true });
    }
  });

  it('skips Tesseract OCR when OCR_ENABLED is false', async () => {
    const service = new OcrService(new ConfigService({ OCR_ENABLED: 'false' }));
    const parsed = await service.extract('missing.png');

    expect(recognizeMock).not.toHaveBeenCalled();
    expect(parsed.rawText).toBeNull();
  });
});
