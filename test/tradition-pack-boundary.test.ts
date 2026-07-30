import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const PACK_ROOT = resolve('plugins/oh-my-saju/tradition-packs');
const PACK_IDS = [
  'calculation-baseline',
  'ziping',
  'ditianshui',
  'qiongtong',
  'sanming-symbolic-curated',
] as const;

interface TraditionPackManifest {
  readonly $schema: string;
  readonly schemaVersion: string;
  readonly kind: string;
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
      readonly kind: string;
      readonly version: string;
      readonly immutability: string;
      readonly algorithm: string;
      readonly canonicalization: string;
      readonly digest: string;
      readonly provenanceContract: string;
      readonly queryContract: string;
    };
    readonly sources: readonly string[];
    readonly tables: readonly string[];
    readonly rules: readonly string[];
    readonly fixtures: readonly string[];
    readonly provenance: readonly string[];
  };
  readonly outputContract: {
    readonly kind: string;
    readonly profileIsolation: string;
  };
  readonly ontology: {
    readonly namespace: string;
    readonly materialization: string;
    readonly snapshot: unknown;
  };
}

function readManifest(id: string): TraditionPackManifest {
  const path = join(PACK_ROOT, id, 'tradition-pack.json');
  return JSON.parse(readFileSync(path, 'utf8')) as TraditionPackManifest;
}

describe('Tradition Pack boundary', () => {
  test.each(PACK_IDS)('%s is data/rules, not an Agent Skill', (id) => {
    const manifestPath = join(PACK_ROOT, id, 'tradition-pack.json');
    const manifest = readManifest(id);

    expect(manifest).toMatchObject({
      $schema: '../tradition-pack.schema.json',
      schemaVersion: '1',
      kind: 'oh-my-saju-tradition-pack',
      id,
      compatibility: {
        coreEngineSchemaVersions: ['5'],
        runtimeContract: 'oh-my-saju-tradition-runtime-v1',
      },
      knowledge: {
        providerContract: 'tradition-knowledge-provider-v1',
        adapter: 'static-files',
        supportedAdapters: ['static-files', 'ontology-snapshot', 'knowledge-graph-snapshot'],
        snapshot: {
          kind: 'static-file-snapshot',
          version: '1.0.0',
          immutability: 'content-addressed',
          algorithm: 'sha256',
          canonicalization: 'ordered-file-bytes-with-path-v1',
          provenanceContract: 'tradition-provenance-v1',
          queryContract: 'static-resource-query-v1',
        },
      },
      outputContract: {
        kind: 'isolated-finding-set',
        profileIsolation: 'no-cross-pack-voting',
      },
      ontology: {
        materialization: 'not-built',
        snapshot: null,
      },
    });
    expect(existsSync(resolve(dirname(manifestPath), manifest.$schema))).toBe(true);
    expect(manifest.ontology.namespace).toBe(`urn:oh-my-saju:tradition:${id}:v1`);
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(manifest.knowledge.snapshot.digest).toMatch(/^[a-f0-9]{64}$/u);
    expect(existsSync(join(dirname(manifestPath), 'SKILL.md'))).toBe(false);

    const resources = [
      ...manifest.knowledge.sources,
      ...manifest.knowledge.tables,
      ...manifest.knowledge.rules,
      ...manifest.knowledge.fixtures,
      ...manifest.knowledge.provenance,
    ];
    expect(resources.length).toBeGreaterThan(0);
    for (const resource of resources) {
      const resolved = resolve(dirname(manifestPath), resource);
      expect(relative(dirname(manifestPath), resolved).startsWith('..')).toBe(false);
      expect(existsSync(resolved), `${id} is missing ${resource}`).toBe(true);
    }
  });
});
