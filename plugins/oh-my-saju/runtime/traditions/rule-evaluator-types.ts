/** Minimal read-only context supplied to one Pack evaluator. */
import type { SajuCandidatePillars, SajuPillarName } from 'saju-engine';
import type { KnownPillarStructuralAnalysis, StructuralAnalysis } from 'saju-engine/advanced';
import type { FindingComparisonCoordinate, InterpretationTopic, JsonValue } from './types';

/**
 * Runtime-internal input supplied to exactly one built-in Tradition Pack.
 *
 * This is deliberately a read-only chart view. A Pack has no access to
 * another Pack's findings, which keeps evaluation independent.
 */
export interface DoctrineRuleContext {
  readonly pillars: SajuCandidatePillars;
  readonly structure: StructuralAnalysis | KnownPillarStructuralAnalysis;
}

/** Package-internal candidate-level output before shared aggregation. */
export interface DoctrineRuleMatch {
  readonly key: string;
  readonly statement: string;
  readonly topic: InterpretationTopic;
  readonly values: Readonly<Record<string, JsonValue>>;
  readonly evidencePaths: readonly string[];
  readonly sourceReferenceIds: readonly string[];
  readonly comparison: FindingComparisonCoordinate;
  readonly coverage?: 'complete' | 'partial';
  readonly omittedPillars?: readonly SajuPillarName[];
}
