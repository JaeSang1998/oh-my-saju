/** Curated Sanming symbolic-star overlay profile declaration. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import type { JsonValue, TraditionRuleProfile } from '../../runtime/traditions/types';
import type { SanmingSymbolicCuratedRuleId } from './evaluate';
import { SANMING_TRAVEL_HORSE_REFERENCE_V1 } from './sources';

type SanmingSymbolicCuratedProfile = Omit<
  TraditionRuleProfile,
  'enabledRuleIds' | 'knownLimitations'
> & {
  readonly enabledRuleIds: readonly SanmingSymbolicCuratedRuleId[];
  readonly knownLimitations: readonly ['sanming-symbolic-raw-observation-only'];
};

export const SANMING_SYMBOLIC_CURATED_PARAMETERS_V1: Readonly<Record<string, JsonValue>> =
  deepFreeze({
    lookupTable: 'sanming-travel-horse-four-triads-v1',
    anchorBranches: ['year'],
    observedPillars: ['year', 'month', 'day', 'hour'],
    outputScope: 'raw-branch-matches-complete-absence-or-partial-observation',
    interpretation: 'none',
  });

export const SANMING_SYMBOLIC_CURATED_PROFILE_V1: SanmingSymbolicCuratedProfile = deepFreeze({
  schemaVersion: '1',
  id: 'sanming-symbolic-curated',
  version: '1.0.0',
  displayName: '삼명통회 엄선 신살 원시 관측',
  school: 'sanming-tonghui-base-text',
  textualLayer: 'base-text',
  status: 'stable',
  enabledRuleIds: ['sanming.travel-horse'],
  supportedTopics: ['symbolic-stars'],
  references: [SANMING_TRAVEL_HORSE_REFERENCE_V1],
  parameters: SANMING_SYMBOLIC_CURATED_PARAMETERS_V1,
  knownLimitations: ['sanming-symbolic-raw-observation-only'],
});
