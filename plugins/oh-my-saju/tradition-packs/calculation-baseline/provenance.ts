/** Reproducibility and fixture inventory owned by the calculation-baseline Pack. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import {
  artifact,
  artifactDigests,
  fixtureInventory,
  knowledgeSnapshot,
  provenanceData,
  SHARED_TRADITION_RUNTIME_PATHS,
} from '../../runtime/traditions/provenance-support';
import type { TraditionPackProvenance } from '../../runtime/traditions/types';
import artifactDigestData from './artifacts.json';
import fixtureData from './fixtures.json';
import provenanceContractData from './provenance.json';

const PACK_DIRECTORY = 'plugins/oh-my-saju/tradition-packs/calculation-baseline';
const KNOWLEDGE_RESOURCES = [
  'sources.json',
  'growth-stages.ts',
  'rules.json',
  'profile.ts',
  'fixtures.json',
  'provenance.json',
] as const;
const artifacts = artifactDigests(artifactDigestData);
const fixtures = fixtureInventory(fixtureData);
const declaredProvenance = provenanceData(provenanceContractData);

export const CALCULATION_BASELINE_PROVENANCE: TraditionPackProvenance = deepFreeze({
  ruleIds: [
    'core.day-master',
    'core.pillar-year',
    'core.pillar-month',
    'core.pillar-day',
    'core.pillar-hour',
    'core.element-balance',
    'core.yin-yang-balance',
    'core.ten-gods',
    'core.relationships',
    'core.growth-stages',
    'core.void-branches',
  ],
  fixtureSetIds: fixtures.fixtureSets.map(({ id }) => id),
  knowledgeSnapshot: knowledgeSnapshot(
    PACK_DIRECTORY,
    KNOWLEDGE_RESOURCES,
    artifacts.knowledgeSnapshot,
  ),
  editionLocks: declaredProvenance.editionLocks,
  ruleTraces: declaredProvenance.ruleTraces,
  rulesArtifact: artifact(
    [
      ...SHARED_TRADITION_RUNTIME_PATHS,
      'plugins/oh-my-saju/runtime/traditions/provenance-support.ts',
      ...KNOWLEDGE_RESOURCES.map((path) => `${PACK_DIRECTORY}/${path}`),
      `${PACK_DIRECTORY}/sources.ts`,
      `${PACK_DIRECTORY}/provenance.ts`,
      `${PACK_DIRECTORY}/tradition-pack.json`,
    ],
    artifacts.rules,
    'plugin-files',
  ),
  fixturesArtifact: artifact(
    [`${PACK_DIRECTORY}/fixtures.json`, ...fixtures.fixtureSets.flatMap(({ paths }) => paths)],
    artifacts.fixtures,
    'plugin-fixtures',
  ),
});
