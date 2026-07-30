/** Shared rule input/observation contracts for Tradition Packs. */
import type { SajuPillarName } from 'saju-engine';
import { deepFreeze } from '../internal/deep-freeze';
import type { InterpretationRuleId, InterpretationTopic } from './types';

export interface InterpretationRuleContract {
  readonly topic: InterpretationTopic;
  readonly category: 'structural-observation' | 'traditional-judgment';
  readonly requiredPillars: readonly SajuPillarName[];
  readonly observedPillars: readonly SajuPillarName[];
  readonly comparisonConceptId: string;
}

/**
 * Single plugin-owned registry for evaluator dispatch, Pack manifests,
 * missing-input behavior, and comparison grouping.
 */
export const INTERPRETATION_RULE_CONTRACTS_V1: Readonly<
  Record<InterpretationRuleId, InterpretationRuleContract>
> = deepFreeze({
  'core.day-master': {
    topic: 'day-master',
    category: 'structural-observation',
    requiredPillars: ['day'],
    observedPillars: ['day'],
    comparisonConceptId: 'core.day-master',
  },
  'core.pillar-year': {
    topic: 'chart-overview',
    category: 'structural-observation',
    requiredPillars: ['year'],
    observedPillars: ['year'],
    comparisonConceptId: 'core.pillar-year',
  },
  'core.pillar-month': {
    topic: 'chart-overview',
    category: 'structural-observation',
    requiredPillars: ['month'],
    observedPillars: ['month'],
    comparisonConceptId: 'core.pillar-month',
  },
  'core.pillar-day': {
    topic: 'chart-overview',
    category: 'structural-observation',
    requiredPillars: ['day'],
    observedPillars: ['day'],
    comparisonConceptId: 'core.pillar-day',
  },
  'core.pillar-hour': {
    topic: 'chart-overview',
    category: 'structural-observation',
    requiredPillars: ['hour'],
    observedPillars: ['hour'],
    comparisonConceptId: 'core.pillar-hour',
  },
  'core.element-balance': {
    topic: 'five-elements',
    category: 'structural-observation',
    requiredPillars: ['year', 'month', 'day'],
    observedPillars: ['year', 'month', 'day', 'hour'],
    comparisonConceptId: 'core.element-balance',
  },
  'core.yin-yang-balance': {
    topic: 'yin-yang',
    category: 'structural-observation',
    requiredPillars: ['year', 'month', 'day'],
    observedPillars: ['year', 'month', 'day', 'hour'],
    comparisonConceptId: 'core.yin-yang-balance',
  },
  'core.ten-gods': {
    topic: 'ten-gods',
    category: 'structural-observation',
    requiredPillars: ['year', 'month', 'day'],
    observedPillars: ['year', 'month', 'day', 'hour'],
    comparisonConceptId: 'core.ten-gods',
  },
  'core.relationships': {
    topic: 'relationships',
    category: 'structural-observation',
    requiredPillars: ['year', 'month', 'day'],
    observedPillars: ['year', 'month', 'day', 'hour'],
    comparisonConceptId: 'core.relationships',
  },
  'core.growth-stages': {
    topic: 'growth-stages',
    category: 'structural-observation',
    requiredPillars: ['day'],
    observedPillars: ['year', 'month', 'day', 'hour'],
    comparisonConceptId: 'core.growth-stages',
  },
  'core.void-branches': {
    topic: 'void-branches',
    category: 'structural-observation',
    requiredPillars: ['day'],
    observedPillars: ['day'],
    comparisonConceptId: 'core.void-branches',
  },
  'ziping.month-command': {
    topic: 'pattern',
    category: 'traditional-judgment',
    requiredPillars: ['month', 'day'],
    observedPillars: ['month', 'day'],
    comparisonConceptId: 'month-command-evidence',
  },
  'ziping.pattern-candidate': {
    topic: 'pattern',
    category: 'traditional-judgment',
    requiredPillars: ['month', 'day'],
    observedPillars: ['year', 'month', 'day', 'hour'],
    comparisonConceptId: 'pattern-candidates',
  },
  'ditianshui.seasonal-state': {
    topic: 'strength',
    category: 'traditional-judgment',
    requiredPillars: ['month', 'day'],
    observedPillars: ['month', 'day'],
    comparisonConceptId: 'seasonal-strength-evidence',
  },
  'ditianshui.support-ledger': {
    topic: 'strength',
    category: 'traditional-judgment',
    requiredPillars: ['year', 'month', 'day'],
    observedPillars: ['year', 'month', 'day', 'hour'],
    comparisonConceptId: 'strength-evidence-ledger',
  },
  'qiongtong.climate-candidates': {
    topic: 'useful-god',
    category: 'traditional-judgment',
    requiredPillars: ['month', 'day'],
    observedPillars: ['year', 'month', 'day', 'hour'],
    comparisonConceptId: 'useful-god-candidates',
  },
  'sanming.travel-horse': {
    topic: 'symbolic-stars',
    category: 'traditional-judgment',
    requiredPillars: ['year'],
    observedPillars: ['year', 'month', 'day', 'hour'],
    comparisonConceptId: 'symbolic-star-raw-branch-match',
  },
});

export const INTERPRETATION_RULE_IDS_V1: readonly InterpretationRuleId[] = deepFreeze(
  Object.keys(INTERPRETATION_RULE_CONTRACTS_V1) as InterpretationRuleId[],
);

export function interpretationRuleContract(
  ruleId: InterpretationRuleId,
): InterpretationRuleContract {
  return INTERPRETATION_RULE_CONTRACTS_V1[ruleId];
}
