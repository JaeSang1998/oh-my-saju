/** Reproducibility and fixture inventory owned by the Ditianshui Pack. */
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

const PACK_DIRECTORY = 'plugins/oh-my-saju/tradition-packs/ditianshui';
const KNOWLEDGE_RESOURCES = [
  'sources.json',
  'rules.json',
  'seasonal-state-table.json',
  'profile.ts',
  'evaluate.ts',
  'fixtures.json',
  'provenance.json',
] as const;
const artifacts = artifactDigests(artifactDigestData);
const fixtures = fixtureInventory(fixtureData);
const declaredProvenance = provenanceData(provenanceContractData);

export const DITIANSHUI_PROVENANCE: TraditionPackProvenance = deepFreeze({
  ruleIds: ['ditianshui.seasonal-state', 'ditianshui.support-ledger'],
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
      'plugins/oh-my-saju/runtime/traditions/rule-registry.ts',
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
