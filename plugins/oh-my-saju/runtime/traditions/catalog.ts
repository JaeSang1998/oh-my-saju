/** Plugin-owned catalog of installed Tradition Packs. */
import { deepFreeze } from '../internal/deep-freeze';
import { COMMON_STRUCTURAL_PROFILE_V1 } from '../../tradition-packs/calculation-baseline/profile';
import { CALCULATION_BASELINE_PROVENANCE } from '../../tradition-packs/calculation-baseline/provenance';
import { DITIANSHUI_STRENGTH_EVIDENCE_PROFILE_V1 } from '../../tradition-packs/ditianshui/profile';
import { DITIANSHUI_PROVENANCE } from '../../tradition-packs/ditianshui/provenance';
import { QIONGTONG_CLIMATE_PROFILE_V1 } from '../../tradition-packs/qiongtong/profile';
import { QIONGTONG_PROVENANCE } from '../../tradition-packs/qiongtong/provenance';
import { SANMING_SYMBOLIC_CURATED_PROFILE_V1 } from '../../tradition-packs/sanming-symbolic-curated/profile';
import { SANMING_SYMBOLIC_CURATED_PROVENANCE } from '../../tradition-packs/sanming-symbolic-curated/provenance';
import { ZIPING_MONTH_COMMAND_PROFILE_V1 } from '../../tradition-packs/ziping/profile';
import { ZIPING_PROVENANCE } from '../../tradition-packs/ziping/provenance';
import { interpretationRuleContract } from './rule-contracts';
import type {
  TraditionProfileRef,
  TraditionRuleProfile,
  TraditionPackCatalogEntry,
  TraditionPackContract,
  TraditionPackProvenance,
  TraditionPackRef,
} from './types';

function profileRef(profile: TraditionRuleProfile): TraditionProfileRef {
  return deepFreeze({ id: profile.id, version: profile.version });
}

function contract(
  profile: TraditionRuleProfile,
  provenance: TraditionPackProvenance,
  aiEnabled: boolean,
): TraditionPackContract {
  if (
    provenance.ruleIds.length !== profile.enabledRuleIds.length ||
    provenance.ruleIds.some((ruleId, index) => ruleId !== profile.enabledRuleIds[index])
  ) {
    throw new Error(
      `Pack provenance rule inventory drifted from ${profile.id}@${profile.version}.`,
    );
  }
  return deepFreeze({
    schemaVersion: '1',
    ruleIds: profile.enabledRuleIds,
    sourceReferenceIds: profile.references.map(({ id }) => id),
    requiredPillarsByRule: Object.fromEntries(
      profile.enabledRuleIds.map((ruleId) => [
        ruleId,
        interpretationRuleContract(ruleId).requiredPillars,
      ]),
    ),
    observedPillarsByRule: Object.fromEntries(
      profile.enabledRuleIds.map((ruleId) => [
        ruleId,
        interpretationRuleContract(ruleId).observedPillars,
      ]),
    ),
    missingInputBehavior: 'return-unavailable-rule',
    fixtureSetIds: provenance.fixtureSetIds,
    reproducibility: {
      knowledgeSnapshot: provenance.knowledgeSnapshot,
      editionLocks: provenance.editionLocks,
      ruleTraces: provenance.ruleTraces,
      rulesArtifact: provenance.rulesArtifact,
      fixturesArtifact: provenance.fixturesArtifact,
    },
    aiPromptTemplate: aiEnabled
      ? {
          id: 'saju-grounded-narration',
          version: '2.0.0',
          findingsFromOnePackOnly: true,
        }
      : null,
  });
}

const CALCULATION_BASELINE_PACK_REF = deepFreeze({
  id: 'calculation-baseline',
  version: '1.1.0',
} as const);
const ZIPING_PACK_REF = deepFreeze({ id: 'ziping', version: '1.0.0' } as const);
const DITIANSHUI_PACK_REF = deepFreeze({ id: 'ditianshui', version: '1.0.0' } as const);
const QIONGTONG_PACK_REF = deepFreeze({ id: 'qiongtong', version: '1.0.0' } as const);
const SANMING_SYMBOLIC_CURATED_PACK_REF = deepFreeze({
  id: 'sanming-symbolic-curated',
  version: '1.1.0',
} as const);

