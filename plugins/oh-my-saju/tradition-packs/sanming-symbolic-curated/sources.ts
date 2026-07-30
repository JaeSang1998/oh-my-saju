/** Source references owned by the curated Sanming symbolic-star overlay. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import type { InterpretationSourceReference } from '../../runtime/traditions/types';
import sourceLedger from './sources.json';

export const SANMING_SYMBOLIC_CURATED_REFERENCES_V1: readonly InterpretationSourceReference[] =
  deepFreeze(sourceLedger.sources as readonly InterpretationSourceReference[]);

export const SANMING_TRAVEL_HORSE_REFERENCE_V1 = SANMING_SYMBOLIC_CURATED_REFERENCES_V1[0]!;
