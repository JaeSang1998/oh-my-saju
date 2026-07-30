/** Calculation-derived baseline Pack; it is not a classical tradition. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import type { JsonValue, TraditionRuleProfile } from '../../runtime/traditions/types';
import { GROWTH_STAGE_PROFILE_V1 } from './growth-stages';
import { COMMON_STRUCTURAL_REFERENCES_V1 } from './sources';

export { COMMON_STRUCTURAL_REFERENCES_V1 } from './sources';

/**
 * These values describe plugin-owned Pack behavior; callers cannot redefine them
 * while continuing to cite the built-in rule IDs.
 */
export const COMMON_STRUCTURAL_PARAMETERS_V1: Readonly<Record<string, JsonValue>> = deepFreeze({
  hiddenStemWeightProfile: 'visible-stems-1-hidden-stems-normalized-v1',
  hiddenStemWeightStatus: 'synthetic-visualization-only',
  branchTenGodBasis: 'main-hidden-stem',
  relationshipMode: 'raw-match-only',
  growthStageProfileId: GROWTH_STAGE_PROFILE_V1.id,
  growthStageSubject: GROWTH_STAGE_PROFILE_V1.subject,
  growthStageYinStemDirection: GROWTH_STAGE_PROFILE_V1.yinStemDirection,
  growthStageEarthStemMapping: GROWTH_STAGE_PROFILE_V1.earthStemMapping,
  growthStageInterpretation: GROWTH_STAGE_PROFILE_V1.interpretation,
  voidAnchor: 'day-pillar',
});

/**
 * Cross-school observations already supported by the deterministic engine.
 *
 * This is intentionally not a doctrine profile: it does not classify strength,
 * select a pattern/useful god, assign personality, or predict events.
 */
export const COMMON_STRUCTURAL_PROFILE_V1: TraditionRuleProfile = deepFreeze({
  schemaVersion: '1',
  id: 'common-structural',
  version: '1.1.0',
  displayName: '공통 구조 사실',
  school: 'cross-school-common',
  textualLayer: 'cross-school-common',
  status: 'stable',
  enabledRuleIds: [
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
  supportedTopics: [
    'chart-overview',
    'day-master',
    'five-elements',
    'yin-yang',
    'ten-gods',
    'relationships',
    'growth-stages',
    'void-branches',
  ],
  references: COMMON_STRUCTURAL_REFERENCES_V1,
  parameters: COMMON_STRUCTURAL_PARAMETERS_V1,
  knownLimitations: [
    'synthetic-element-balance-not-strength',
    'raw-relationships-no-fortune',
    'structural-profile-no-doctrine',
  ],
});
