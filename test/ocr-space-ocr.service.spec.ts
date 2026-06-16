import type { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { OcrSpaceOcrService } from '../src/modules/background/ocr-space-ocr.service';
import { writeBlankImage } from './support/write-blank-image';

describe('OcrSpaceOcrService', () => {
  it('extracts business card fields through OCR.space multipart upload', async () => {
    const uploadRoot = await mkdtemp(join(tmpdir(), 'ieum-ocr-space-test-'));
    try {
      const imagePath = join(uploadRoot, 'card.png');
      await writeBlankImage(imagePath);
      const postMock = jest.fn().mockResolvedValueOnce({
        status: 200,
        data: {
          ParsedResults: [{
            ParsedText: '홍길동\n주식회사 이음\n개발자\nhello@example.com\n010-1234-5678',
            ErrorMessage: null,
            ErrorDetails: null
          }],
          OCRExitCode: '1',
          IsErroredOnProcessing: false,
          ErrorMessage: null,
          ErrorDetails: null
        }
      });
      const service = new OcrSpaceOcrService(
        new ConfigService({ OCR_SPACE_API_KEY: 'test-key' }),
        createHttpService(postMock)
      );

      const parsed = await service.extract(imagePath);

      expect(postMock).toHaveBeenCalledTimes(1);
      expect(postMock).toHaveBeenCalledWith(
        'https://api.ocr.space/parse/image',
        expect.any(FormData),
        expect.objectContaining({
          headers: { apikey: 'test-key' },
          timeout: 12000,
          validateStatus: expect.any(Function)
        })
      );
      const form = postMock.mock.calls[0]?.[1];
      expect(form).toBeInstanceOf(FormData);
      expect(form.get('language')).toBe('kor');
      expect(form.get('detectOrientation')).toBe('true');
      expect(form.get('scale')).toBe('true');
      expect(form.get('OCREngine')).toBe('1');
      expect(form.get('base64Image')).toEqual(expect.stringMatching(/^data:image\/jpeg;base64,/));
      expect(parsed?.name).toBe('홍길동');
      expect(parsed?.organization).toBe('주식회사 이음');
      expect(parsed?.email).toBe('hello@example.com');
      expect(parsed?.phone).toBe('010-1234-5678');
    } finally {
      await rm(uploadRoot, { force: true, recursive: true });
    }
  });

  it('does not call OCR.space when the API key is missing', async () => {
    const postMock = jest.fn();
    const service = new OcrSpaceOcrService(new ConfigService(), createHttpService(postMock));

    const parsed = await service.extract('/missing/card.png');

    expect(postMock).not.toHaveBeenCalled();
    expect(parsed).toBeNull();
  });
});

function createHttpService(postMock: jest.Mock): HttpService {
  return {
    axiosRef: { post: postMock }
  } as unknown as HttpService;
}
