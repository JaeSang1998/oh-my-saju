/** Resolve reading intent and keep doctrine, uncertainty, and audit disclosure separate. */
import type { InterpretationTopic } from '../traditions/types';
import { deepFreeze } from '../internal/deep-freeze';
import { AiReadingError } from './errors';

export type SajuReadingMode = 'broad' | 'focused' | 'technical-audit';
/**
 * Controls provider-facing narration policy. Cross-Pack broad presentation is
 * assembled only by the application `validate-reading` protocol.
 */
export type SajuReadingModePreference = 'auto' | SajuReadingMode;

export type SajuDoctrineDisclosureId =
  | 'day-master'
  | 'five-elements'
  | 'yin-yang'
  | 'ten-gods'
  | 'strength'
  | 'pattern'
  | 'useful-god'
  | 'void-branches'
  | 'growth-stages'
  | 'luck-cycles'
  | 'symbolic-stars';

interface DoctrineDisclosureRule {
  readonly id: SajuDoctrineDisclosureId;
  readonly topics: readonly InterpretationTopic[];
  readonly outputPattern: RegExp;
  readonly requestPattern: RegExp;
}

export interface ResolvedSajuReadingPolicy {
  readonly mode: SajuReadingMode;
  /** True only for an explicit broad request; legacy `auto` callers keep their old protocol. */
  readonly structuredBroadPresentation: boolean;
  readonly requestedDoctrineIds: readonly SajuDoctrineDisclosureId[];
  readonly scienceMetaRequested: boolean;
  readonly uncertaintyMetaRequested: boolean;
  readonly auditMetaRequested: boolean;
}

export type SajuDisclosureViolationId =
  | SajuDoctrineDisclosureId
  | 'science-meta'
  | 'uncertainty-meta'
  | 'audit-meta';

const DOCTRINE_DISCLOSURE_RULES: readonly DoctrineDisclosureRule[] = [
  {
    id: 'day-master',
    topics: ['day-master'],
    outputPattern: /(?:일간|월령|투간|지장간|통근)/u,
    requestPattern: /(?:일간|월령|투간|지장간|통근)/u,
  },
  {
    id: 'five-elements',
    topics: ['five-elements'],
    outputPattern: /(?:오행|목화토금수\s*(?:분포|비율|점수)?)/u,
    requestPattern: /(?:오행|목화토금수)/u,
  },
  {
    id: 'yin-yang',
    topics: ['yin-yang'],
    outputPattern: /(?:음양|음기|양기)/u,
    requestPattern: /(?:음양|음기|양기)/u,
  },
  {
    id: 'ten-gods',
    topics: ['ten-gods'],
    outputPattern: /(?:십신|비견|겁재|식상|관살|정재|편재|정관|편관|정인|편인)/u,
    requestPattern: /(?:십신|비견|겁재|식상|관살|정재|편재|정관|편관|정인|편인)/u,
  },
  {
    id: 'strength',
    topics: ['strength'],
    outputPattern: /(?:신강|신약|강약)/u,
    requestPattern: /(?:신강|신약|강약)/u,
  },
  {
    id: 'pattern',
    topics: ['pattern'],
    outputPattern: /(?:격국|양인격|월겁격)/u,
    requestPattern: /(?:격국|양인격|월겁격)/u,
  },
  {
    id: 'useful-god',
    topics: ['useful-god'],
    outputPattern: /(?:조후|용신|희신|기신)/u,
    requestPattern: /(?:조후|용신|희신|기신)/u,
  },
  {
    id: 'void-branches',
    topics: ['void-branches'],
    outputPattern: /공망/u,
    requestPattern: /공망/u,
  },
  {
    id: 'growth-stages',
    topics: ['growth-stages'],
    outputPattern:
      /(?:십이운성|운성|(?:장생|목욕|관대|건록|제왕)\s*(?:지|운|단계|해석|의미|해당))/u,
    requestPattern: /(?:십이운성|운성|(?:장생|목욕|관대|건록|제왕)\s*(?:단계|운|해석|의미|해당))/u,
  },
  {
    id: 'luck-cycles',
    topics: ['luck-cycles'],
    outputPattern:
      /(?:대운|세운)(?=$|[\s,.;:!?，。；：！？]*(?:은|는|이|가|을|를|의|에서|으로|상|흐름|주기|시기|연도|해|분석|해석))/u,
    requestPattern: /(?:대운|세운)/u,
  },
  {
    id: 'symbolic-stars',
    topics: ['symbolic-stars'],
    outputPattern: /(?:신살|화개|천을귀인|역마|도화|양인(?!격)|육해)/u,
    requestPattern: /(?:신살|화개|천을귀인|역마|도화|양인(?!격)|육해)/u,
  },
] as const;

