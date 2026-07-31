import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveBundledCoreSourceRevision } from './build-agent-plugin.mjs';
import { verifyTraditionPackSchemas } from './verify-tradition-pack-schema.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const pluginRoot = join(projectRoot, 'plugins/oh-my-saju');
const packRoot = join(pluginRoot, 'tradition-packs');
const skillRoot = join(pluginRoot, 'skills/oh-my-saju');
const runtimePath = join(skillRoot, 'scripts/oh-my-saju.mjs');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'oh-my-saju-plugin-'));

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function walk(path) {
  const entries = [];
  for (const name of readdirSync(path)) {
    const child = join(path, name);
    const stats = lstatSync(child);
    entries.push({ path: child, stats });
    if (stats.isDirectory()) entries.push(...walk(child));
  }
  return entries;
}

try {
  verifyTraditionPackSchemas({ projectRoot });

  const packageJson = readJson(join(projectRoot, 'package.json'));
  const versions = readJson(join(projectRoot, 'release/versions.json'));
  const portable = readJson(join(pluginRoot, 'plugin.json'));
  const codex = readJson(join(pluginRoot, '.codex-plugin/plugin.json'));
  const claude = readJson(join(pluginRoot, '.claude-plugin/plugin.json'));
  const codexMarketplace = readJson(join(projectRoot, '.agents/plugins/marketplace.json'));
  const claudeMarketplace = readJson(join(projectRoot, '.claude-plugin/marketplace.json'));

  assert.equal(versions.engine, packageJson.version, 'engine version source drifted');
  assert.equal(portable.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  assert.equal(portable.name, 'oh-my-saju');
  assert.equal(portable.version, versions.plugin);
  assert.equal(packageJson.license, 'Apache-2.0');
  assert.equal(portable.license, 'Apache-2.0');
  assert.equal(codex.name, portable.name);
  assert.equal(codex.version, portable.version);
  assert.equal(codex.license, portable.license);
  assert.equal(claude.name, portable.name);
  assert.equal(claude.version, portable.version);
  assert.equal(claude.license, portable.license);
  assert.equal(codex.skills, './skills/');
  assert.equal(claude.skills, './skills/');
  assert.equal(
    codexMarketplace.plugins.some(
      ({ name, source }) =>
        name === portable.name &&
        source?.source === 'local' &&
        source.path === './plugins/oh-my-saju',
    ),
    true,
    'Codex marketplace entry is missing or drifted',
  );
  assert.equal(
    claudeMarketplace.plugins.some(
      ({ name, source }) => name === portable.name && source === './plugins/oh-my-saju',
    ),
    true,
    'Claude marketplace entry is missing or drifted',
  );

  const skill = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8');
  const skillInterface = readFileSync(join(skillRoot, 'agents/openai.yaml'), 'utf8');
  const license = readFileSync(join(pluginRoot, 'LICENSE'), 'utf8');
  const notice = readFileSync(join(pluginRoot, 'NOTICE.md'), 'utf8');
  const thirdPartyNotices = readFileSync(join(pluginRoot, 'THIRD_PARTY_NOTICES.md'), 'utf8');
  assert.match(skill, /^---\nname: oh-my-saju\n/m);
  assert.match(skill, /^license: Apache-2\.0$/mu);
  assert.match(skillInterface, /display_name: ['"]오 마이 사주['"]/u);
  assert.match(skillInterface, /default_prompt: ['"]\$oh-my-saju로 .*평범한 한국어로 풀어 주세요/u);
  assert.equal(
    versions.skills['oh-my-saju'],
    portable.version,
    'Skill and plugin release versions drifted',
  );
  assert.ok(skill.trimEnd().split('\n').length < 500, 'SKILL.md should stay below 500 lines');
  assert.match(license, /^Apache License\nVersion 2\.0, January 2004$/mu);
  assert.match(notice, /Copyright 2026 Jaesang Lee/u);
  assert.match(notice, /THIRD_PARTY_NOTICES\.md/u);
  for (const dependency of ['astronomy-engine 2.1.19', 'moment 2.30.1', 'moment-timezone 0.6.3']) {
    assert.match(
      thirdPartyNotices,
      new RegExp(dependency.replace(/[.-]/gu, '\\$&')),
      `third-party notice is missing ${dependency}`,
    );
  }
  for (const legalFile of ['LICENSE', 'NOTICE.md', 'THIRD_PARTY_NOTICES.md']) {
    assert.deepEqual(
      readFileSync(join(skillRoot, legalFile)),
      readFileSync(join(pluginRoot, legalFile)),
      `standalone skill ${legalFile} is missing or drifted from the plugin copy`,
    );
  }

  for (const match of skill.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^[a-z]+:/iu.test(target) || target.startsWith('#')) continue;
    const resolved = resolve(skillRoot, target);
    assert.equal(
      relative(skillRoot, resolved).startsWith('..'),
      false,
      `skill reference escapes the skill root: ${target}`,
    );
    assert.equal(statSync(resolved).isFile(), true, `skill reference is missing: ${target}`);
  }

  for (const entry of walk(pluginRoot)) {
    assert.equal(entry.stats.isSymbolicLink(), false, `plugin contains a symlink: ${entry.path}`);
  }

  const packIds = [
    'calculation-baseline',
    'ziping',
    'ditianshui',
    'qiongtong',
    'sanming-symbolic-curated',
  ];
  for (const packId of packIds) {
    const directory = join(packRoot, packId);
    const manifest = readJson(join(directory, 'tradition-pack.json'));
    assert.equal(manifest.$schema, '../tradition-pack.schema.json');
    assert.equal(manifest.schemaVersion, '1');
    assert.equal(manifest.kind, 'oh-my-saju-tradition-pack');
    assert.equal(manifest.id, packId);
    assert.equal(
      manifest.version,
      versions.traditionPacks[packId],
      `${packId} version source drifted`,
    );
    assert.deepEqual(manifest.compatibility.coreEngineSchemaVersions, ['5']);
    assert.equal(manifest.compatibility.runtimeContract, 'oh-my-saju-tradition-runtime-v1');
    assert.equal(manifest.knowledge.providerContract, 'tradition-knowledge-provider-v1');
    assert.equal(manifest.knowledge.adapter, 'static-files');
    assert.deepEqual(manifest.knowledge.supportedAdapters, [
      'static-files',
      'ontology-snapshot',
      'knowledge-graph-snapshot',
    ]);
    assert.equal(manifest.knowledge.snapshot.kind, 'static-file-snapshot');
    assert.equal(manifest.knowledge.snapshot.immutability, 'content-addressed');
    assert.match(manifest.knowledge.snapshot.digest, /^[a-f0-9]{64}$/u);
    assert.equal(manifest.knowledge.snapshot.provenanceContract, 'tradition-provenance-v1');
    assert.equal(manifest.knowledge.snapshot.queryContract, 'static-resource-query-v1');
    assert.equal(manifest.runtime.execution, 'statically-registered-built-in');
    assert.equal(manifest.outputContract.kind, 'isolated-finding-set');
    assert.equal(manifest.outputContract.profileIsolation, 'no-cross-pack-voting');
    assert.equal(manifest.ontology.namespace, `urn:oh-my-saju:tradition:${packId}:v1`);
    assert.equal(manifest.ontology.materialization, 'not-built');
    assert.equal(manifest.ontology.snapshot, null);
    assert.equal(
      readdirSync(directory).includes('SKILL.md'),
      false,
      `${packId} must be a Tradition Pack, not an Agent Skill`,
    );
    const resources = [
      ...manifest.knowledge.sources,
      ...manifest.knowledge.tables,
      ...manifest.knowledge.rules,
      ...manifest.knowledge.fixtures,
      ...manifest.knowledge.provenance,
      manifest.runtime.profileModule,
      ...manifest.runtime.helperModules,
    ];
    for (const resource of resources) {
      const resolved = resolve(directory, resource);
      assert.equal(
        relative(directory, resolved).startsWith('..'),
        false,
        `${packId} resource escapes its Pack: ${resource}`,
      );
      assert.equal(statSync(resolved).isFile(), true, `${packId} resource is missing: ${resource}`);
    }
  }
  assert.notEqual(statSync(runtimePath).mode & 0o111, 0, 'bundled runtime is not executable');
  const bundledRuntime = readFileSync(runtimePath, 'utf8');
  assert.doesNotMatch(
    bundledRuntime,
    /src\/(?:interpretation|ai|agent)(?:\/|\.ts)/u,
    'bundled runtime still identifies a removed core-owned layer',
  );
  assert.doesNotMatch(
    bundledRuntime,
    /\/Users\/|[A-Za-z]:\\\\Users\\\\/u,
    'bundled runtime contains an absolute developer path',
  );

  const generatedDirectory = join(temporaryRoot, 'scripts');
  const build = spawnSync(process.execPath, ['tools/build-agent-plugin.mjs'], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      OH_MY_SAJU_PLUGIN_OUTPUT_DIRECTORY: generatedDirectory,
    },
  });
  assert.equal(build.status, 0, build.stderr || build.stdout);
  assert.deepEqual(
    readFileSync(join(generatedDirectory, 'oh-my-saju.mjs')),
    readFileSync(runtimePath),
    'bundled runtime is stale; run node tools/build-agent-plugin.mjs',
  );

  const smokeRequest = {
    calculation: {
      kind: 'exact',
      request: {
        birth: {
          date: { calendar: 'gregorian', year: 1996, month: 5, day: 27 },
          time: { hour: 6, minute: 50 },
          timeZone: 'Asia/Seoul',
        },
      },
    },
    question: '핵심 구조를 근거와 함께 설명해줘.',
  };
  const smokeTiming = { fromYear: 2026, throughYear: 2026 };
  const smoke = spawnSync(process.execPath, [runtimePath], {
    cwd: temporaryRoot,
    encoding: 'utf8',
    input: JSON.stringify({
      command: 'prepare-reading',
      request: smokeRequest,
      timing: smokeTiming,
    }),
  });
  assert.equal(smoke.status, 0, smoke.stderr || smoke.stdout);
  const result = JSON.parse(smoke.stdout);
  const expectedCoreSourceRevision = await deriveBundledCoreSourceRevision();
  assert.equal(result.ok, true);
  assert.equal(result.result.analysis.doctrines.length, 4);
  assert.equal(result.result.narrationTasks.length, 5);
  assert.equal(result.result.binding.canonicalization, 'oh-my-saju-preparation-v2');
  assert.equal(result.result.binding.core.name, 'saju-engine');
  assert.notEqual(
    result.result.binding.core.sourceRevision,
    'bundled-plugin-runtime',
    'bundled runtime still uses the non-auditable source-revision sentinel',
  );
  assert.match(
    result.result.binding.core.sourceRevision,
    /^core-content-sha256:[a-f0-9]{64}$/u,
    'bundled core source revision is not a reproducible content identity',
  );
  assert.equal(
    result.result.binding.core.sourceRevision,
    expectedCoreSourceRevision,
    'bundled core content identity does not match the production source tree',
  );
  assert.equal(
    result.result.binding.engineSourceRevision,
    result.result.binding.core.sourceRevision,
    'preparation binding duplicated different core source identities',
  );
  assert.equal(result.result.binding.runtime.name, 'oh-my-saju');
  assert.deepEqual(
    result.result.binding.packs.map(({ packRef }) => packRef.id),
    ['calculation-baseline', 'ziping', 'ditianshui', 'qiongtong', 'sanming-symbolic-curated'],
  );
  assert.equal(
    result.result.binding.packs.every(({ rulesArtifactDigest }) =>
      /^[a-f0-9]{64}$/u.test(rulesArtifactDigest),
    ),
    true,
    'preparation binding did not include every Pack rules digest',
  );
  assert.equal(result.result.timing.years[0].months.length, 12);
  assert.equal(
    JSON.stringify(result.result.narrationTasks).includes('"birth"'),
    false,
    'narration tasks leaked structured birth input',
  );

  const drafts = result.result.narrationTasks
    .filter(({ requiresDraft }) => requiresDraft)
    .map((task) => {
      const finding = task.request.evidence.findings[0];
      assert.ok(finding, `smoke task has no finding: ${task.packRef.id}`);
      return {
        packRef: task.packRef,
        output: {
          summary: {
            text: `${task.packRef.id}의 판정 근거를 구분해 설명합니다.`,
            findingIds: [finding.id],
          },
          sections: [],
        },
      };
    });
  const validateSmoke = spawnSync(process.execPath, [runtimePath], {
    cwd: temporaryRoot,
    encoding: 'utf8',
    input: JSON.stringify({
      command: 'validate-reading',
      request: smokeRequest,
      timing: smokeTiming,
      preparedDigest: result.result.binding.digest,
      narrator: { id: 'plugin-verifier', requestedModel: 'fixture-model' },
      drafts,
    }),
  });
  assert.equal(validateSmoke.status, 0, validateSmoke.stderr || validateSmoke.stdout);
  const validated = JSON.parse(validateSmoke.stdout);
  assert.equal(validated.ok, true);
  assert.equal(validated.result.binding.digest, result.result.binding.digest);
  assert.equal(validated.result.reading.packReadings.length, 5);
  assert.equal(
    validated.result.reading.packReadings.every(
      ({ reading }) => reading.audit.validation.findingReferencesValidated === true,
    ),
    true,
    'validation smoke did not exercise the finding-reference claim gate',
  );

  const traditionalSystemSmoke = spawnSync(process.execPath, [runtimePath], {
    cwd: temporaryRoot,
    encoding: 'utf8',
    input: JSON.stringify({
      schemaVersion: '1',
      command: 'run-traditional-system',
      request: {
        kind: 'iching',
        method: 'manual-lines',
        lines: [9, 7, 7, 7, 7, 7],
      },
    }),
  });
  assert.equal(
    traditionalSystemSmoke.status,
    0,
    traditionalSystemSmoke.stderr || traditionalSystemSmoke.stdout,
  );
  const traditionalSystemResult = JSON.parse(traditionalSystemSmoke.stdout);
  assert.equal(traditionalSystemResult.ok, true);
  assert.equal(traditionalSystemResult.command, 'run-traditional-system');
  assert.equal(traditionalSystemResult.result.kind, 'iching');
  assert.equal(traditionalSystemResult.result.value.baseHexagram.number, 1);
  assert.equal(traditionalSystemResult.result.value.changedHexagram.number, 44);
  assert.deepEqual(traditionalSystemResult.result.value.movingLines, [1]);
  assert.equal(traditionalSystemResult.result.audit.implementation, 'oh-my-saju-independent');
  assert.deepEqual(traditionalSystemResult.result.audit.implicitAdjustments, []);

  console.log('Oh My Saju plugin artifact verified.');
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
