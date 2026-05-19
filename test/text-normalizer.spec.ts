import { normalizeText, stripHtml } from '../src/common/utils/text-normalizer';

describe('text normalizer', () => {
  it('normalizes spacing, case, symbols, and zero width characters', () => {
    expect(normalizeText('  BAD\u200B--Word!!  ')).toBe('badword');
  });

  it('strips html tags and script text', () => {
    expect(stripHtml('<b>Hello</b><script>alert(1)</script>')).toBe('Helloalert(1)');
  });
});
