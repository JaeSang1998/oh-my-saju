import { spawnSync } from 'node:child_process';
import { build } from 'tsup';

function gitOutput(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

function sourceRevision() {
  if (process.env.SAJU_ENGINE_SOURCE_REVISION) return process.env.SAJU_ENGINE_SOURCE_REVISION;

  const commit = gitOutput(['rev-parse', 'HEAD']);
  if (commit === null) return 'unavailable';
  const status = gitOutput(['status', '--porcelain', '--untracked-files=normal']);
  return status ? `${commit}-dirty` : commit;
}

await build({
  entry: ['src/index.ts', 'src/calendar.ts', 'src/advanced.ts', 'src/timing.ts'],
  format: ['esm', 'cjs'],
  // astronomy-engine 2.1.x exposes an ambiguous .js ESM entry that Node 18
  // interprets as CommonJS. Bundling it keeps both published formats portable.
  noExternal: ['astronomy-engine'],
  // tsup 8 injects baseUrl into its TypeScript 6 declaration worker.
  // Keep that compatibility suppression local; TypeScript 7 reads tsconfig.json directly.
  dts: {
    compilerOptions: {
      ignoreDeprecations: '6.0',
    },
  },
  sourcemap: true,
  clean: true,
  define: {
    __SAJU_ENGINE_SOURCE_REVISION__: JSON.stringify(sourceRevision()),
  },
});
