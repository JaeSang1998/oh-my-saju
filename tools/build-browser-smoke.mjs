import { build } from 'tsup';

await build({
  entry: ['test/browser-consumer.ts'],
  format: ['iife'],
  platform: 'browser',
  target: 'es2022',
  globalName: 'SajuEngineSmoke',
  outDir: 'test/.browser-smoke',
  clean: true,
  minify: false,
});
