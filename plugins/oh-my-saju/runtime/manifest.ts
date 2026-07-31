import { deepFreeze } from './internal/deep-freeze';
import { SAJU_NARRATION_PROMPT_TEMPLATE } from './reading/prompt-contract';

/** Provenance owned by the plugin runtime, deliberately separate from ENGINE_MANIFEST. */
export const OH_MY_SAJU_RUNTIME_MANIFEST = deepFreeze({
  runtime: {
    name: 'oh-my-saju',
    version: '0.4.5',
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
    promptTemplate: SAJU_NARRATION_PROMPT_TEMPLATE,
    outputSchemaVersion: '3',
    claimGateVersion: '3',
  },
} as const);

export type OhMySajuRuntimeManifest = typeof OH_MY_SAJU_RUNTIME_MANIFEST;
