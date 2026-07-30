/** Registry of installed Pack helper functions. */
import { evaluateDitianshuiPackRule } from '../../tradition-packs/ditianshui/evaluate';
import { evaluateQiongtongPackRule } from '../../tradition-packs/qiongtong/evaluate';
import { evaluateSanmingSymbolicCuratedRule } from '../../tradition-packs/sanming-symbolic-curated/evaluate';
import { evaluateZipingPackRule } from '../../tradition-packs/ziping/evaluate';
import type { InterpretationRuleId } from './types';
import type { DoctrineRuleContext, DoctrineRuleMatch } from './rule-evaluator-types';

type TraditionPackRuleId = Exclude<InterpretationRuleId, `core.${string}`>;

interface BuiltInTraditionPack {
  readonly id: 'ziping' | 'ditianshui' | 'qiongtong' | 'sanming-symbolic-curated';
  readonly ruleIds: readonly TraditionPackRuleId[];
  readonly evaluate: (
    ruleId: TraditionPackRuleId,
    context: DoctrineRuleContext,
  ) => DoctrineRuleMatch;
}

/**
 * Fixed package registry.  It is intentionally not a public plugin seam:
 * a doctrine implementation can only be selected from audited code bundled
 * with this package.
 */
const BUILT_IN_TRADITION_PACKS: readonly BuiltInTraditionPack[] = [
  {
    id: 'ziping',
    ruleIds: ['ziping.month-command', 'ziping.pattern-candidate'],
    evaluate: (ruleId, context) => {
      if (ruleId !== 'ziping.month-command' && ruleId !== 'ziping.pattern-candidate') {
        throw new TypeError(`Rule ${ruleId} is not owned by the Ziping Tradition Pack.`);
      }
      return evaluateZipingPackRule(ruleId, context);
    },
  },
  {
    id: 'ditianshui',
    ruleIds: ['ditianshui.seasonal-state', 'ditianshui.support-ledger'],
    evaluate: (ruleId, context) => {
      if (ruleId !== 'ditianshui.seasonal-state' && ruleId !== 'ditianshui.support-ledger') {
        throw new TypeError(`Rule ${ruleId} is not owned by the Ditianshui Tradition Pack.`);
      }
      return evaluateDitianshuiPackRule(ruleId, context);
    },
  },
  {
    id: 'qiongtong',
    ruleIds: ['qiongtong.climate-candidates'],
    evaluate: (ruleId, context) => {
      if (ruleId !== 'qiongtong.climate-candidates') {
        throw new TypeError(`Rule ${ruleId} is not owned by the Qiongtong Tradition Pack.`);
      }
      return evaluateQiongtongPackRule(context);
    },
  },
  {
    id: 'sanming-symbolic-curated',
    ruleIds: ['sanming.travel-horse'],
    evaluate: (ruleId, context) => {
      if (ruleId !== 'sanming.travel-horse') {
        throw new TypeError(
          `Rule ${ruleId} is not owned by the curated Sanming symbolic-star Tradition Pack.`,
        );
      }
      return evaluateSanmingSymbolicCuratedRule(ruleId, context);
    },
  },
];

const PACK_BY_RULE_ID = new Map<TraditionPackRuleId, BuiltInTraditionPack>(
  BUILT_IN_TRADITION_PACKS.flatMap((pack) => pack.ruleIds.map((ruleId) => [ruleId, pack] as const)),
);

export function evaluateBuiltInTraditionPackRule(
  ruleId: InterpretationRuleId,
  context: DoctrineRuleContext,
): DoctrineRuleMatch {
  if (ruleId.startsWith('core.')) throw new TypeError(`Not a doctrine rule: ${ruleId}`);
  const doctrineRuleId = ruleId as TraditionPackRuleId;
  const pack = PACK_BY_RULE_ID.get(doctrineRuleId);
  if (pack === undefined) throw new TypeError(`Not a doctrine rule: ${ruleId}`);
  return pack.evaluate(doctrineRuleId, context);
}
