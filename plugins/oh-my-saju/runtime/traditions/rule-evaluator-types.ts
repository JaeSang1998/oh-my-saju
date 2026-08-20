/** Minimal read-only context supplied to one Pack evaluator. */
import type { SajuCandidatePillars, SajuPillarName } from 'saju-engine';
import type { KnownPillarStructuralAnalysis, StructuralAnalysis } from 'saju-engine/advanced';
import type { FindingComparisonCoordinate, InterpretationTopic, JsonValue } from './types';

/**
 * Solar-term coordinates of one birth instant, copied from the calculation
 * report so a Pack never recomputes an ephemeris of its own.
 */
export interface SolarTermContext {
  /** Birth instant in epoch milliseconds. */
  readonly birthEpochMilliseconds: number;
  /** Jie that opened the current month pillar. */
  readonly monthStart: {
    readonly name: string;
    readonly hanja: string;
    readonly epochMilliseconds: number;
  };
  /** Jie that closes the current month pillar. */
  readonly monthEnd: {
    readonly name: string;
    readonly hanja: string;
    readonly epochMilliseconds: number;
  };
  /** Lichun that opened the current Saju year. */
  readonly lichun: { readonly epochMilliseconds: number };
}

/**
 * Runtime-internal input supplied to exactly one built-in Tradition Pack.
 *
 * This is deliberately a read-only chart view. A Pack has no access to
 * another Pack's findings, which keeps evaluation independent.
 */
export interface DoctrineRuleContext {
  readonly pillars: SajuCandidatePillars;
  readonly structure: StructuralAnalysis | KnownPillarStructuralAnalysis;
  /** Null when the calculation is a possibility set without an exact report. */
  readonly solarTerm: SolarTermContext | null;
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
