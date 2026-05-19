export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[~`!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/script/gi, '');
}
