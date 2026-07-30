import { spawnSync } from 'node:child_process';

const binary = (name) => `./node_modules/.bin/${name}${process.platform === 'win32' ? '.cmd' : ''}`;

const checks = [
  ['Core TypeScript', binary('tsc'), ['--noEmit']],
  [
    'Oh My Saju TypeScript',
    binary('tsc'),
    ['--noEmit', '--project', 'plugins/oh-my-saju/tsconfig.json'],
  ],
  ['ESLint', process.execPath, ['./node_modules/eslint/bin/eslint.js', '.']],
  [
    'Prettier',
    process.execPath,
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
  [
    'Vitest + coverage',
    process.execPath,
    ['./node_modules/vitest/vitest.mjs', 'run', '--coverage'],
  ],
  ['browser bundle', process.execPath, ['tools/build-browser-smoke.mjs']],
  ['package build', process.execPath, ['tools/build.mjs']],
  ['package consumers', process.execPath, ['tools/verify-package.mjs']],
  ['packed artifact', process.execPath, ['tools/verify-packed-artifact.mjs']],
  ['Oh My Saju plugin artifact', process.execPath, ['tools/verify-agent-plugin.mjs']],
];

for (const [label, command, arguments_] of checks) {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, arguments_, {
    cwd: process.cwd(),
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
    stdio: 'inherit',
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