const CATALOG: readonly TraditionPackCatalogEntry[] = deepFreeze([
  {
    packRef: CALCULATION_BASELINE_PACK_REF,
    profileRef: profileRef(COMMON_STRUCTURAL_PROFILE_V1),
    displayName: COMMON_STRUCTURAL_PROFILE_V1.displayName,
    kind: 'cross-school-baseline',
    productPriority: 0,
    lineage: {
      work: 'saju-engine deterministic calculation contract',
      textualLayer: 'cross-school-common',
    },
    supportedTopics: COMMON_STRUCTURAL_PROFILE_V1.supportedTopics,
    execution: {
      deterministicGrounding: true,
      aiSynthesis: 'optional',
      crossPackRawFindingMixing: 'forbidden',
    },
    maturity: {
      runtime: 'stable',
      implementation: 'complete-for-declared-output',
      doctrineCoverage: 'not-applicable',
      outputBoundary: 'chart-observation',
      sourceCoverage: {
        status: 'complete',
        verifiedUnits: 11,
        totalUnits: 11,
        unit: 'rules',
      },
      implementedCapabilityIds: [...COMMON_STRUCTURAL_PROFILE_V1.enabledRuleIds],
      unresolvedCapabilityIds: [],
    },
    contract: contract(COMMON_STRUCTURAL_PROFILE_V1, CALCULATION_BASELINE_PROVENANCE, true),
    assurance: {
      release: 'stable',
      sourceFidelity: 'engine-tested',
      fixtureMaturity: 'exhaustive',
      expertReview: 'not-reviewed',
      predictiveValidity: 'not-established',
    },
    adoption: {
      status: 'documented',
      market: 'ko-KR',
      asOf: '2026-07-28',
      sourceReferenceIds: ['saju-engine-calculation-contract-v1'],
      note: 'foundational-calculation',
    },
  },
  {
    packRef: ZIPING_PACK_REF,
    profileRef: profileRef(ZIPING_MONTH_COMMAND_PROFILE_V1),
    displayName: ZIPING_MONTH_COMMAND_PROFILE_V1.displayName,
    kind: 'classical-doctrine',
    productPriority: 10,
    lineage: {
      work: '子平真詮',
      attributedAuthor: '沈孝瞻',
      commentator: '徐樂吾 판본을 포함한 전승층',
      textualLayer: 'reconstruction',
    },
    supportedTopics: ZIPING_MONTH_COMMAND_PROFILE_V1.supportedTopics,
    execution: {
      deterministicGrounding: true,
      aiSynthesis: 'optional',
      crossPackRawFindingMixing: 'forbidden',
    },
    maturity: {
      runtime: 'stable',
      implementation: 'complete-for-declared-output',
      doctrineCoverage: 'partial',
      outputBoundary: 'traditional-candidates',
      sourceCoverage: {
        status: 'partial',
        verifiedUnits: 1,
        totalUnits: 2,
        unit: 'rules',
      },
      implementedCapabilityIds: [
        'ziping.month-hidden-stems',
        'ziping.main-hidden-stem',
        'ziping.surface-transparency',
        'ziping.unranked-pattern-candidates',
        'ziping.lu-yang-blade-base-candidate',
      ],
      unresolvedCapabilityIds: [
        'ziping.governing-days',
        'ziping.success-defeat-rescue',
        'ziping.final-pattern',
        'ziping.useful-god',
      ],
    },
    contract: contract(ZIPING_MONTH_COMMAND_PROFILE_V1, ZIPING_PROVENANCE, true),
    assurance: {
      release: 'stable',
      sourceFidelity: 'transcription-located',
      fixtureMaturity: 'basic',
      expertReview: 'not-reviewed',
      predictiveValidity: 'not-established',
    },
    adoption: {
      status: 'documented',
      market: 'ko-KR',
      asOf: '2026-07-28',
      sourceReferenceIds: ['korean-yongshin-methods-study-v1'],
      note: 'canonical-academic-reference',
    },
  },
  {
    packRef: DITIANSHUI_PACK_REF,
    profileRef: profileRef(DITIANSHUI_STRENGTH_EVIDENCE_PROFILE_V1),
    displayName: DITIANSHUI_STRENGTH_EVIDENCE_PROFILE_V1.displayName,
    kind: 'classical-doctrine',
    productPriority: 20,
    lineage: {
      work: '滴天髓闡微 strength frame + 三命通會 seasonal-state table',
      commentator: '任鐵樵',
      textualLayer: 'reconstruction',
    },
    supportedTopics: DITIANSHUI_STRENGTH_EVIDENCE_PROFILE_V1.supportedTopics,
    execution: {
      deterministicGrounding: true,
      aiSynthesis: 'optional',
      crossPackRawFindingMixing: 'forbidden',
    },
    maturity: {
      runtime: 'stable',
      implementation: 'complete-for-declared-output',
      doctrineCoverage: 'partial',
      outputBoundary: 'traditional-evidence',
      sourceCoverage: {
        status: 'partial',
        verifiedUnits: 1,
        totalUnits: 2,
        unit: 'rules',
      },
      implementedCapabilityIds: [
        'sanming.seasonal-state-table',
        'ditianshui.visible-hidden-evidence-ledger',
      ],
      unresolvedCapabilityIds: [
        'ditianshui.evidence-weighting',
        'ditianshui.final-strength',
        'ditianshui.follow-transform-patterns',
      ],
    },
    contract: contract(DITIANSHUI_STRENGTH_EVIDENCE_PROFILE_V1, DITIANSHUI_PROVENANCE, true),
    assurance: {
      release: 'stable',
      sourceFidelity: 'transcription-located',
      fixtureMaturity: 'basic',
      expertReview: 'not-reviewed',
      predictiveValidity: 'not-established',
    },
    adoption: {
      status: 'documented',
      market: 'ko-KR',
      asOf: '2026-07-28',
      sourceReferenceIds: ['korean-yongshin-methods-study-v1'],
      note: 'canonical-academic-reference',
    },
  },
  {
    packRef: QIONGTONG_PACK_REF,
    profileRef: profileRef(QIONGTONG_CLIMATE_PROFILE_V1),
    displayName: QIONGTONG_CLIMATE_PROFILE_V1.displayName,
    kind: 'classical-doctrine',
    productPriority: 30,
    lineage: {
      work: '窮通寶鑑',
      textualLayer: 'reconstruction',
    },
    supportedTopics: QIONGTONG_CLIMATE_PROFILE_V1.supportedTopics,
    execution: {
      deterministicGrounding: true,
      aiSynthesis: 'optional',
      crossPackRawFindingMixing: 'forbidden',
    },
    maturity: {
      runtime: 'stable',
      implementation: 'complete-for-declared-output',
      doctrineCoverage: 'partial',
      outputBoundary: 'traditional-candidates',
      sourceCoverage: {
        status: 'partial',
        verifiedUnits: 7,
        totalUnits: 120,
        unit: 'cells',
      },
      implementedCapabilityIds: [
        'qiongtong.120-cell-candidate-table',
        'qiongtong.candidate-presence',
        'qiongtong.7-cell-source-audit',
      ],
      unresolvedCapabilityIds: [
        'qiongtong.113-cell-source-audit',
        'qiongtong.condition-evaluation',
        'qiongtong.final-climate-useful-god',
      ],
    },
    contract: contract(QIONGTONG_CLIMATE_PROFILE_V1, QIONGTONG_PROVENANCE, true),
    assurance: {
      release: 'stable',
      sourceFidelity: 'unverified',
      fixtureMaturity: 'basic',
      expertReview: 'not-reviewed',
      predictiveValidity: 'not-established',
    },
    adoption: {
      status: 'documented',
      market: 'ko-KR',
      asOf: '2026-07-28',
      sourceReferenceIds: ['korean-yongshin-methods-study-v1'],
      note: 'method-documented-no-market-share',
    },
  },
  {
    packRef: SANMING_SYMBOLIC_CURATED_PACK_REF,
    profileRef: profileRef(SANMING_SYMBOLIC_CURATED_PROFILE_V1),
    displayName: SANMING_SYMBOLIC_CURATED_PROFILE_V1.displayName,
    kind: 'classical-doctrine',
    productPriority: 40,
    lineage: {
      work: '三命通會',
      attributedAuthor: '萬民英',
      textualLayer: 'base-text',
    },
    supportedTopics: SANMING_SYMBOLIC_CURATED_PROFILE_V1.supportedTopics,
    execution: {
      deterministicGrounding: true,
      aiSynthesis: 'optional',
      crossPackRawFindingMixing: 'forbidden',
    },
    maturity: {
      runtime: 'stable',
      implementation: 'complete-for-declared-output',
      doctrineCoverage: 'partial',
      outputBoundary: 'traditional-evidence',
      sourceCoverage: {
        status: 'complete',
        verifiedUnits: 15,
        totalUnits: 15,
        unit: 'rules',
      },
      implementedCapabilityIds: [
        'sanming.eight-triad-stars.raw-branch-match',
        'sanming.lonely-widow.raw-branch-match',
        'sanming.heavenly-noble.unsplit-pair',
        'sanming.lu.raw-branch-match',
        'sanming.literary-star.raw-branch-match',
        'sanming.blade-after-lu-all-stems.raw-branch-match',
        'sanming.blade-yang-stems-only.raw-branch-match',
        'sanming.unknown-hour-partial-observation',
      ],
      unresolvedCapabilityIds: [
        'sanming.xianchi-heavenly-stem-nayin-qualification',
        'sanming.blade-variant-selection',
        'sanming.symbolic-star-meaning',
      ],
    },
    contract: contract(
      SANMING_SYMBOLIC_CURATED_PROFILE_V1,
      SANMING_SYMBOLIC_CURATED_PROVENANCE,
      true,
    ),
    assurance: {
      release: 'stable',
      sourceFidelity: 'transcription-located',
      fixtureMaturity: 'exhaustive',
      expertReview: 'not-reviewed',
      predictiveValidity: 'not-established',
    },
    adoption: {
      status: 'documented',
      market: 'ko-KR',
      asOf: '2026-07-30',
      sourceReferenceIds: ['sanming-tonghui-travel-horse-v1'],
      note: 'no-quantitative-market-survey',
    },
  },
]);

