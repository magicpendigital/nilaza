import base from '../../../apps/web/astro.config.mjs';
import { fileURLToPath } from 'node:url';
const directory = name => fileURLToPath(new URL(name, import.meta.url));
export default {
  ...base,
  cacheDir: directory('./web-qa-astro-cache/'),
  outDir: directory('./web-qa-build/'),
  vite: { ...base.vite, cacheDir: directory('./web-qa-vite-cache/') }
};
