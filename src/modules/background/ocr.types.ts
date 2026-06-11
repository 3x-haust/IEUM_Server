export interface OcrResult {
  readonly rawText: string | null;
  readonly name: string | null;
  readonly organization: string | null;
  readonly position: string | null;
  readonly email: string | null;
  readonly phone: string | null;
}

export function emptyOcrResult(): OcrResult {
  return { rawText: null, name: null, organization: null, position: null, email: null, phone: null };
}
