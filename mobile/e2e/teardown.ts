import { cleanup } from 'detox';

export default async function globalTeardown(): Promise<void> {
  await cleanup();
}
