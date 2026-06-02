export class Queue {
  async add(): Promise<void> {}
  async close(): Promise<void> {}
}

export class Worker {
  async close(): Promise<void> {}
}

export default class Redis {
  readonly status = 'end';
  async connect(): Promise<void> {}
  async get(): Promise<null> { return null; }
  async set(): Promise<void> {}
  async del(): Promise<void> {}
  async incr(): Promise<number> { return 1; }
  async expire(): Promise<void> {}
  async quit(): Promise<void> {}
}

export async function recognize(): Promise<{ readonly data: { readonly text: string } }> {
  return { data: { text: '' } };
}

export function v4(): string {
  return '55555555-5555-5555-5555-555555555555';
}
