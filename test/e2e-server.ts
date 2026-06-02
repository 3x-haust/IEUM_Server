import { createE2eApp } from './e2e-harness';

async function main(): Promise<void> {
  const app = await createE2eApp();
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`IEUM e2e harness listening on http://localhost:${port}`);
}

void main();