/**
 * These are the ordinary vocabulary of a chart-first profile, not specialist
 * audit topics. Broad readings may use them when each term is translated in
 * place; pattern, useful-god, void, growth-stage, luck-cycle, and symbolic-star
 * material still require explicit user opt-in.
 */
const BROAD_DEFAULT_DOCTRINE_IDS = new Set<SajuDoctrineDisclosureId>([
  'day-master',
  'five-elements',
  'ten-gods',
  'strength',
]);

const SCIENCE_META_REQUEST_PATTERN =
  /(?:(?:사주|명리|운세|해석|예측)[^.?!\n]{0,30}(?:(?:과학(?:적(?:으로)?)?|실증(?:적)?)[^.?!\n]{0,12}(?:근거|검증|타당|맞|사실|아닙|아니|인가|이야|입니까)|(?:검증|타당성)[^.?!\n]{0,12}(?:과학|실증))|(?:과학(?:적(?:으로)?)?|실증(?:적)?)[^.?!\n]{0,20}(?:사주|명리|운세|해석|예측)[^.?!\n]{0,20}(?:맞|검증|근거|타당|사실)|(?:scientific|empirical)[^.?!\n]{0,20}(?:saju|fortune|reading|prediction)|현실\s*예측\s*(?:근거|검증|타당성))/iu;
const UNCERTAINTY_META_REQUEST_PATTERN =
  /(?:(?:사주|명리|해석|판정|결론)[^.?!\n]{0,24}(?:확정|단정|불확실|한계|최종)|(?:확정|단정|불확실|한계|최종)[^.?!\n]{0,24}(?:사주|명리|해석|판정|결론)|(?:격국|용신|조후|신살|신강|신약|강약)[^.?!\n]{0,24}(?:확정|단정|불확실|한계|최종|후보)|(?:확정|단정|불확실|한계|최종|후보)[^.?!\n]{0,24}(?:격국|용신|조후|신살|신강|신약|강약))/u;
const AUDIT_META_REQUEST_PATTERN =
  /(?:\bpack(?:ref)?\b|\bfinding(?:s|ids?)?\b|\bprofileref\b|(?:전통|규칙)\s*팩|팩\s*(?:ID|버전|근거|규칙|감사|참조)|(?:profile|프로필)\s*(?:ID|version|버전|근거|규칙|감사)|(?:규칙|계산|명리)\s*프로필|근거\s*ID|감사\s*(?:추적|로그|정보|자료)|\baudit\b|학파(?:별)?\s*(?:비교|근거|규칙)|전통\s*규칙[^.?!\n]{0,30}(?:검증|근거)|기술\s*용어[^.?!\n]{0,20}(?:검증|감사))/iu;

const SCIENCE_META_OUTPUT_PATTERN =
  /(?:(?:사주|명리|운세|해석|예측)[^.?!\n]{0,30}과학[^.?!\n]{0,20}(?:아닙|아니|않|없)|(?:과학(?:적(?:으로)?)?|실증(?:적)?)\s*[^.?!\n]{0,24}(?:타당성|검증|근거)[^.?!\n]{0,24}(?:아닙|아니|않|없|확립되지|있지\s*않)|현실\s*예측[^.?!\n]{0,24}(?:타당성|검증되지|확립되지)|(?:객관적으로\s*)?(?:검증|입증)된?\s*(?:내용|사실)?[^.?!\n]{0,20}(?:아닙|아니|않)|정확성[^.?!\n]{0,20}보장[^.?!\n]{0,20}(?:아니|않|없)|(?:이\s*(?:결과|해석|내용|자료)|사주|명리|운세|풀이)[^.?!\n]{0,20}(?:재미|참고)\s*(?:용|정도)?(?:으로|로)?만|(?:재미|참고)\s*(?:용|정도)?(?:으로|로)?만\s*(?:보|확인|읽|받아들|생각))/u;
const UNCERTAINTY_META_OUTPUT_PATTERN =
  /(?:확정할 수 없|확정되지 않|단정할 수 없|최종 [^.?!\n]{0,24}(?:판정|결론)(?:은|이)?\s*(?:아니|못|없)|(?:결론|판정|판단|확답)[^.?!\n]{0,18}(?:내리|하|정하)[^.?!\n]{0,12}(?:어렵|힘들|곤란)|(?:불확실성|한계)(?:가|는|를|로|입니다|때문))/u;
const AUDIT_META_OUTPUT_PATTERN =
  /(?:전통\s*규칙상|\bpack(?:ref)?\b|\bfinding(?:s|ids?)?\b|\bprofileref\b|(?:전통|규칙)\s*팩|팩\s*(?:ID|버전|근거|규칙|감사|참조)|근거\s*ID|(?:규칙|계산|명리)\s*프로필|프로필\s*(?:ID|버전|근거|규칙|감사)|구현되지 않)/iu;

