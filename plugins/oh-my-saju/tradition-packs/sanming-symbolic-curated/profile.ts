/** Curated Sanming symbolic-star overlay profile declaration. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import type { JsonValue, TraditionRuleProfile } from '../../runtime/traditions/types';
import {
  SANMING_SYMBOLIC_CURATED_RULE_IDS_V1,
  type SanmingSymbolicCuratedRuleId,
} from './evaluate';
import { SANMING_SYMBOLIC_CURATED_REFERENCES_V1 } from './sources';

type SanmingSymbolicCuratedProfile = Omit<
  TraditionRuleProfile,
  'enabledRuleIds' | 'knownLimitations'
> & {
  readonly enabledRuleIds: readonly SanmingSymbolicCuratedRuleId[];
  readonly knownLimitations: readonly ['sanming-symbolic-raw-observation-only'];
};

export const SANMING_SYMBOLIC_CURATED_PARAMETERS_V1: Readonly<Record<string, JsonValue>> =
  deepFreeze({
    lookupTables: [
      'sanming-eight-triad-stars-v1',
      'sanming-season-corner-pair-v1',
      'sanming-day-stem-stars-v1',
      'sanming-blade-variants-v1',
    ],
    anchorBranches: ['year'],
    anchorStems: ['day'],
    observedPillars: ['year', 'month', 'day', 'hour'],
    outputScope: 'raw-branch-matches-complete-absence-or-partial-observation',
    xianchiQualification: 'unresolved-heavenly-stem-and-nayin-same-category',
    bladeVariants: ['after-lu-all-stems', 'yang-stems-only'],
    interpretation: 'none',
  });

export const SANMING_SYMBOLIC_CURATED_PROFILE_V1: SanmingSymbolicCuratedProfile = deepFreeze({
  schemaVersion: '1',
  id: 'sanming-symbolic-curated',
  version: '1.1.0',
  displayName: '삼명통회 엄선 신살 원시 관측',
  school: 'sanming-tonghui-base-text',
  textualLayer: 'base-text',
  status: 'stable',
  enabledRuleIds: SANMING_SYMBOLIC_CURATED_RULE_IDS_V1,
  supportedTopics: ['symbolic-stars'],
  references: SANMING_SYMBOLIC_CURATED_REFERENCES_V1,
  parameters: SANMING_SYMBOLIC_CURATED_PARAMETERS_V1,
  knownLimitations: ['sanming-symbolic-raw-observation-only'],
});
