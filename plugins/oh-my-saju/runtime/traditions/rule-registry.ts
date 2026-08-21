/** Registry of installed Pack helper functions. */
import { evaluateDitianshuiPackRule } from '../../tradition-packs/ditianshui/evaluate';
import { evaluateQiongtongPackRule } from '../../tradition-packs/qiongtong/evaluate';
import {
  evaluateSanmingSymbolicCuratedRule,
  SANMING_SYMBOLIC_CURATED_RULE_IDS_V1,
  type SanmingSymbolicCuratedRuleId,
} from '../../tradition-packs/sanming-symbolic-curated/evaluate';
import {
  evaluateXingchongResolutionRule,
  XINGCHONG_RESOLUTION_RULE_IDS_V1,
  type XingchongResolutionRuleId,
} from '../../tradition-packs/xingchong-resolution/evaluate';
import { evaluateZipingPackRule } from '../../tradition-packs/ziping/evaluate';
import type { InterpretationRuleId } from './types';
import type { DoctrineRuleContext, DoctrineRuleMatch } from './rule-evaluator-types';

type TraditionPackRuleId = Exclude<InterpretationRuleId, `core.${string}`>;

type ZipingRuleId = Extract<
  InterpretationRuleId,
  | 'ziping.month-command'
  | 'ziping.pattern-candidate'
  | 'ziping.governing-day'
  | 'ziping.pattern-integrity'
  | 'ziping.pattern-relief-god'
>;

type DitianshuiRuleId = Extract<
  InterpretationRuleId,
  | 'ditianshui.seasonal-state'
  | 'ditianshui.support-ledger'
  | 'ditianshui.rooting-ledger'
  | 'ditianshui.command-position'
  | 'ditianshui.strength-verdict'
  | 'ditianshui.follow-transform-patterns'
>;

type QiongtongRuleId = Extract<
  InterpretationRuleId,
  | 'qiongtong.climate-candidates'
  | 'qiongtong.climate-tendency'
  | 'qiongtong.candidate-condition'
  | 'qiongtong.pack-climate-priority'
>;

const ZIPING_RULE_IDS_V1: readonly ZipingRuleId[] = [
  'ziping.month-command',
  'ziping.pattern-candidate',
  'ziping.governing-day',
  'ziping.pattern-integrity',
  'ziping.pattern-relief-god',
];

const DITIANSHUI_RULE_IDS_V1: readonly DitianshuiRuleId[] = [
  'ditianshui.seasonal-state',
  'ditianshui.support-ledger',
  'ditianshui.rooting-ledger',
  'ditianshui.command-position',
  'ditianshui.strength-verdict',
  'ditianshui.follow-transform-patterns',
];

const QIONGTONG_RULE_IDS_V1: readonly QiongtongRuleId[] = [
  'qiongtong.climate-candidates',
  'qiongtong.climate-tendency',
  'qiongtong.candidate-condition',
  'qiongtong.pack-climate-priority',
];

interface BuiltInTraditionPack {
  readonly id:
    'ziping' | 'ditianshui' | 'xingchong-resolution' | 'qiongtong' | 'sanming-symbolic-curated';
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
    ruleIds: ZIPING_RULE_IDS_V1,
    evaluate: (ruleId, context) => {
      if (!ZIPING_RULE_IDS_V1.includes(ruleId as ZipingRuleId)) {
        throw new TypeError(`Rule ${ruleId} is not owned by the Ziping Tradition Pack.`);
      }
      return evaluateZipingPackRule(ruleId as ZipingRuleId, context);
    },
  },
  {
    id: 'ditianshui',
    ruleIds: DITIANSHUI_RULE_IDS_V1,
    evaluate: (ruleId, context) => {
      if (!DITIANSHUI_RULE_IDS_V1.includes(ruleId as DitianshuiRuleId)) {
        throw new TypeError(`Rule ${ruleId} is not owned by the Ditianshui Tradition Pack.`);
      }
      return evaluateDitianshuiPackRule(ruleId as DitianshuiRuleId, context);
    },
  },
  {
    id: 'xingchong-resolution',
    ruleIds: XINGCHONG_RESOLUTION_RULE_IDS_V1,
    evaluate: (ruleId, context) => {
      if (!XINGCHONG_RESOLUTION_RULE_IDS_V1.includes(ruleId as XingchongResolutionRuleId)) {
        throw new TypeError(
          `Rule ${ruleId} is not owned by the Xingchong Resolution Tradition Pack.`,
        );
      }
      return evaluateXingchongResolutionRule(ruleId as XingchongResolutionRuleId, context);
    },
  },
  {
    id: 'qiongtong',
    ruleIds: QIONGTONG_RULE_IDS_V1,
    evaluate: (ruleId, context) => {
      if (!QIONGTONG_RULE_IDS_V1.includes(ruleId as QiongtongRuleId)) {
        throw new TypeError(`Rule ${ruleId} is not owned by the Qiongtong Tradition Pack.`);
      }
      return evaluateQiongtongPackRule(ruleId as QiongtongRuleId, context);
    },
  },
  {
    id: 'sanming-symbolic-curated',
    ruleIds: SANMING_SYMBOLIC_CURATED_RULE_IDS_V1,
    evaluate: (ruleId, context) => {
      if (!SANMING_SYMBOLIC_CURATED_RULE_IDS_V1.includes(ruleId as SanmingSymbolicCuratedRuleId)) {
        throw new TypeError(
          `Rule ${ruleId} is not owned by the curated Sanming symbolic-star Tradition Pack.`,
        );
      }
      return evaluateSanmingSymbolicCuratedRule(ruleId as SanmingSymbolicCuratedRuleId, context);
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
