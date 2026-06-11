import type { OcrResult } from './ocr.types';

const ORGANIZATION_PATTERN = /(주식회사|회사|학교|기관|corp|inc|ltd|company|studio|labs?|group|hyphen)/i;
const POSITION_PATTERN = /(대표|매니저|팀장|개발자|디자이너|기획자|designer|manager|engineer|ceo|cto|lead|director|founder)/i;

export function parseBusinessCardText(rawText: string): OcrResult {
  const lines = normalizeOcrLines(rawText);
  const email = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const phone = rawText.match(/(?:\+?82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}|\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}/)?.[0] ?? null;
  const organization = findOrganization(lines);
  const position = lines.find((line) => isPositionLine(line)) ?? null;
  return {
    rawText,
    name: findName(lines, organization, position, email, phone),
    organization,
    position,
    email,
    phone
  };
}

function normalizeOcrLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => normalizeOcrLine(line))
    .filter((line): line is string => Boolean(line))
    .filter((line) => !isNoiseLine(line));
}

function normalizeOcrLine(line: string): string | null {
  const stripped = line
    .replace(/[|｜]/g, ' ')
    .replace(/[^\w@.+\-\s가-힣]/g, ' ')
    .replace(/\b\d+\s*개\b/g, ' ')
    .replace(/\b[A-Z]{1,2}\s*개\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!stripped) return null;

  const trailingBrand = stripped.match(/(?:^| )([A-Z][A-Za-z][A-Za-z-]*(?:\s+[A-Z][A-Za-z][A-Za-z-]*)?)$/);
  if (trailingBrand?.[1] && stripped !== trailingBrand[1] && !looksLikePersonName(stripped)) {
    return trailingBrand[1];
  }
  return stripped;
}

function isNoiseLine(line: string): boolean {
  if (line.length <= 1) return true;
  if (/^[A-Z]{1,2}$/i.test(line)) return true;
  if (/^[A-Z]\s+\d+$/i.test(line)) return true;
  if (/^\d+$/.test(line)) return true;
  return false;
}

function findOrganization(lines: readonly string[]): string | null {
  const explicit = lines.find((line) => ORGANIZATION_PATTERN.test(line));
  if (explicit) return stripOrganizationNoise(explicit);

  const counts = new Map<string, number>();
  for (const line of lines) {
    if (!looksLikeBrandName(line)) continue;
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  const repeated = [...counts.entries()].find(([, count]) => count > 1)?.[0];
  if (repeated) return repeated;

  return lines.find((line) => looksLikeBrandName(line) && !looksLikePersonName(line)) ?? null;
}

function stripOrganizationNoise(line: string): string {
  const matchedBrand = line.match(/([A-Z][A-Za-z][A-Za-z-]*(?:\s+[A-Z][A-Za-z-]*)?)$/);
  if (matchedBrand?.[1] && !/^(corp|inc|ltd|company|group|labs?|studio)$/i.test(matchedBrand[1])) {
    return matchedBrand[1];
  }
  return line;
}

function findName(
  lines: readonly string[],
  organization: string | null,
  position: string | null,
  email: string | null,
  phone: string | null,
): string | null {
  const candidates = lines
    .filter((line) => line !== organization && line !== position)
    .filter((line) => line !== email && line !== phone)
    .filter((line) => !ORGANIZATION_PATTERN.test(line))
    .map((line) => sanitizeNameCandidate(line))
    .filter((line): line is string => Boolean(line))
    .filter((line) => looksLikePersonName(line));

  if (candidates.length >= 2 && isLatinName(candidates[0]) && isLatinName(candidates[1])) {
    return `${candidates[0]} ${candidates[1]}`;
  }
  return candidates[0] ?? null;
}

function sanitizeNameCandidate(line: string): string | null {
  const tokens = line.split(/\s+/).filter(Boolean);
  const cleaned = tokens.filter((token) => !/^[A-Z]$/i.test(token) && !/^\d+$/.test(token));
  const normalized = cleaned.join(' ').trim();
  return normalized || null;
}

function isPositionLine(line: string): boolean {
  return POSITION_PATTERN.test(line);
}

function looksLikeBrandName(line: string): boolean {
  if (/[0-9@]/.test(line)) return false;
  if (line.length < 3) return false;
  return /^[A-Z][A-Za-z-]*(?:\s+[A-Z][A-Za-z-]*)?$/.test(line) || /[가-힣]{2,}/.test(line);
}

function looksLikePersonName(line: string): boolean {
  if (/[0-9@]/.test(line)) return false;
  if (/^[가-힣]{2,5}$/.test(line)) return true;
  return isLatinName(line);
}

function isLatinName(line: string | undefined): line is string {
  if (!line) return false;
  const tokens = line.split(/\s+/);
  if (tokens.length > 3) return false;
  return tokens.every((token) => /^[A-Z][a-zA-Z'-]{1,}$/.test(token));
}
