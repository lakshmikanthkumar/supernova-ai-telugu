import detox from 'detox';
import config from '../.detoxrc.json';

export default async function globalSetup(): Promise<void> {
  await detox.init(config, { initGlobals: false });
}
