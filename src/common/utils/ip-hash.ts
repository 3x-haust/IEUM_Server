import { createHash } from 'crypto';

export function hashIp(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  return createHash('sha256').update(value).digest('hex');
}
