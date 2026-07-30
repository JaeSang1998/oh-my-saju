import { deepFreeze } from './internal/deep-freeze';

/** Provenance owned by the plugin runtime, deliberately separate from ENGINE_MANIFEST. */
export const OH_MY_SAJU_RUNTIME_MANIFEST = deepFreeze({
  runtime: {
    name: 'oh-my-saju',
    version: '0.4.0',
    schemaVersion: '1',
  },
  compatibility: {
    coreEngineSchemaVersions: ['5'],
  },
  traditions: {
    reportSchemaVersion: '2',
    packContractSchemaVersion: '1',
    catalogVersion: '4',
    profileIsolation: 'one-pack-per-finding-set',
    crossPackVoting: false,
  },
  reading: {
    promptTemplate: {
      id: 'saju-grounded-narration',
      version: '2.0.0',
    },
    outputSchemaVersion: '2',
    claimGateVersion: '2',
  },
} as const);

export type OhMySajuRuntimeManifest = typeof OH_MY_SAJU_RUNTIME_MANIFEST;
