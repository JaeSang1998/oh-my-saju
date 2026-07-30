import { calculateSaju } from 'saju-engine';
import { calculateSajuPossibilities } from 'saju-engine';
import { deepFreeze } from '../internal/deep-freeze';
import { isRecord } from '../internal/guards';
import { OH_MY_SAJU_RUNTIME_MANIFEST } from '../manifest';
import { SajuInterpretationError } from './errors';
import { evaluateSajuInterpretation } from './evaluate';
/** Raw-request facade for one Tradition Pack. */
import type {
  EvaluateSajuInterpretationOptions,
  ExactSajuInterpretationRequest,
  ExactSajuInterpretationResult,
  PossibilitySajuInterpretationRequest,
  PossibilitySajuInterpretationResult,
  SajuInterpretationCalculationRequest,
} from './types';

/* eslint-disable no-redeclare -- TypeScript overload signatures share one implementation. */
export function calculateSajuInterpretation(
  calculation: ExactSajuInterpretationRequest,
  options: EvaluateSajuInterpretationOptions,
): ExactSajuInterpretationResult;
export function calculateSajuInterpretation(
  calculation: PossibilitySajuInterpretationRequest,
  options: EvaluateSajuInterpretationOptions,
): PossibilitySajuInterpretationResult;
export function calculateSajuInterpretation(
  calculation: SajuInterpretationCalculationRequest,
  options: EvaluateSajuInterpretationOptions,
): ExactSajuInterpretationResult | PossibilitySajuInterpretationResult;
export function calculateSajuInterpretation(
  calculation: SajuInterpretationCalculationRequest,
  options: EvaluateSajuInterpretationOptions,
): ExactSajuInterpretationResult | PossibilitySajuInterpretationResult {
  if (
    !isRecord(calculation) ||
    (calculation.kind !== 'exact' && calculation.kind !== 'possibilities') ||
    !('request' in calculation)
  ) {
    throw new SajuInterpretationError(
      'INVALID_REQUEST',
      'calculation must contain an exact or possibilities request.',
    );
  }

  if (calculation.kind === 'exact') {
    const report = calculateSaju(calculation.request);
    return deepFreeze({
      schemaVersion: OH_MY_SAJU_RUNTIME_MANIFEST.traditions.reportSchemaVersion,
      calculationKind: 'exact',
      calculation: report,
      interpretation: evaluateSajuInterpretation(report, options),
    });
  }

  const report = calculateSajuPossibilities(calculation.request);
  return deepFreeze({
    schemaVersion: OH_MY_SAJU_RUNTIME_MANIFEST.traditions.reportSchemaVersion,
    calculationKind: 'possibilities',
    calculation: report,
    interpretation: evaluateSajuInterpretation(report, options),
  });
}
/* eslint-enable no-redeclare */
