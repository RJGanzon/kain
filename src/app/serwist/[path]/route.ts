import { spawnSync } from 'node:child_process';
import { createSerwistRoute } from '@serwist/turbopack';

/** Builds /serwist/sw.js from src/app/sw.ts with the precache list for this build. */

const revision = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() || crypto.randomUUID();

// Every screen's page, so the app opens on any of them offline after the first visit.
const SHELL = ['/', '/signin', '/plan', '/plan/week', '/plan/setup', '/eatery', '/eatery/pot', '/log', '/prices', '/business', '/~offline'];

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: SHELL.map((url) => ({ url, revision })),
  swSrc: 'src/app/sw.ts',
  useNativeEsbuild: true,
});