const PROFILES: readonly TraditionRuleProfile[] = deepFreeze([
  COMMON_STRUCTURAL_PROFILE_V1,
  ZIPING_MONTH_COMMAND_PROFILE_V1,
  DITIANSHUI_STRENGTH_EVIDENCE_PROFILE_V1,
  QIONGTONG_CLIMATE_PROFILE_V1,
  SANMING_SYMBOLIC_CURATED_PROFILE_V1,
]);

const PROFILE_BY_PACK_KEY = new Map(
  CATALOG.map(
    (entry, index) => [`${entry.packRef.id}@${entry.packRef.version}`, PROFILES[index]!] as const,
  ),
);

export const DEFAULT_KOREAN_TRADITION_PACK_REFS_V1: readonly TraditionPackRef[] = deepFreeze([
  CALCULATION_BASELINE_PACK_REF,
  ZIPING_PACK_REF,
  DITIANSHUI_PACK_REF,
  QIONGTONG_PACK_REF,
  SANMING_SYMBOLIC_CURATED_PACK_REF,
]);

export function listTraditionPacks(): readonly TraditionPackCatalogEntry[] {
  return CATALOG;
}

export function resolveTraditionPackProfile(
  packRef: TraditionPackRef,
): TraditionRuleProfile | undefined {
  return PROFILE_BY_PACK_KEY.get(`${packRef.id}@${packRef.version}`);
}

export const BUILT_IN_TRADITION_PROFILES_V1: readonly TraditionRuleProfile[] = PROFILES;
