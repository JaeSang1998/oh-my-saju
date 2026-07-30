/** Source references owned by the Qiongtong Tradition Pack. */
import { deepFreeze } from '../../runtime/internal/deep-freeze';
import type { InterpretationSourceReference } from '../../runtime/traditions/types';
import sourceLedger from './sources.json';

export const QIONGTONG_REFERENCES_V1: readonly InterpretationSourceReference[] = deepFreeze(
  sourceLedger.sources as readonly InterpretationSourceReference[],
);

export const QIONGTONG_CLIMATE_REFERENCE_V1 = QIONGTONG_REFERENCES_V1[0]!;
export const QIONGTONG_ENGINE_RECONSTRUCTION_REFERENCE_V1 = QIONGTONG_REFERENCES_V1[1]!;
export const QIONGTONG_KOREAN_METHODS_REFERENCE_V1 = QIONGTONG_REFERENCES_V1[2]!;
