/** Source references owned by the Xingchong Resolution Tradition Pack. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import type { InterpretationSourceReference } from '../../runtime/traditions/types';
import sourceLedger from './sources.json';

export const XINGCHONG_RESOLUTION_REFERENCES_V1: readonly InterpretationSourceReference[] =
  deepFreeze(sourceLedger.sources as readonly InterpretationSourceReference[]);

export const YUANHAI_ZIPING_COMBINATION_REFERENCE_V1 = XINGCHONG_RESOLUTION_REFERENCES_V1[0]!;
export const SANMING_XINGCHONG_REFERENCE_V1 = XINGCHONG_RESOLUTION_REFERENCES_V1[1]!;
export const XINGCHONG_ENGINE_RECONSTRUCTION_REFERENCE_V1 = XINGCHONG_RESOLUTION_REFERENCES_V1[2]!;
