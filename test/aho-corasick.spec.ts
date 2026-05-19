import { AhoCorasickMatcher } from '../src/modules/banned-words/aho-corasick';

describe('AhoCorasickMatcher', () => {
  it('finds normalized banned words in linear scan', () => {
    const matcher = new AhoCorasickMatcher(['bad word', 'blocked']);
    expect(matcher.find('This is b-a-d   WORD text')).toContain('bad word');
    expect(matcher.find('safe text')).toEqual([]);
  });

  it('returns overlapping matches once', () => {
    const matcher = new AhoCorasickMatcher(['aba', 'bab']);
    expect(matcher.find('ababa').sort()).toEqual(['aba', 'bab']);
  });
});
