/**
 * Compatibility barrel for the original doctrine-rule module.
 *
 * Implementations now live in isolated built-in Tradition Pack modules. This file
 * keeps existing internal imports and public test fixtures stable while the
 * evaluator dispatches through the fixed package registry.
 */
/** Compatibility facade for deterministic Pack rule helpers. */
import { evaluateBuiltInTraditionPackRule } from './rule-registry';
import type { InterpretationRuleId } from './types';
import type { DoctrineRuleContext, DoctrineRuleMatch } from './rule-evaluator-types';

export type { DoctrineRuleContext, DoctrineRuleMatch } from './rule-evaluator-types';
export {
  DITIANSHUI_SEASONAL_RULER_BY_MONTH_V1,
  getDitianshuiSeasonalState,
  type DitianshuiSeasonalState,
} from '../../tradition-packs/ditianshui/evaluate';

export function evaluateDoctrineRule(
  ruleId: InterpretationRuleId,
  context: DoctrineRuleContext,
): DoctrineRuleMatch {
  return evaluateBuiltInTraditionPackRule(ruleId, context);
}
