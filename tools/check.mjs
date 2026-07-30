import { spawnSync } from 'node:child_process';

const checks = [
  ['Core TypeScript', ['./node_modules/typescript/bin/tsc', '--noEmit']],
  [
    'Oh My Saju TypeScript',
    [
      './node_modules/typescript/bin/tsc',
      '--noEmit',
      '--project',
      'plugins/oh-my-saju/tsconfig.json',
    ],
  ],
  ['ESLint', ['./node_modules/eslint/bin/eslint.js', '.']],
  [
    'Prettier',
    [
      './node_modules/prettier/bin/prettier.cjs',
      '--check',
      'src/**/*.ts',
      'plugins/oh-my-saju/**/*.ts',
      'plugins/oh-my-saju/**/*.json',
      'test/**/*.ts',
      'test/**/*.cts',
      'test/**/*.html',
      'tools/**/*.mjs',
      '*.mjs',
      '*.md',
      'docs/**/*.md',
    ],
  ],
  ['Vitest + coverage', ['./node_modules/vitest/vitest.mjs', 'run', '--coverage']],
  ['browser bundle', ['tools/build-browser-smoke.mjs']],
  ['package build', ['tools/build.mjs']],
  ['package consumers', ['tools/verify-package.mjs']],
  ['packed artifact', ['tools/verify-packed-artifact.mjs']],
  ['Oh My Saju plugin artifact', ['tools/verify-agent-plugin.mjs']],
];

for (const [label, arguments_] of checks) {
  console.log(`\n> ${label}`);
  const result = spawnSync(process.execPath, arguments_, {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
