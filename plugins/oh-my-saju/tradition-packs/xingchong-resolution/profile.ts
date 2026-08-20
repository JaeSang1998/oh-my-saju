/** Xingchong Resolution Tradition Pack profile declaration. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import type { JsonValue, TraditionRuleProfile } from '../../runtime/traditions/types';
import { XINGCHONG_RESOLUTION_RULE_IDS_V1, type XingchongResolutionRuleId } from './evaluate';
import {
  SANMING_XINGCHONG_REFERENCE_V1,
  XINGCHONG_ENGINE_RECONSTRUCTION_REFERENCE_V1,
  YUANHAI_ZIPING_COMBINATION_REFERENCE_V1,
} from './sources';

type XingchongResolutionProfile = Omit<TraditionRuleProfile, 'enabledRuleIds'> & {
  readonly enabledRuleIds: readonly XingchongResolutionRuleId[];
};

export const XINGCHONG_RESOLUTION_PARAMETERS_V1: Readonly<Record<string, JsonValue>> = deepFreeze({
  relationTables: 'xingchong-branch-relation-tables-v1',
  partialDirectionalBureau: 'not-recognized',
  halfBureauGrades: ['strong-half', 'weak-half', 'not-formed'],
  triadPeakBranches: ['자', '오', '묘', '유'],
  wumeiTransform: 'earth',
  wumeiDivergence: 'earth-or-fire-split',
  sixHarmonyLockPolicy: 'not-locked-for-clash-suppression',
  transformConditions: 'month-support-no-adjacent-controller-no-main-qi-root-no-contention',
  transformRootBasis: 'main-qi-only',
  // 무근 조건은 본래 오행을 버리고 화신으로 변해야 하는 천간에만 건다.
  // 갑기합土의 기·을경합金의 경처럼 본래 오행이 곧 화신인 천간의 통근은 합화를 막지 않는다.
  transformRootScope: 'transforming-stem-only',
  // 천간합은 붙어 있는 짝만 합으로 묶는다. 격각·연시 원격 짝은 state '원격'으로 남긴다.
  stemCombinationAdjacency: 'adjacent-only',
  resolutionOrder: 'bureau-then-clash-then-bureau-break-v1',
  // 충해합 판정이 원국의 충 목록에만 의존해 되먹임이 없으므로 해소는 2-pass 로 끝난다.
  resolutionPasses: 2,
  // 충해합은 삼합국의 왕지에만 건다. 방합도 왕지 충이면 깨진다고 보는 계열과 갈리는 자리다.
  directionalBureauBreakPolicy: 'not-broken-by-clash',
  distanceProfile: 'adjacent-1.0-skipped-0.5-year-hour-0.2',
  punishmentCompleteness: ['full-triad', 'partial-pair', 'self'],
  outputStatus: 'formation-and-suppression-no-fortune',
});

export const XINGCHONG_RESOLUTION_PROFILE_V1: XingchongResolutionProfile = deepFreeze({
  schemaVersion: '1',
  id: 'xingchong-resolution',
  version: '1.0.0',
  displayName: '형충회합 해소 순서',
  school: 'xingchong-resolution-reconstruction',
  textualLayer: 'reconstruction',
  status: 'stable',
  enabledRuleIds: XINGCHONG_RESOLUTION_RULE_IDS_V1,
  supportedTopics: ['relationships'],
  references: [
    YUANHAI_ZIPING_COMBINATION_REFERENCE_V1,
    SANMING_XINGCHONG_REFERENCE_V1,
    XINGCHONG_ENGINE_RECONSTRUCTION_REFERENCE_V1,
  ],
  parameters: XINGCHONG_RESOLUTION_PARAMETERS_V1,
  knownLimitations: ['doctrine-not-scientifically-validated', 'xingchong-resolution-no-fortune'],
});
