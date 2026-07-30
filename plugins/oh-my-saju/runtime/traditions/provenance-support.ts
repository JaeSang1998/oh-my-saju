/** Generic helpers for Pack-owned, content-addressed provenance declarations. */
import type { TraditionPackContract, TraditionPackProvenance } from './types';

export const OH_MY_SAJU_REPOSITORY_URL =
  'https://github.com/JaeSang1998/oh-my-saju/tree/main/plugins/oh-my-saju';

type Reproducibility = TraditionPackContract['reproducibility'];

export const SHARED_TRADITION_RUNTIME_PATHS = [
  'plugins/oh-my-saju/tradition-packs/tradition-pack.schema.json',
  'plugins/oh-my-saju/runtime/internal/canonical-json.ts',
  'plugins/oh-my-saju/runtime/internal/deep-freeze.ts',
  'plugins/oh-my-saju/runtime/internal/guards.ts',
  'plugins/oh-my-saju/runtime/reading/prompt-contract.ts',
  'plugins/oh-my-saju/runtime/traditions/catalog.ts',
  'plugins/oh-my-saju/runtime/traditions/domain.ts',
  'plugins/oh-my-saju/runtime/traditions/evaluate.ts',
  'plugins/oh-my-saju/runtime/traditions/profile-limitations.ts',
  'plugins/oh-my-saju/runtime/traditions/rule-contracts.ts',
  'plugins/oh-my-saju/runtime/traditions/rule-evaluator-types.ts',
  'plugins/oh-my-saju/runtime/traditions/rule-helpers.ts',
] as const;

export function artifact<const Representation extends 'plugin-files' | 'plugin-fixtures'>(
  paths: readonly string[],
  digest: string,
  representation: Representation,
): {
  readonly algorithm: 'sha256';
  readonly canonicalization: 'ordered-file-bytes-with-path-v1';
  readonly paths: readonly string[];
  readonly digest: string;
  readonly retrieval: {
    readonly packageUrl: string;
    readonly representation: Representation;
  };
} {
  return {
    algorithm: 'sha256',
    canonicalization: 'ordered-file-bytes-with-path-v1',
    paths: [...paths].sort(),
    digest,
    retrieval: {
      packageUrl: OH_MY_SAJU_REPOSITORY_URL,
      representation,
    },
  };
}

export function knowledgeSnapshot(
  packDirectory: string,
  resourcePaths: readonly string[],
  digest: string,
): Reproducibility['knowledgeSnapshot'] {
  return {
    providerContract: 'tradition-knowledge-provider-v1',
    adapter: 'static-files',
    kind: 'static-file-snapshot',
    version: '1.0.0',
    immutability: 'content-addressed',
    algorithm: 'sha256',
    canonicalization: 'ordered-file-bytes-with-path-v1',
    digest,
    provenanceContract: 'tradition-provenance-v1',
    queryContract: 'static-resource-query-v1',
    paths: resourcePaths.map((path) => `${packDirectory}/${path}`).sort(),
  };
}

export function provenanceData(
  value: unknown,
): Pick<TraditionPackProvenance, 'editionLocks' | 'ruleTraces'> {
  return value as Pick<TraditionPackProvenance, 'editionLocks' | 'ruleTraces'>;
}

export function fixtureInventory(value: unknown): {
  readonly fixtureSets: readonly {
    readonly id: string;
    readonly paths: readonly string[];
  }[];
} {
  return value as {
    readonly fixtureSets: readonly {
      readonly id: string;
      readonly paths: readonly string[];
    }[];
  };
}

export function artifactDigests(value: unknown): {
  readonly knowledgeSnapshot: string;
  readonly rules: string;
  readonly fixtures: string;
} {
  return value as {
    readonly knowledgeSnapshot: string;
    readonly rules: string;
    readonly fixtures: string;
  };
}
