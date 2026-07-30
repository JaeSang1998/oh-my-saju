/** Source references owned by the Ziping Tradition Pack. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import type { InterpretationSourceReference } from '../../runtime/traditions/types';
import sourceLedger from './sources.json';

export const ZIPING_REFERENCES_V1: readonly InterpretationSourceReference[] = deepFreeze(
  sourceLedger.sources as readonly InterpretationSourceReference[],
);

export const ZIPING_MONTH_COMMAND_REFERENCE_V1 = ZIPING_REFERENCES_V1[0]!;
export const ZIPING_ENGINE_RECONSTRUCTION_REFERENCE_V1 = ZIPING_REFERENCES_V1[1]!;
export const ZIPING_KOREAN_METHODS_REFERENCE_V1 = ZIPING_REFERENCES_V1[2]!;
