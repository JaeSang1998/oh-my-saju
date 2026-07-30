/** Tradition Pack ownership and reproducibility contract tests. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { calculateSajuSchoolComparison } from './calculate-school-comparison';
import {
  DEFAULT_KOREAN_TRADITION_PACK_REFS_V1,
  listTraditionPacks,
  resolveTraditionPackProfile,
} from './catalog';

function digestFiles(paths: readonly string[]): string {
  const hash = createHash('sha256');
  for (const path of paths) {
    hash.update(path, 'utf8');
    hash.update('\0');
    hash.update(readFileSync(resolve(path)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(path), 'utf8')) as unknown;
}

describe('Tradition Pack provenance', () => {
  test('each catalog contract is assembled from its Pack-local source, provenance, and fixture inventory', () => {
    for (const entry of listTraditionPacks()) {
      const packDirectory = `plugins/oh-my-saju/tradition-packs/${entry.packRef.id}`;
      const manifestPath = `${packDirectory}/tradition-pack.json`;
      const manifest = readJson(manifestPath) as {
        readonly id: string;
        readonly version: string;
        readonly compatibility: {
          readonly coreEngineSchemaVersions: readonly string[];
          readonly runtimeContract: string;
        };
        readonly knowledge: {
          readonly providerContract: string;
          readonly adapter: string;
          readonly supportedAdapters: readonly string[];
          readonly snapshot: {
            readonly digest: string;
          };
          readonly sources: readonly string[];
          readonly tables: readonly string[];
          readonly rules: readonly string[];
          readonly fixtures: readonly string[];
          readonly provenance: readonly string[];
        };
        readonly runtime: {
          readonly execution: string;
          readonly profileModule: string;
          readonly helperModules: readonly string[];
        };
        readonly ontology: {
          readonly materialization: string;
          readonly snapshot: unknown;
        };
      };
      const fixtureInventory = readJson(`${packDirectory}/fixtures.json`) as {
        readonly fixtureSets: readonly {
          readonly id: string;
          readonly paths: readonly string[];
        }[];
      };
      const provenanceLedger = readJson(`${packDirectory}/provenance.json`) as {
        readonly contract: string;
        readonly editionLocks: unknown;
        readonly ruleTraces: readonly { readonly ruleId: string }[];
      };
      const sourceLedger = readJson(`${packDirectory}/sources.json`) as {
        readonly sources: readonly { readonly id: string }[];
      };
      const artifactDigests = readJson(`${packDirectory}/artifacts.json`) as {
        readonly knowledgeSnapshot: string;
        readonly rules: string;
        readonly fixtures: string;
      };
      const profile = resolveTraditionPackProfile(entry.packRef);
      const reproducibility = entry.contract.reproducibility;
      const knowledgeResources = [
        ...manifest.knowledge.sources,
        ...manifest.knowledge.tables,
        ...manifest.knowledge.rules,
        ...manifest.knowledge.fixtures,
        ...manifest.knowledge.provenance,
      ].map((path) => `${packDirectory}/${path}`);

      expect(profile).toBeDefined();
      expect({ id: manifest.id, version: manifest.version }).toEqual(entry.packRef);
      expect(manifest.compatibility).toEqual({
        coreEngineSchemaVersions: ['5'],
        runtimeContract: 'oh-my-saju-tradition-runtime-v1',
      });
      expect(manifest.runtime.execution).toBe('statically-registered-built-in');
      expect(manifest.knowledge).toMatchObject({
        providerContract: 'tradition-knowledge-provider-v1',
        adapter: 'static-files',
        supportedAdapters: ['static-files', 'ontology-snapshot', 'knowledge-graph-snapshot'],
      });
      expect(manifest.ontology).toMatchObject({ materialization: 'not-built', snapshot: null });
      expect(entry.contract.ruleIds).toEqual(profile!.enabledRuleIds);
      expect(entry.contract.ruleIds).toEqual(
        provenanceLedger.ruleTraces.map(({ ruleId }) => ruleId),
      );
      expect(entry.contract.fixtureSetIds).toEqual(
        fixtureInventory.fixtureSets.map(({ id }) => id),
      );
      expect(profile!.references.map(({ id }) => id)).toEqual(
        sourceLedger.sources.map(({ id }) => id),
      );
      expect(provenanceLedger.contract).toBe('tradition-provenance-v1');
      expect(reproducibility.editionLocks).toEqual(provenanceLedger.editionLocks);
      expect(reproducibility.ruleTraces).toEqual(provenanceLedger.ruleTraces);

      expect(reproducibility.knowledgeSnapshot).toMatchObject({
        providerContract: 'tradition-knowledge-provider-v1',
        adapter: 'static-files',
        kind: 'static-file-snapshot',
        version: '1.0.0',
        immutability: 'content-addressed',
        algorithm: 'sha256',
        canonicalization: 'ordered-file-bytes-with-path-v1',
        provenanceContract: 'tradition-provenance-v1',
        queryContract: 'static-resource-query-v1',
      });
      expect(reproducibility.knowledgeSnapshot.paths).toEqual([...knowledgeResources].sort());
      expect(reproducibility.knowledgeSnapshot.digest).toBe(manifest.knowledge.snapshot.digest);
      expect(reproducibility.knowledgeSnapshot.digest).toBe(artifactDigests.knowledgeSnapshot);

      expect(reproducibility.rulesArtifact.paths).toEqual(
        [...reproducibility.rulesArtifact.paths].sort(),
      );
      expect(reproducibility.fixturesArtifact.paths).toEqual(
        [...reproducibility.fixturesArtifact.paths].sort(),
      );
      expect(reproducibility.rulesArtifact.retrieval.representation).toBe('plugin-files');
      expect(reproducibility.fixturesArtifact.retrieval.representation).toBe('plugin-fixtures');
      expect(reproducibility.rulesArtifact.paths).toEqual(
        expect.arrayContaining([
          'plugins/oh-my-saju/tradition-packs/tradition-pack.schema.json',
          manifestPath,
          `${packDirectory}/sources.ts`,
          `${packDirectory}/provenance.ts`,
          ...knowledgeResources,
          ...[manifest.runtime.profileModule, ...manifest.runtime.helperModules].map(
            (path) => `${packDirectory}/${path}`,
          ),
        ]),
      );
      expect(reproducibility.fixturesArtifact.paths).toEqual(
        [
          `${packDirectory}/fixtures.json`,
          ...fixtureInventory.fixtureSets.flatMap(({ paths }) => paths),
        ].sort(),
      );
      expect(reproducibility.rulesArtifact.digest).toBe(artifactDigests.rules);
      expect(reproducibility.fixturesArtifact.digest).toBe(artifactDigests.fixtures);

      expect
        .soft(digestFiles(reproducibility.knowledgeSnapshot.paths))
        .toBe(reproducibility.knowledgeSnapshot.digest);
      expect
        .soft(digestFiles(reproducibility.rulesArtifact.paths))
        .toBe(reproducibility.rulesArtifact.digest);
      expect
        .soft(digestFiles(reproducibility.fixturesArtifact.paths))
        .toBe(reproducibility.fixturesArtifact.digest);
    }
  });

  test('every finding cites exactly the source ledger declared by its Pack trace', () => {
    const entriesByPack = new Map(
      listTraditionPacks().map((entry) => [`${entry.packRef.id}@${entry.packRef.version}`, entry]),
    );
    const result = calculateSajuSchoolComparison(
      {
        kind: 'exact',
        request: {
          birth: {
            date: { calendar: 'gregorian', year: 1996, month: 5, day: 27 },
            time: { hour: 6, minute: 50 },
            timeZone: 'Asia/Seoul',
          },
        },
      },
      { packRefs: DEFAULT_KOREAN_TRADITION_PACK_REFS_V1 },
    );

    for (const packResult of result.packResults) {
      const entry = entriesByPack.get(`${packResult.packRef.id}@${packResult.packRef.version}`);
      expect(entry).toBeDefined();
      const traces = entry!.contract.reproducibility.ruleTraces;
      const tracesByRule = new Map(traces.map((trace) => [trace.ruleId, trace]));

      expect(new Set(tracesByRule.keys())).toEqual(new Set(entry!.contract.ruleIds));
      for (const finding of packResult.interpretation.findings) {
        expect(finding.sourceReferenceIds).toEqual(
          tracesByRule.get(finding.ruleId)?.sourceReferenceIds,
        );
      }
    }
  });

  test('classical Pack artifacts use the shared kernel but own their source and provenance modules', () => {
    const pathsByPack = Object.fromEntries(
      listTraditionPacks()
        .filter(({ kind }) => kind === 'classical-doctrine')
        .map(({ packRef, contract }) => [packRef.id, contract.reproducibility.rulesArtifact.paths]),
    );
    const shared = [
      'plugins/oh-my-saju/runtime/traditions/provenance-support.ts',
      'plugins/oh-my-saju/runtime/traditions/rule-helpers.ts',
      'plugins/oh-my-saju/runtime/traditions/rule-registry.ts',
    ];

    for (const [packId, paths] of Object.entries(pathsByPack)) {
      expect(paths).toEqual(expect.arrayContaining(shared));
      expect(paths).toContain(`plugins/oh-my-saju/tradition-packs/${packId}/sources.ts`);
      expect(paths).toContain(`plugins/oh-my-saju/tradition-packs/${packId}/provenance.ts`);
      expect(paths).not.toContain('plugins/oh-my-saju/runtime/traditions/source-references.ts');
      expect(paths).not.toContain('plugins/oh-my-saju/runtime/traditions/pack-provenance.ts');
    }
    expect(pathsByPack.ziping).toContain('plugins/oh-my-saju/tradition-packs/ziping/evaluate.ts');
    expect(pathsByPack.ziping).not.toContain(
      'plugins/oh-my-saju/tradition-packs/ditianshui/evaluate.ts',
    );
    expect(pathsByPack.ditianshui).toContain(
      'plugins/oh-my-saju/tradition-packs/ditianshui/evaluate.ts',
    );
    expect(pathsByPack.ditianshui).not.toContain(
      'plugins/oh-my-saju/tradition-packs/qiongtong/evaluate.ts',
    );
    expect(pathsByPack.qiongtong).toEqual(
      expect.arrayContaining([
        'plugins/oh-my-saju/tradition-packs/qiongtong/evaluate.ts',
        'plugins/oh-my-saju/tradition-packs/qiongtong/qiongtong-table-v1.ts',
      ]),
    );
  });

  test('classical Packs disclose pending checksums and independent-review status', () => {
    const entries = listTraditionPacks().filter(({ kind }) => kind === 'classical-doctrine');
    expect(entries).toHaveLength(4);
    for (const { contract } of entries) {
      expect(
        contract.reproducibility.editionLocks.every(
          ({ contentSha256, status }) => contentSha256 === null && status === 'checksum-pending',
        ),
      ).toBe(true);
      expect(
        contract.reproducibility.ruleTraces.every(
          ({ transcriptionSha256, reviewerIds }) =>
            transcriptionSha256 === null && reviewerIds.length === 0,
        ),
      ).toBe(true);
    }
  });

  test('runtime-tested reconstruction locators point into the owning Pack artifact', () => {
    let runtimeTestedPackCount = 0;
    for (const entry of listTraditionPacks().filter(({ kind }) => kind === 'classical-doctrine')) {
      const profile = resolveTraditionPackProfile(entry.packRef);
      expect(profile).toBeDefined();
      const artifactPaths = new Set(entry.contract.reproducibility.rulesArtifact.paths);
      const runtimeReferences = profile!.references.filter(
        ({ verification, locator }) =>
          verification === 'engine-tested' && locator?.startsWith('plugins/oh-my-saju/'),
      );
      if (runtimeReferences.length === 0) continue;
      runtimeTestedPackCount += 1;
      for (const reference of runtimeReferences) {
        const paths = reference.locator?.match(/plugins\/oh-my-saju\/[A-Za-z0-9/_.-]+\.ts/g) ?? [];
        expect(paths.length).toBeGreaterThan(0);
        expect(paths.every((path) => artifactPaths.has(path))).toBe(true);
      }
    }
    expect(runtimeTestedPackCount).toBeGreaterThan(0);
  });
});
