import type { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import { HyphenVisionOcrService } from '../src/modules/background/hyphen-vision-ocr.service';
import { OcrService } from '../src/modules/background/ocr.service';
import { TesseractOcrService } from '../src/modules/background/tesseract-ocr.service';

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
    const service = createOcrService({ OCR_ENABLED: 'false' });
    const parsed = service.parse('홍길동\n주식회사 이음\n개발자\nhello@example.com\n010-1234-5678');
    expect(parsed.name).toBe('홍길동');
    expect(parsed.organization).toBe('주식회사 이음');
    expect(parsed.position).toBe('개발자');
    expect(parsed.email).toBe('hello@example.com');
    expect(parsed.phone).toBe('010-1234-5678');
  });

  it('recovers a latin name and organization from noisy business card OCR', () => {
    const service = createOcrService({ OCR_ENABLED: 'false' });
    const parsed = service.parse('| Lyu A\n\nSungyun\n\nrE\n\n15 개 Hyphen\nFF 개\n\nHyphen\nA 4 개\n');
    expect(parsed.name).toBe('Lyu Sungyun');
    expect(parsed.organization).toBe('Hyphen');
  });

  it('recovers visible Hyphen card fields from real camera OCR noise', () => {
    const service = createOcrService({ OCR_ENABLED: 'false' });
    const parsed = service.parse([
      'ry',
      'Lyu',
      'Sungyun',
      'Technology Lead',
      'WD T= UR. ap',
      '48',
      'SC Sie-Sa-a0w',
      '© [12노 Fypren com',
      '6 Lungrnityphen iam',
      'VEY',
      'ry J',
      'ED T= UR hap',
      '유성윤',
      'Prox Fypren com',
      'EN',
      'Shezicgy Lead',
      'Oo 서 ©',
      'QQ =',
      '[=~]',
      '[해',
      'Hyphen'
    ].join('\n'));
    expect(parsed.name).toBe('Lyu Sungyun');
    expect(parsed.organization).toBe('Hyphen');
    expect(parsed.position).toBe('Technology Lead');
  });

  it('uses Hyphen vision without LLM normalization by default', async () => {
    const uploadRoot = await mkdtemp(join(tmpdir(), 'ieum-ocr-test-'));
    try {
      await writeBlankImage(join(uploadRoot, 'card.png'));
      const postMock = jest.fn().mockResolvedValueOnce({
        status: 200,
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                rawText: 'Lyu Sunggyun\nTechnolo.gy Lead\nHyphynphen\n010-5913-4010\nsunqgyun@hyphen.it.com',
                name: 'Lyu Sunggyun',
                organization: 'Hyphynphen',
                position: 'Technology Lead',
                email: 'sunqgyun@hyphen.it.com',
                phone: '010-5913-4010'
              })
            }
          }]
        }
      });
      const service = createOcrService({ HYPHEN_VISION_API_KEY: 'test-key', UPLOAD_DIR: uploadRoot }, postMock);
      const parsed = await service.extract('card.png');

      expect(postMock).toHaveBeenCalledTimes(1);
      expect(postMock).toHaveBeenNthCalledWith(
        1,
        'https://ai.hyphen.it.com/v1/chat/completions',
        expect.objectContaining({ model: 'hyphen-vision' }),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-key' }) })
      );
      expect(recognizeMock).not.toHaveBeenCalled();
      expect(parsed.email).toBe('sunqgyun@hyphen.it.com');
      expect(parsed.phone).toBe('010-5913-4010');
    } finally {
      await rm(uploadRoot, { force: true, recursive: true });
    }
  });

  it('runs LLM normalization only when explicitly enabled', async () => {
    const uploadRoot = await mkdtemp(join(tmpdir(), 'ieum-ocr-test-'));
    try {
      await writeBlankImage(join(uploadRoot, 'card.png'));
      const postMock = jest.fn()
        .mockResolvedValueOnce({
          status: 200,
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  rawText: 'Lyu Sunggyun\nTechnolo.gy Lead\nHyphynphen\n010-5913-4010\nsunqgyun@hyphen.it.com',
                  name: 'Lyu Sunggyun',
                  organization: 'Hyphynphen',
                  position: 'Technology Lead',
                  email: 'sunqgyun@hyphen.it.com',
                  phone: '010-5913-4010'
                })
              }
            }]
          }
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  rawText: 'Lyu Sungyun\nTechnology Lead\nHyphen\n010-5913-4010\nsungyun@hyphen.it.com',
                  name: 'Lyu Sungyun',
                  organization: 'Hyphen',
                  position: 'Technology Lead',
                  email: 'sungyun@hyphen.it.com',
                  phone: '010-5913-4010'
                })
              }
            }]
          }
        });
      const service = createOcrService({
        HYPHEN_LLM_NORMALIZE_ENABLED: 'true',
        HYPHEN_VISION_API_KEY: 'test-key',
        UPLOAD_DIR: uploadRoot
      }, postMock);
      const parsed = await service.extract('card.png');

      expect(postMock).toHaveBeenCalledTimes(2);
      expect(postMock).toHaveBeenNthCalledWith(
        1,
        'https://ai.hyphen.it.com/v1/chat/completions',
        expect.objectContaining({ model: 'hyphen-vision' }),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-key' }) })
      );
      expect(postMock).toHaveBeenNthCalledWith(
        2,
        'https://ai.hyphen.it.com/v1/chat/completions',
        expect.objectContaining({ model: 'qwen3.6-35b' }),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-key' }) })
      );
      expect(recognizeMock).not.toHaveBeenCalled();
      expect(parsed.email).toBe('sungyun@hyphen.it.com');
      expect(parsed.phone).toBe('010-5913-4010');
    } finally {
      await rm(uploadRoot, { force: true, recursive: true });
    }
  });

  it('recovers OCR fields when vision returns truncated JSON rawText', async () => {
    const uploadRoot = await mkdtemp(join(tmpdir(), 'ieum-ocr-test-'));
    try {
      await writeBlankImage(join(uploadRoot, 'card.png'));
      const postMock = jest.fn().mockResolvedValueOnce({
        status: 200,
        data: {
          choices: [{
            message: {
              content: '{\n  "rawText": "CEO\\n1. T. SHIN\\n010 2831 0421\\nwww.netclaus.org\\nnetclaus@ogq.me\\nOOGO\\nCEO\\n1. T. SHIN\\n010 2831 0421'
            }
          }]
        }
      });
      const service = createOcrService({ HYPHEN_VISION_API_KEY: 'test-key', UPLOAD_DIR: uploadRoot }, postMock);
      const parsed = await service.extract('card.png');

      expect(postMock).toHaveBeenCalledTimes(1);
      expect(parsed.position).toBe('CEO');
      expect(parsed.name).toBe('T. SHIN');
      expect(parsed.organization).toBe('OOGO');
      expect(parsed.email).toBe('netclaus@ogq.me');
      expect(parsed.phone).toBe('010 2831 0421');
    } finally {
      await rm(uploadRoot, { force: true, recursive: true });
    }
  });

  it('falls back to Tesseract OCR when Hyphen vision is not configured', async () => {
    const uploadRoot = await mkdtemp(join(tmpdir(), 'ieum-ocr-test-'));
    const tesseract = new TesseractOcrService();
    try {
      await writeBlankImage(join(uploadRoot, 'card.png'));
      recognizeMock.mockResolvedValue({
        data: { text: '홍길동\n주식회사 이음\n개발자\nhello@example.com\n010-1234-5678' }
      });

      const service = new OcrService(
        new ConfigService({ UPLOAD_DIR: uploadRoot }),
        tesseract,
        createVisionService(new ConfigService({ UPLOAD_DIR: uploadRoot }))
      );
      const parsed = await service.extract('card.png');

      expect(recognizeMock).toHaveBeenCalled();
      expect(parsed.email).toBe('hello@example.com');
    } finally {
      await tesseract.onModuleDestroy();
      await rm(uploadRoot, { force: true, recursive: true });
    }
  });

  it('skips OCR when OCR_ENABLED is false', async () => {
    const service = createOcrService({ OCR_ENABLED: 'false' });
    const parsed = await service.extract('missing.png');

    expect(recognizeMock).not.toHaveBeenCalled();
    expect(parsed.rawText).toBeNull();
  });
});

function createOcrService(config: Readonly<Record<string, string>>, postMock = jest.fn()): OcrService {
  const configService = new ConfigService(config);
  return new OcrService(configService, new TesseractOcrService(), createVisionService(configService, postMock));
}

function createVisionService(config: ConfigService, postMock = jest.fn()): HyphenVisionOcrService {
  return new HyphenVisionOcrService(config, {
    axiosRef: { post: postMock }
  } as unknown as HttpService);
}

async function writeBlankImage(path: string): Promise<void> {
  await sharp({
    create: {
      width: 320,
      height: 180,
      channels: 3,
      background: '#ffffff'
    }
  }).png().toFile(path);
}