const OPEN_ENDED_SAJU_REQUEST_PATTERN = /사주(?:를)?\s*(?:좀\s*)?(?:봐|보|풀이|해석)/u;
const EXPLICIT_BROAD_SCOPE_PATTERN =
  /(?:전체(?:적|적으로)?|전반(?:적|적으로)?|종합(?:적|적으로)?|어떤\s*사람|기본\s*(?:풀이|해석))/u;
const FOCUSED_DOMAIN_PATTERN =
  /(?:직업|진로|적성|업무|공부|시험|연애|결혼|궁합|관계|대인|성격|재물|돈|투자|건강|질병|임신|이직|퇴사|선택|비교|시기|올해|내년|대운|세운)/u;
const GENERAL_PURPOSE_PATTERN = /(?:general|broad|school-comparison)/u;

export function assertReadingModePreference(
  value: unknown,
  field = 'readingMode',
): SajuReadingModePreference {
  if (value !== 'auto' && value !== 'broad' && value !== 'focused' && value !== 'technical-audit') {
    throw new AiReadingError('INVALID_REQUEST', `${field} is not supported.`);
  }
  return value;
}

export function resolveSajuReadingPolicy(
  question: string | null,
  purpose: string,
  preference: SajuReadingModePreference,
): ResolvedSajuReadingPolicy {
  const userQuestion = question ?? '';
  const requestedDoctrineIds = DOCTRINE_DISCLOSURE_RULES.filter(({ requestPattern }) =>
    requestPattern.test(userQuestion),
  ).map(({ id }) => id);
  const scienceMetaRequested = SCIENCE_META_REQUEST_PATTERN.test(userQuestion);
  const uncertaintyMetaRequested = UNCERTAINTY_META_REQUEST_PATTERN.test(userQuestion);
  const auditMetaRequested = AUDIT_META_REQUEST_PATTERN.test(userQuestion);
  const clearlyBroadRequest =
    EXPLICIT_BROAD_SCOPE_PATTERN.test(userQuestion) ||
    (OPEN_ENDED_SAJU_REQUEST_PATTERN.test(userQuestion) &&
      !FOCUSED_DOMAIN_PATTERN.test(userQuestion));
  let mode: SajuReadingMode;
  if (preference !== 'auto') {
    mode = preference;
  } else if (auditMetaRequested) {
    mode = 'technical-audit';
  } else if (question === null) {
    mode = GENERAL_PURPOSE_PATTERN.test(purpose) ? 'broad' : 'focused';
  } else {
    mode = clearlyBroadRequest ? 'broad' : 'focused';
  }

  return deepFreeze({
    mode,
    structuredBroadPresentation: preference === 'broad',
    requestedDoctrineIds,
    scienceMetaRequested,
    uncertaintyMetaRequested,
    auditMetaRequested,
  });
}

function doctrineAllowed(rule: DoctrineDisclosureRule, policy: ResolvedSajuReadingPolicy): boolean {
  return (
    policy.requestedDoctrineIds.some((id) => id === rule.id) ||
    (policy.mode === 'broad' && BROAD_DEFAULT_DOCTRINE_IDS.has(rule.id))
  );
}

export function findSajuDisclosureViolation(
  text: string,
  policy: ResolvedSajuReadingPolicy,
): SajuDisclosureViolationId | null {
  for (const rule of DOCTRINE_DISCLOSURE_RULES) {
    if (rule.outputPattern.test(text) && !doctrineAllowed(rule, policy)) return rule.id;
  }
  if (SCIENCE_META_OUTPUT_PATTERN.test(text) && !policy.scienceMetaRequested) {
    return 'science-meta';
  }
  if (UNCERTAINTY_META_OUTPUT_PATTERN.test(text) && !policy.uncertaintyMetaRequested) {
    return 'uncertainty-meta';
  }
  if (AUDIT_META_OUTPUT_PATTERN.test(text) && !policy.auditMetaRequested) {
    return 'audit-meta';
  }
  return null;
}

export function isSajuInterpretationTopicAllowed(
  topic: InterpretationTopic,
  policy: ResolvedSajuReadingPolicy,
): boolean {
  const rule = DOCTRINE_DISCLOSURE_RULES.find(({ topics }) => topics.includes(topic));
  return rule === undefined || doctrineAllowed(rule, policy);
}

export function doctrineDisclosureIdForTopic(
  topic: InterpretationTopic,
): SajuDoctrineDisclosureId | null {
  return DOCTRINE_DISCLOSURE_RULES.find(({ topics }) => topics.includes(topic))?.id ?? null;
}
