export function encodeCursor(date: Date, id: string): string {
  return Buffer.from(JSON.stringify({ date: date.toISOString(), id }), 'utf8').toString('base64url');
}

export function decodeCursor(cursor?: string): { date: Date; id: string } | null {
  if (!cursor) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { date?: string; id?: string };
    if (!parsed.date || !parsed.id) {
      return null;
    }
    return { date: new Date(parsed.date), id: parsed.id };
  } catch {
    return null;
  }
}
