import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { chmod, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'tsup';

const buildScriptPath = fileURLToPath(import.meta.url);
const projectRoot = dirname(dirname(buildScriptPath));
const coreSourceRoot = join(projectRoot, 'src');

async function listCoreSourceFiles(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort(({ name: left }, { name: right }) => (left < right ? -1 : left > right ? 1 : 0));

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listCoreSourceFiles(path)));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(path);
    } else if (entry.isSymbolicLink()) {
      throw new Error(`Core source identity does not accept symlinks: ${path}`);
    }
  }

  return files;
}

/**
 * Content identity for the deterministic core sources embedded in the portable
 * plugin. Unlike a git dirty marker, this stays reproducible for a checked-in
 * generated artifact while still changing with every production source edit.
 */
export async function deriveBundledCoreSourceRevision() {
  const hash = createHash('sha256');
  hash.update('saju-engine-core-content-v1\0', 'utf8');

  for (const path of await listCoreSourceFiles(coreSourceRoot)) {
    const source = await readFile(path);
    const sourcePath = relative(projectRoot, path).split(sep).join('/');
    hash.update(
      `${Buffer.byteLength(sourcePath, 'utf8')}:${sourcePath}:${source.byteLength}:`,
      'utf8',
    );
    hash.update(source);
    hash.update('\0', 'utf8');
  }

  return `core-content-sha256:${hash.digest('hex')}`;
}

export async function buildAgentPlugin() {
  const outputDirectory =
    process.env.OH_MY_SAJU_PLUGIN_OUTPUT_DIRECTORY ??
    'plugins/oh-my-saju/skills/oh-my-saju/scripts';
  const outputFile = `${outputDirectory}/oh-my-saju.mjs`;

  await build({
    entry: { 'oh-my-saju': 'plugins/oh-my-saju/runtime/application/cli.ts' },
    outDir: outputDirectory,
    format: ['esm'],
    platform: 'node',
    target: 'node18',
    splitting: false,
    sourcemap: false,
    minify: false,
    clean: false,
    tsconfig: 'plugins/oh-my-saju/tsconfig.json',
    noExternal: [/.*/],
    outExtension: () => ({ js: '.mjs' }),
    define: {
      __SAJU_ENGINE_SOURCE_REVISION__: JSON.stringify(await deriveBundledCoreSourceRevision()),
    },
  });

  const bundledSource = await readFile(outputFile, 'utf8');
  const normalizedSource = bundledSource
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');
  await writeFile(outputFile, normalizedSource);
  await chmod(outputFile, 0o755);
}

if (process.argv[1] && resolve(process.argv[1]) === buildScriptPath) {
  await buildAgentPlugin();
}
