/** Source references owned by the Ditianshui Tradition Pack. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import type { InterpretationSourceReference } from '../../runtime/traditions/types';
import sourceLedger from './sources.json';

export const DITIANSHUI_REFERENCES_V1: readonly InterpretationSourceReference[] = deepFreeze(
  sourceLedger.sources as readonly InterpretationSourceReference[],
);

export const DITIANSHUI_STRENGTH_REFERENCE_V1 = DITIANSHUI_REFERENCES_V1[0]!;
export const SANMING_SEASONAL_STATE_REFERENCE_V1 = DITIANSHUI_REFERENCES_V1[1]!;
export const DITIANSHUI_ENGINE_RECONSTRUCTION_REFERENCE_V1 = DITIANSHUI_REFERENCES_V1[2]!;
export const DITIANSHUI_KOREAN_METHODS_REFERENCE_V1 = DITIANSHUI_REFERENCES_V1[3]!;
