/** Ditianshui Tradition Pack profile declaration. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import type { JsonValue, TraditionRuleProfile } from '../../runtime/traditions/types';
import {
  DITIANSHUI_ENGINE_RECONSTRUCTION_REFERENCE_V1,
  DITIANSHUI_KOREAN_METHODS_REFERENCE_V1,
  DITIANSHUI_STRENGTH_REFERENCE_V1,
  SANMING_SEASONAL_STATE_REFERENCE_V1,
} from './sources';

export const DITIANSHUI_STRENGTH_EVIDENCE_PARAMETERS_V1: Readonly<Record<string, JsonValue>> =
  deepFreeze({
    seasonalStateTable: 'five-phases-wang-xiang-xiu-qiu-si-v1',
    earthTransitionPolicy: 'four-season-endings',
    supportEvidence: ['same-element', 'resource-element', 'hidden-root'],
    oppositionEvidence: ['output-element', 'wealth-element', 'officer-element'],
    numericVerdict: 'pack-local-100-point-support-score',
    rootRankTable: 'ditianshui-root-rank-v1',
    rootStrengthProfile: 'rank-position-weighted-v1',
    rootTableDivergence: 'wangzhi-residual-stem-included',
    commandPositionBasis: 'main-hidden-stem',
    strengthGrade: 'three-flag-candidate',
    damageAdjustment: 'clash-0.5-punishment-0.8',
    damageBasis: 'engine-computed-branch-clashes-and-punishments',
    transformedElementAdjustment: 'not-applied',
    strengthScoreProfile: 'ditianshui-position-weighted-v1',
    strengthScoreDivergence: 'position-weights-and-thresholds-differ-by-school',
    strengthScoreTable: 'ditianshui-strength-score-v1',
    strengthVerdictScope: 'pack-local-not-cross-school-final',
    followTransformProfile: 'ditianshui-follow-transform-v1',
    dominantElementOfficerBasis: 'revealed-stems-only-hidden-stems-excluded',
    followRootingDivergence: '종강격-rooting-any-differs-by-school',
    transformMonthBranchDivergence: '갑기합화토-includes-사-오-differs-by-school',
    followTransformPrecedence: 'dominant-element-then-transform-then-follow',
    transformPartnerPositions: ['month', 'hour'],
    outputStatus: 'pack-local-strength-verdict-no-fortune-meaning',
  });

export const DITIANSHUI_STRENGTH_EVIDENCE_PROFILE_V1: TraditionRuleProfile = deepFreeze({
  schemaVersion: '1',
  id: 'ditianshui-strength-evidence',
  version: '1.2.0',
  displayName: '삼명통회 계절표·적천수 왕쇠 근거',
  school: 'ditianshui-strength-flow-reconstruction',
  textualLayer: 'reconstruction',
  status: 'stable',
  enabledRuleIds: [
    'ditianshui.seasonal-state',
    'ditianshui.support-ledger',
    'ditianshui.rooting-ledger',
    'ditianshui.command-position',
    'ditianshui.strength-verdict',
    'ditianshui.follow-transform-patterns',
  ],
  supportedTopics: ['strength'],
  references: [
    DITIANSHUI_STRENGTH_REFERENCE_V1,
    SANMING_SEASONAL_STATE_REFERENCE_V1,
    DITIANSHUI_ENGINE_RECONSTRUCTION_REFERENCE_V1,
    DITIANSHUI_KOREAN_METHODS_REFERENCE_V1,
  ],
  parameters: DITIANSHUI_STRENGTH_EVIDENCE_PARAMETERS_V1,
  knownLimitations: [
    'doctrine-not-scientifically-validated',
    'ditianshui-evidence-no-strength-verdict',
  ],
});
