/** Calculation-baseline source ledger owned by this Pack. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import type { InterpretationSourceReference } from '../../runtime/traditions/types';
import sourceLedger from './sources.json';

export const COMMON_STRUCTURAL_REFERENCES_V1: readonly InterpretationSourceReference[] = deepFreeze(
  sourceLedger.sources as readonly InterpretationSourceReference[],
);
