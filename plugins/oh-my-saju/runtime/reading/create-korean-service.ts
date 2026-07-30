/** Default Korean reading service over installed Packs. */
import {
  DEFAULT_KOREAN_TRADITION_PACK_REFS_V1,
  KOREAN_SAJU_ANALYSIS_PRESET_V1,
} from '../traditions';
import { createAiSajuComparisonService } from './create-comparison-service';
import type { AiKoreanSajuService, CreateAiKoreanSajuServiceOptions } from './types';

/**
 * High-level ko-KR service preset.
 *
 * The structural baseline and every built-in Tradition Pack are narrated in
 * isolated provider calls. The facade supplies only the installed Tradition Pack
 * selection; all validation and snapshot behavior remains in the comparison
 * service.
 */
export function createAiKoreanSajuService(
  options: CreateAiKoreanSajuServiceOptions,
): AiKoreanSajuService {
  const service = createAiSajuComparisonService({
    ...options,
    packRefs: DEFAULT_KOREAN_TRADITION_PACK_REFS_V1,
  });
  return Object.freeze({
    preset: KOREAN_SAJU_ANALYSIS_PRESET_V1,
    read: service.read,
  });
}
