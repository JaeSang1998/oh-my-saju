/** Reproducibility inventory owned by the curated Sanming symbolic-star overlay. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import {
  artifact,
  artifactDigests,
  fixtureInventory,
  knowledgeSnapshot,
  SHARED_TRADITION_RUNTIME_PATHS,
} from '../../runtime/traditions/provenance-support';
import type { TraditionPackProvenance } from '../../runtime/traditions/types';
import {
  SANMING_SYMBOLIC_CURATED_RULE_IDS_V1,
  type SanmingSymbolicCuratedRuleId,
} from './evaluate';
import artifactDigestData from './artifacts.json';
import fixtureData from './fixtures.json';
import provenanceContractData from './provenance.json';

type SanmingSymbolicCuratedRuleTrace = Omit<
  TraditionPackProvenance['ruleTraces'][number],
  'ruleId'
> & {
  readonly ruleId: SanmingSymbolicCuratedRuleId;
};

type SanmingSymbolicCuratedProvenance = Omit<TraditionPackProvenance, 'ruleIds' | 'ruleTraces'> & {
  readonly ruleIds: readonly SanmingSymbolicCuratedRuleId[];
  readonly ruleTraces: readonly SanmingSymbolicCuratedRuleTrace[];
};

const PACK_DIRECTORY = 'plugins/oh-my-saju/tradition-packs/sanming-symbolic-curated';
const KNOWLEDGE_RESOURCES = [
  'sources.json',
  'rules.json',
  'profile.ts',
  'evaluate.ts',
  'fixtures.json',
  'provenance.json',
] as const;
const artifacts = artifactDigests(artifactDigestData);
const fixtures = fixtureInventory(fixtureData);
const declaredProvenance = provenanceContractData as {
  readonly editionLocks: TraditionPackProvenance['editionLocks'];
  readonly ruleTraces: readonly SanmingSymbolicCuratedRuleTrace[];
};

export const SANMING_SYMBOLIC_CURATED_PROVENANCE: SanmingSymbolicCuratedProvenance = deepFreeze({
  ruleIds: SANMING_SYMBOLIC_CURATED_RULE_IDS_V1,
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
