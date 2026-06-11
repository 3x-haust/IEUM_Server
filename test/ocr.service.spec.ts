import { ConfigService } from '@nestjs/config';
import { OcrService } from '../src/modules/background/ocr.service';

describe('OcrService', () => {
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
});
