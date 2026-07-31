/** Build and validate narration from one Pack finding set only. */
import { calculateSaju } from 'saju-engine';
import { calculateSajuPossibilities } from 'saju-engine';
import { evaluateSajuInterpretation, snapshotTraditionRuleProfile } from '../traditions/evaluate';
import { profileLimitationMessage } from '../traditions/profile-limitations';
import type {
  InterpretationFinding,
  InterpretationTopic,
  SajuInterpretationReport,
  TraditionRuleProfile,
  UnavailableInterpretationRule,
} from '../traditions/types';
import { deepFreeze } from '../internal/deep-freeze';
import { isArrayOf, isRecord } from '../internal/guards';
import { isAuthenticInterpretationReport } from '../internal/report-authenticity';
import { OH_MY_SAJU_RUNTIME_MANIFEST } from '../manifest';
import { AiReadingError } from './errors';
import {
  SAJU_NARRATIVE_JSON_SCHEMA,
  SAJU_NARRATIVE_TITLE,
  SAJU_TOPIC_TITLES,
} from './output-contract';
import {
  assertReadingAudience,
  assertReadingLocale,
  assertReadingPurpose,
  assertReadingVariantPolicy,
  assertSafeIdentifier,
  snapshotNarrator,
} from './option-validation';
import {
  SAJU_NARRATION_PRESENTATION_POLICY,
  SAJU_NARRATION_PROMPT_TEMPLATE,
} from './prompt-contract';
import {
  assertReadingModePreference,
  doctrineDisclosureIdForTopic,
  findSajuDisclosureViolation,
  isSajuInterpretationTopicAllowed,
  resolveSajuReadingPolicy,
  type ResolvedSajuReadingPolicy,
  type SajuReadingModePreference,
} from './reading-policy';
import type {
  AiSajuReadingReport,
  AiSajuService,
  AiSajuServiceRequest,
  CreateAiSajuReadingInput,
  CreateAiSajuServiceOptions,
  ExactAiSajuServiceResult,
  PrepareAiSajuNarrationRequestInput,
  PossibilityAiSajuServiceResult,
  SajuNarrationEvidenceFinding,
  SajuNarrationRequest,
  SajuNarrative,
  SajuNarrativeParagraph,
  SajuNarrativeSection,
  SajuNarrator,
  SajuNarratorResponse,
  SajuReadingAudience,
  SajuReadingLocale,
  SajuReadingPurpose,
  SajuVariantPolicy,
} from './types';

const DEFAULT_LOCALE: SajuReadingLocale = 'ko-KR';
const DEFAULT_PURPOSE: SajuReadingPurpose = 'general-interpretation';
const DEFAULT_AUDIENCE: SajuReadingAudience = 'general';
const DEFAULT_VARIANT_POLICY: SajuVariantPolicy = 'include-candidate-dependent';

const ALLOWED_TOPICS = new Set<string>(Object.keys(SAJU_TOPIC_TITLES));
const PILLAR_NAMES: ReadonlySet<string> = new Set(['year', 'month', 'day', 'hour']);

const HTML_OR_URL_PATTERN =
  /<[^>]*>|(?:https?|file|mailto|javascript|data):|(?:^|[\s[(])(?:www\.|\/\/)|\[[^\]]*]\([^)]*\)/i;
const INVISIBLE_PATTERN = /[\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/u;
const HANGUL_STEMS = '갑을병정무기경신임계';
const HANGUL_BRANCHES = '자축인묘진사오미신유술해';
const HANJA_STEMS = '甲乙丙丁戊己庚辛壬癸';
const HANJA_BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const GANZHI_PAIR_PATTERN =
  /([갑을병정무기경신임계])\s*([자축인묘진사오미신유술해])|([甲乙丙丁戊己庚辛壬癸])\s*([子丑寅卯辰巳午未申酉戌亥])/gu;
const GANZHI_TOKEN_PRECEDING_LETTER_PATTERN =
  /[가-힣甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]/u;
const GANZHI_TOKEN_FOLLOWER_PATTERN =
  /^(?:년|월|일|시|年|月|日|時|입니다|이다|이라고|이라는|이라며|이라면|인|은|는|이|가|을|를|와|과|도|에|의|로|라고)/u;
const PARENTHETICAL_GANZHI_SEPARATOR_PATTERN = /^\s*\(\s*$/u;
const NON_DAY_TEMPORAL_SUFFIX_PATTERN =
  /^[\s"'’”)\]}]*(?:년(?!주)|年(?!柱)|월(?!주)|月(?!柱)|시(?!주)|時(?!柱))/u;
const DAY_TEMPORAL_SUFFIX_PATTERN =
  /^[\s"'’”)\]}]*(?:일|日)(?=$|[\s,.;:!?，。；：！？]*(?:은|는|이|가|에|의|도|부터|까지|마다|입니다|이다|이라고|이라는|이라면))/u;
const CALENDAR_ANCHOR_PATTERN =
  /(?:\d{3,4}\s*(?:년|年)|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|올해|금년|내년|작년|오늘|금일|내일|명일|어제)/u;
const CALENDAR_GANZHI_KEYWORD_PATTERN = /(?:일진|日辰|세차|歲次)/u;
const SENTENCE_BOUNDARY_CHARACTERS = new Set(['\n', '.', '!', '?', '。', '！', '？']);

interface ServiceSnapshot {
  readonly profile: TraditionRuleProfile;
  readonly narrator: SajuNarrator;
  readonly locale: SajuReadingLocale;
  readonly purpose: SajuReadingPurpose;
  readonly audience: SajuReadingAudience;
  readonly variantPolicy: SajuVariantPolicy;
  readonly readingMode: SajuReadingModePreference;
}

interface ParsedNarratorResponse {
  readonly output: unknown;
  readonly actualModel: string;
  readonly providerRequestId: string | null;
  readonly finishReason: string | null;
}

function containsInvisibleOrControl(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    if (
      codePoint <= 8 ||
      codePoint === 11 ||
      codePoint === 12 ||
      (codePoint >= 14 && codePoint <= 31) ||
      codePoint === 127
    ) {
      return true;
    }
  }
  return INVISIBLE_PATTERN.test(value);
}

function assertQuestion(question: unknown): string | null {
  if (question === undefined) return null;
  if (typeof question !== 'string' || question.length > 1_000) {
    throw new AiReadingError(
      'INVALID_REQUEST',
      'question must be a string no longer than 1,000 characters.',
    );
  }
  const normalized = question.normalize('NFKC').trim();
  if (normalized.length > 1_000 || containsInvisibleOrControl(normalized)) {
    throw new AiReadingError(
      'INVALID_REQUEST',
      'question contains unsupported invisible characters or is too long after normalization.',
    );
  }
  return normalized.length === 0 ? null : normalized;
}

function assertSafeEngineText(value: unknown, path: string, maximum: number): string {
  if (typeof value !== 'string') {
    throw new AiReadingError('INVALID_REQUEST', `${path} must be a string.`);
  }
  const text = value.normalize('NFKC').trim();
  if (
    text.length === 0 ||
    text.length > maximum ||
    containsInvisibleOrControl(text) ||
    HTML_OR_URL_PATTERN.test(text)
  ) {
    throw new AiReadingError(
      'INVALID_REQUEST',
      'The interpretation report contains text that is unsafe for AI narration.',
      { details: { path } },
    );
  }
  return text;
}

function assertAuthenticAssessment(value: unknown): asserts value is SajuInterpretationReport {
  if (!isRecord(value)) {
    throw new AiReadingError(
      'INVALID_REQUEST',
      'assessment must be an in-process saju-engine interpretation report.',
    );
  }
  if (
    !isAuthenticInterpretationReport(value) ||
    !isRecord(value.profile) ||
    !isRecord(value.subject) ||
    !Array.isArray(value.findings) ||
    !Array.isArray(value.unavailableRules)
  ) {
    throw new AiReadingError(
      'INVALID_REQUEST',
      'assessment must be an in-process saju-engine interpretation report.',
    );
  }
}

function copySubject(
  subject: SajuInterpretationReport['subject'],
): SajuInterpretationReport['subject'] {
  if (
    (subject.kind !== 'exact' && subject.kind !== 'possibilities') ||
    !Number.isInteger(subject.candidateCount) ||
    subject.candidateCount < 1 ||
    !['known', 'candidate', 'omitted'].includes(subject.hourPillar)
  ) {
    throw new AiReadingError('INVALID_REQUEST', 'assessment.subject is invalid.');
  }
  return {
    kind: subject.kind,
    candidateCount: subject.candidateCount,
    hourPillar: subject.hourPillar,
  };
}

function copyNarrationFinding(
  finding: InterpretationFinding,
  index: number,
): SajuNarrationEvidenceFinding {
  const isCandidateId = (value: unknown): value is string =>
    typeof value === 'string' && /^[A-Za-z0-9_.@:-]{1,240}$/.test(value);
  const isPillarName = (
    value: unknown,
  ): value is SajuNarrationEvidenceFinding['omittedPillars'][number] =>
    typeof value === 'string' && PILLAR_NAMES.has(value);
  const isString = (value: unknown): value is string => typeof value === 'string';
  if (
    !isRecord(finding) ||
    typeof finding.id !== 'string' ||
    typeof finding.ruleId !== 'string' ||
    typeof finding.topic !== 'string' ||
    !ALLOWED_TOPICS.has(finding.topic) ||
    (finding.category !== 'structural-observation' &&
      finding.category !== 'traditional-judgment') ||
    (finding.stability !== 'stable' && finding.stability !== 'candidate-dependent') ||
    (finding.coverage !== 'complete' && finding.coverage !== 'partial') ||
    !isArrayOf(finding.omittedPillars, isPillarName) ||
    !isArrayOf(finding.sourceReferenceIds, isString) ||
    !isArrayOf(finding.candidateIds, isCandidateId) ||
    finding.candidateIds.length === 0 ||
    new Set(finding.candidateIds).size !== finding.candidateIds.length ||
    !isArrayOf(finding.absentCandidateIds, isCandidateId) ||
    new Set(finding.absentCandidateIds).size !== finding.absentCandidateIds.length ||
    finding.candidateIds.some((candidateId) => finding.absentCandidateIds.includes(candidateId))
  ) {
    throw new AiReadingError('INVALID_REQUEST', `assessment.findings[${index}] is invalid.`);
  }
  return {
    id: finding.id,
    ruleId: finding.ruleId,
    topic: finding.topic,
    category: finding.category,
    stability: finding.stability,
    coverage: finding.coverage,
    omittedPillars: [...finding.omittedPillars],
    statement: assertSafeEngineText(
      finding.statement,
      `assessment.findings[${index}].statement`,
      1_200,
    ),
    candidateIds: [...finding.candidateIds],
    absentCandidateIds: [...finding.absentCandidateIds],
    sourceReferenceIds: [...finding.sourceReferenceIds],
  };
}

function copyUnavailableRule(
  rule: UnavailableInterpretationRule,
  index: number,
): UnavailableInterpretationRule {
  const isPillarName = (
    value: unknown,
  ): value is UnavailableInterpretationRule['missingPillars'][number] =>
    typeof value === 'string' && PILLAR_NAMES.has(value);
  const isString = (value: unknown): value is string => typeof value === 'string';
  if (
    !isRecord(rule) ||
    typeof rule.ruleId !== 'string' ||
    rule.reason !== 'missing-required-pillar' ||
    !isArrayOf(rule.missingPillars, isPillarName) ||
    !isArrayOf(rule.candidateIds, isString)
  ) {
    throw new AiReadingError(
      'INVALID_REQUEST',
      `assessment.unavailableRules[${index}] is invalid.`,
    );
  }
  return {
    ruleId: rule.ruleId,
    reason: 'missing-required-pillar',
    missingPillars: [...rule.missingPillars],
    candidateIds: [...rule.candidateIds],
  };
}

function buildNarrationRequest(
  assessment: SajuInterpretationReport,
  locale: SajuReadingLocale,
  purpose: SajuReadingPurpose,
  audience: SajuReadingAudience,
  question: string | null,
  variantPolicy: SajuVariantPolicy,
  readingMode: SajuReadingModePreference,
): SajuNarrationRequest {
  const allFindings = assessment.findings.map(copyNarrationFinding);
  const profileFindingPrefix = `${assessment.profile.id}@${assessment.profile.version}:`;
  if (allFindings.some(({ id }) => !id.startsWith(profileFindingPrefix))) {
    throw new AiReadingError(
      'INVALID_REQUEST',
      'assessment findings must belong to the assessment Tradition Pack.',
    );
  }
  const findings =
    variantPolicy === 'stable-only'
      ? allFindings.filter(({ stability }) => stability === 'stable')
      : allFindings;
  if (new Set(findings.map(({ id }) => id)).size !== findings.length) {
    throw new AiReadingError('INVALID_REQUEST', 'assessment finding IDs must be unique.');
  }
  return deepFreeze({
    schemaVersion: '3',
    task: {
      mode: 'grounded-interpretation',
      answerUserQuestionDirectly: true,
      responseOrder: ['direct-answer', 'lived-patterns', 'applications', 'concise-conclusion'],
      keepCalculationAndInterpretationDistinct: true,
      topicNeutral: true,
      omitCalendarAndGanzhiClaimsWithoutEvidence: true,
      presentation: SAJU_NARRATION_PRESENTATION_POLICY,
      readingPolicy: resolveSajuReadingPolicy(question, purpose, readingMode),
    },
    template: SAJU_NARRATION_PROMPT_TEMPLATE,
    grounding: {
      id: 'saju-finding-references',
      version: '2.0.0',
      userQuestionIsUntrustedData: true,
      findingReferencesRequired: true,
      preserveCandidateUncertainty: true,
      variantPolicy,
      chronologyOrTimingEvidenceProvided: false,
      calendarGanzhiClaimsAllowed: false,
      quotedOrRefutedClaimsExempted: false,
    },
    user: { locale, purpose, audience, question },
    evidence: {
      profile: {
        id: assessment.profile.id,
        version: assessment.profile.version,
      },
      subject: copySubject(assessment.subject),
      findings,
      nonDisplayGuardrails: {
        neverQuoteOrParaphrase: true,
        profileLimitations: assessment.profile.knownLimitations.map((id) => ({
          id,
          message: profileLimitationMessage(id),
        })),
        unavailableRules: assessment.unavailableRules.map(copyUnavailableRule),
      },
    },
    outputSchema: SAJU_NARRATIVE_JSON_SCHEMA,
  });
}

function assertOnlyKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
  path: string,
  code: 'INVALID_REQUEST' | 'INVALID_NARRATOR_OUTPUT' = 'INVALID_NARRATOR_OUTPUT',
): void {
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extra.length > 0) {
    throw new AiReadingError(code, `${path} contains unsupported properties.`, {
      details: { path, propertyCount: extra.length },
    });
  }
}

function copyFindingIds(value: unknown, path: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 16 ||
    !value.every(
      (findingId) => typeof findingId === 'string' && /^[A-Za-z0-9_.@:-]{1,240}$/.test(findingId),
    )
  ) {
    throw new AiReadingError(
      'INVALID_NARRATOR_OUTPUT',
      `${path} must contain 1 through 16 safe finding IDs.`,
    );
  }
  const findingIds = [...new Set(value as string[])];
  if (findingIds.length !== value.length) {
    throw new AiReadingError('INVALID_NARRATOR_OUTPUT', `${path} must be unique.`);
  }
  return findingIds;
}

function copyNarratorText(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new AiReadingError('INVALID_NARRATOR_OUTPUT', `${path} must be a string.`);
  }
  const text = value.normalize('NFKC').trim();
  if (
    text.length === 0 ||
    text.length > SAJU_NARRATION_PRESENTATION_POLICY.maxParagraphCharacters ||
    containsInvisibleOrControl(text) ||
    HTML_OR_URL_PATTERN.test(text)
  ) {
    throw new AiReadingError(
      'INVALID_NARRATOR_OUTPUT',
      `${path} must be plain text between 1 and ${SAJU_NARRATION_PRESENTATION_POLICY.maxParagraphCharacters} characters.`,
    );
  }
  return text;
}

interface GanzhiClaimCandidate {
  readonly start: number;
  end: number;
  validSexagenaryPair: boolean;
}

function hasGanzhiTokenBoundary(text: string, start: number, end: number): boolean {
  const preceding = start === 0 ? '' : text.slice(start - 1, start);
  if (GANZHI_TOKEN_PRECEDING_LETTER_PATTERN.test(preceding)) return false;

  const following = text.slice(end);
  if (following.length === 0) return true;
  const first = following[0]!;
  if (/[\s"'“”‘’()[\]{},.;:!?，。；：！？]/u.test(first)) return true;
  return GANZHI_TOKEN_FOLLOWER_PATTERN.test(following);
}

function ganzhiClaimCandidates(text: string): readonly GanzhiClaimCandidate[] {
  const candidates: GanzhiClaimCandidate[] = [];

  for (const match of text.matchAll(GANZHI_PAIR_PATTERN)) {
    const matchedText = match[0];
    const start = match.index;
    const end = start + matchedText.length;
    if (!hasGanzhiTokenBoundary(text, start, end)) continue;

    const hangul = match[1] !== undefined;
    const stem = hangul ? match[1]! : match[3]!;
    const branch = hangul ? match[2]! : match[4]!;
    const stems = hangul ? HANGUL_STEMS : HANJA_STEMS;
    const branches = hangul ? HANGUL_BRANCHES : HANJA_BRANCHES;
    const validSexagenaryPair = stems.indexOf(stem) % 2 === branches.indexOf(branch) % 2;
    const previous = candidates[candidates.length - 1];

    // 병오(丙午)처럼 같은 간지를 두 문자 체계로 병기한 표기는 한 주장이다.
    if (
      previous !== undefined &&
      PARENTHETICAL_GANZHI_SEPARATOR_PATTERN.test(text.slice(previous.end, start))
    ) {
      previous.end = end;
      previous.validSexagenaryPair &&= validSexagenaryPair;
      continue;
    }

    candidates.push({ start, end, validSexagenaryPair });
  }

  return candidates;
}

function isSentenceBoundaryAt(text: string, index: number): boolean {
  const character = text[index];
  if (character === '.' && /\d/u.test(text[index - 1] ?? '') && /\d/u.test(text[index + 1] ?? '')) {
    return false;
  }
  return character !== undefined && SENTENCE_BOUNDARY_CHARACTERS.has(character);
}

function countSentences(text: string): number {
  let count = 0;
  let hasText = false;
  for (let index = 0; index < text.length; index += 1) {
    if (isSentenceBoundaryAt(text, index)) {
      if (hasText) count += 1;
      hasText = false;
    } else if (!/\s/u.test(text[index]!)) {
      hasText = true;
    }
  }
  return count + (hasText ? 1 : 0);
}

function assertCompactParagraphShape(text: string, path: string): void {
  const sentenceCount = countSentences(text);
  if (sentenceCount > SAJU_NARRATION_PRESENTATION_POLICY.maxParagraphSentences) {
    throw new AiReadingError(
      'INVALID_NARRATOR_OUTPUT',
      'Narrator paragraphs must follow the compact presentation contract.',
      {
        details: {
          path,
          policy: 'compact-presentation',
          sentenceCount,
          maximumSentenceCount: SAJU_NARRATION_PRESENTATION_POLICY.maxParagraphSentences,
        },
      },
    );
  }
}

function assertNoUnrequestedAdvancedDoctrine(
  text: string,
  policy: ResolvedSajuReadingPolicy,
  path: string,
): void {
  const violation = findSajuDisclosureViolation(text, policy);
  if (violation === null) return;
  throw new AiReadingError(
    'INVALID_NARRATOR_OUTPUT',
    'Advanced doctrine requires explicit user opt-in.',
    {
      details: {
        path,
        policy: 'advanced-doctrine-explicit-opt-in',
        doctrine: violation,
      },
    },
  );
}

function assertTopicWasRequested(
  topic: InterpretationTopic,
  policy: ResolvedSajuReadingPolicy,
  path: string,
): void {
  if (isSajuInterpretationTopicAllowed(topic, policy)) return;
  throw new AiReadingError(
    'INVALID_NARRATOR_OUTPUT',
    'Advanced topic requires explicit user opt-in.',
    {
      details: {
        path,
        policy: 'advanced-doctrine-explicit-opt-in',
        doctrine: doctrineDisclosureIdForTopic(topic),
      },
    },
  );
}

function sentenceContainingCandidate(text: string, candidate: GanzhiClaimCandidate): string {
  let start = candidate.start;
  while (start > 0 && !isSentenceBoundaryAt(text, start - 1)) start -= 1;

  let end = candidate.end;
  while (end < text.length && !isSentenceBoundaryAt(text, end)) end += 1;

  return text.slice(start, end);
}

function isCalendarGanzhiClaim(text: string, candidate: GanzhiClaimCandidate): boolean {
  const after = text.slice(candidate.end);

  if (NON_DAY_TEMPORAL_SUFFIX_PATTERN.test(after) || DAY_TEMPORAL_SUFFIX_PATTERN.test(after)) {
    return true;
  }

  const sentence = sentenceContainingCandidate(text, candidate);
  return CALENDAR_ANCHOR_PATTERN.test(sentence) || CALENDAR_GANZHI_KEYWORD_PATTERN.test(sentence);
}

function assertNoUnsupportedCalendarGanzhiClaims(text: string, path: string): void {
  let validSexagenaryPairCount = 0;
  let invalidSexagenaryPairCount = 0;

  for (const candidate of ganzhiClaimCandidates(text)) {
    if (!isCalendarGanzhiClaim(text, candidate)) continue;
    if (candidate.validSexagenaryPair) {
      validSexagenaryPairCount += 1;
    } else {
      invalidSexagenaryPairCount += 1;
    }
  }

  const claimCount = validSexagenaryPairCount + invalidSexagenaryPairCount;
  if (claimCount === 0) return;

  throw new AiReadingError(
    'UNGROUNDED_OUTPUT',
    'Calendar-date and sexagenary-cycle claims require chronology or timing evidence.',
    {
      details: {
        path,
        policy: 'calendar-ganzhi-evidence-required',
        chronologyOrTimingEvidenceProvided: false,
        quotedOrRefutedClaimsExempted: false,
        claimCount,
        validSexagenaryPairCount,
        invalidSexagenaryPairCount,
      },
    },
  );
}

function validateAndLabelParagraph(
  text: string,
  findingIds: readonly string[],
  findingsById: ReadonlyMap<string, SajuNarrationEvidenceFinding>,
  path: string,
  policy: ResolvedSajuReadingPolicy,
): SajuNarrativeParagraph {
  const unknownIds = findingIds.filter((findingId) => !findingsById.has(findingId));
  if (unknownIds.length > 0) {
    throw new AiReadingError(
      'UNGROUNDED_OUTPUT',
      'Narrator output references findings that were not provided.',
      { details: { path, unknownCount: unknownIds.length } },
    );
  }
  assertCompactParagraphShape(text, path);
  assertNoUnrequestedAdvancedDoctrine(text, policy, path);
  assertNoUnsupportedCalendarGanzhiClaims(text, path);
  const findings = findingIds.map((findingId) => findingsById.get(findingId)!);
  const conditionalFindings = findings.filter(
    ({ stability }) => stability === 'candidate-dependent',
  );
  const containsPartialFinding = findings.some(({ coverage }) => coverage === 'partial');
  const supportSets = new Set(
    conditionalFindings.map(({ candidateIds }) => [...candidateIds].sort().join('\u001f')),
  );
  if (conditionalFindings.length > 0 && conditionalFindings.length !== findings.length) {
    throw new AiReadingError(
      'UNCERTAINTY_VIOLATION',
      'Stable and candidate-dependent findings must use separate paragraphs.',
      { details: { path } },
    );
  }
  if (supportSets.size > 1) {
    throw new AiReadingError(
      'UNCERTAINTY_VIOLATION',
      'One paragraph cannot combine findings from different candidate subsets.',
      { details: { path } },
    );
  }
  const candidateDependent = conditionalFindings.length > 0;
  const conditional = candidateDependent || containsPartialFinding;
  const uncertaintyLabel =
    candidateDependent && containsPartialFinding
      ? '생시 후보에 따라 달라지는 내용입니다. 확인된 기둥만 반영했습니다.'
      : candidateDependent
        ? '생시 후보에 따라 달라질 수 있습니다.'
        : containsPartialFinding
          ? '확인된 기둥만 반영한 내용입니다.'
          : null;
  const labeledText = uncertaintyLabel === null ? text : `${uncertaintyLabel} ${text}`;
  if (
    labeledText.length >
    SAJU_NARRATION_PRESENTATION_POLICY.maxParagraphCharacters +
      (uncertaintyLabel?.length ?? 0) +
      (uncertaintyLabel === null ? 0 : 1)
  ) {
    throw new AiReadingError(
      'INVALID_NARRATOR_OUTPUT',
      'The uncertainty label produces an excessively long paragraph.',
      { details: { path } },
    );
  }
  assertCompactParagraphShape(labeledText, path);
  return {
    text: labeledText,
    findingIds: [...findingIds],
    certainty: conditional ? 'conditional' : 'grounded',
  };
}

function parseParagraphPlan(
  value: unknown,
  path: string,
  findingsById: ReadonlyMap<string, SajuNarrationEvidenceFinding>,
  policy: ResolvedSajuReadingPolicy,
): SajuNarrativeParagraph {
  if (!isRecord(value)) {
    throw new AiReadingError('INVALID_NARRATOR_OUTPUT', `${path} must be an object.`);
  }
  assertOnlyKeys(value, ['text', 'findingIds'], path);
  return validateAndLabelParagraph(
    copyNarratorText(value.text, `${path}.text`),
    copyFindingIds(value.findingIds, `${path}.findingIds`),
    findingsById,
    path,
    policy,
  );
}

function parseSectionPlan(
  value: unknown,
  index: number,
  findingsById: ReadonlyMap<string, SajuNarrationEvidenceFinding>,
  policy: ResolvedSajuReadingPolicy,
): SajuNarrativeSection {
  const path = `sections[${index}]`;
  if (!isRecord(value)) {
    throw new AiReadingError('INVALID_NARRATOR_OUTPUT', `${path} must be an object.`);
  }
  assertOnlyKeys(value, ['topic', 'paragraphs'], path);
  if (typeof value.topic !== 'string' || !ALLOWED_TOPICS.has(value.topic)) {
    throw new AiReadingError(
      'INVALID_NARRATOR_OUTPUT',
      `${path}.topic is not a supported interpretation topic.`,
    );
  }
  if (
    !Array.isArray(value.paragraphs) ||
    value.paragraphs.length === 0 ||
    value.paragraphs.length > SAJU_NARRATION_PRESENTATION_POLICY.maxParagraphsPerSection
  ) {
    throw new AiReadingError(
      'INVALID_NARRATOR_OUTPUT',
      `${path}.paragraphs must contain 1 through ${SAJU_NARRATION_PRESENTATION_POLICY.maxParagraphsPerSection} items.`,
    );
  }
  const topic = value.topic as InterpretationTopic;
  assertTopicWasRequested(topic, policy, `${path}.topic`);
  const paragraphs = value.paragraphs.map((paragraph, paragraphIndex) =>
    parseParagraphPlan(paragraph, `${path}.paragraphs[${paragraphIndex}]`, findingsById, policy),
  );
  for (const [paragraphIndex, paragraph] of paragraphs.entries()) {
    if (paragraph.findingIds.some((findingId) => findingsById.get(findingId)?.topic !== topic)) {
      throw new AiReadingError(
        'UNGROUNDED_OUTPUT',
        'Every section may contain findings from its declared topic only.',
        { details: { path: `${path}.paragraphs[${paragraphIndex}]`, topic } },
      );
    }
  }
  return {
    id: topic,
    title: SAJU_TOPIC_TITLES[topic],
    paragraphs,
  };
}

function parseNarrative(
  raw: unknown,
  findings: readonly SajuNarrationEvidenceFinding[],
  policy: ResolvedSajuReadingPolicy,
): SajuNarrative {
  if (!isRecord(raw)) {
    throw new AiReadingError('INVALID_NARRATOR_OUTPUT', 'Narrator output must be a JSON object.');
  }
  assertOnlyKeys(raw, ['summary', 'sections'], 'output');
  if (
    !Array.isArray(raw.sections) ||
    raw.sections.length > SAJU_NARRATION_PRESENTATION_POLICY.maxSections
  ) {
    throw new AiReadingError(
      'INVALID_NARRATOR_OUTPUT',
      `sections must be an array with at most ${SAJU_NARRATION_PRESENTATION_POLICY.maxSections} items.`,
    );
  }
  const findingsById = new Map(findings.map((finding) => [finding.id, finding] as const));
  const summary = parseParagraphPlan(raw.summary, 'summary', findingsById, policy);
  const sections = raw.sections.map((section, index) =>
    parseSectionPlan(section, index, findingsById, policy),
  );
  const sectionIds = sections.map(({ id }) => id);
  if (new Set(sectionIds).size !== sectionIds.length) {
    throw new AiReadingError('INVALID_NARRATOR_OUTPUT', 'section topics must be unique.');
  }
  const characterCount = [summary, ...sections.flatMap(({ paragraphs }) => paragraphs)].reduce(
    (total, paragraph) => total + paragraph.text.length,
    0,
  );
  if (characterCount > SAJU_NARRATION_PRESENTATION_POLICY.maxNarrativeCharacters) {
    throw new AiReadingError(
      'INVALID_NARRATOR_OUTPUT',
      'Narrator output exceeds the compact presentation contract.',
      {
        details: {
          policy: 'compact-presentation',
          characterCount,
          maximumCharacterCount: SAJU_NARRATION_PRESENTATION_POLICY.maxNarrativeCharacters,
        },
      },
    );
  }
  return { title: SAJU_NARRATIVE_TITLE, summary, sections };
}

function parseNarratorResponse(value: unknown): ParsedNarratorResponse {
  if (!isRecord(value) || !isRecord(value.metadata)) {
    throw new AiReadingError(
      'INVALID_NARRATOR_OUTPUT',
      'Narrator must return an output and metadata envelope.',
    );
  }
  assertOnlyKeys(value, ['output', 'metadata'], 'narratorResponse');
  assertOnlyKeys(
    value.metadata,
    ['actualModel', 'providerRequestId', 'finishReason'],
    'narratorResponse.metadata',
  );
  const actualModel = assertSafeIdentifier(
    value.metadata.actualModel,
    'narratorResponse.metadata.actualModel',
    160,
    'INVALID_NARRATOR_OUTPUT',
  );
  const providerRequestId =
    value.metadata.providerRequestId === undefined
      ? null
      : assertSafeIdentifier(
          value.metadata.providerRequestId,
          'narratorResponse.metadata.providerRequestId',
          500,
          'INVALID_NARRATOR_OUTPUT',
        );
  const finishReason =
    value.metadata.finishReason === undefined
      ? null
      : assertSafeIdentifier(
          value.metadata.finishReason,
          'narratorResponse.metadata.finishReason',
          160,
          'INVALID_NARRATOR_OUTPUT',
        );
  return { output: value.output, actualModel, providerRequestId, finishReason };
}

function copyProviderJson(value: unknown): unknown {
  const state = { nodes: 0, characters: 0 };

  const copy = (current: unknown, depth: number): unknown => {
    state.nodes += 1;
    if (depth > 20 || state.nodes > 5_000) {
      throw new TypeError('provider response exceeds structural limits');
    }
    if (current === null || typeof current === 'boolean') return current;
    if (typeof current === 'number') {
      if (!Number.isFinite(current)) throw new TypeError('provider response is not JSON');
      return current;
    }
    if (typeof current === 'string') {
      state.characters += current.length;
      if (current.length > 50_000 || state.characters > 200_000) {
        throw new TypeError('provider response exceeds text limits');
      }
      return current;
    }
    if (typeof current !== 'object') throw new TypeError('provider response is not JSON');

    if (Array.isArray(current)) {
      if (current.length > 1_000) throw new TypeError('provider array is too large');
      const keys = Reflect.ownKeys(current).filter((key) => key !== 'length');
      if (
        keys.some(
          (key) =>
            typeof key !== 'string' ||
            !/^(?:0|[1-9][0-9]*)$/.test(key) ||
            Number(key) >= current.length,
        )
      ) {
        throw new TypeError('provider array has unsupported properties');
      }
      const result: unknown[] = [];
      for (let index = 0; index < current.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(current, String(index));
        if (descriptor === undefined || !('value' in descriptor)) {
          throw new TypeError('provider array must be dense data');
        }
        result.push(copy(descriptor.value, depth + 1));
      }
      return result;
    }

    const prototype = Reflect.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('provider object must be plain');
    }
    const keys = Reflect.ownKeys(current);
    if (keys.length > 100 || keys.some((key) => typeof key !== 'string')) {
      throw new TypeError('provider object has unsupported keys');
    }
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys as string[]) {
      state.characters += key.length;
      if (key.length > 240 || state.characters > 200_000) {
        throw new TypeError('provider object keys exceed text limits');
      }
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
        throw new TypeError('provider object has unsafe keys');
      }
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
        throw new TypeError('provider object must contain enumerable data properties');
      }
      Object.defineProperty(result, key, {
        value: copy(descriptor.value, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return result;
  };

  return copy(value, 0);
}

function buildReadingLimitations(
  assessment: SajuInterpretationReport,
  variantPolicy: SajuVariantPolicy,
  excludedCandidateDependentCount: number,
): AiSajuReadingReport['notice']['limitations'] {
  const limitations: AiSajuReadingReport['notice']['limitations'][number][] = [];
  if (assessment.subject.hourPillar === 'omitted') {
    limitations.push({
      code: 'UNKNOWN_BIRTH_TIME',
      message: '생시가 확인되지 않아 시주를 만들지 않았습니다.',
    });
  } else if (assessment.subject.kind === 'possibilities') {
    limitations.push({
      code: 'CONSTRAINED_BIRTH_TIME',
      message: '입력한 생시 범위와 계산 기준에 맞는 원국 후보를 모두 계산했습니다.',
    });
  }
  if (assessment.subject.candidateCount > 1) {
    limitations.push({
      code: 'MULTIPLE_CANDIDATES',
      message: `원국 후보는 ${assessment.subject.candidateCount}개입니다. 후보마다 성립하는 시간 구간을 표시했지만 확률로 환산하지는 않았습니다.`,
    });
  }
  if (assessment.findings.some(({ coverage }) => coverage === 'partial')) {
    limitations.push({
      code: 'PARTIAL_FINDINGS',
      message: '일부 결과는 확인된 기둥만으로 계산했습니다. 빠진 기둥은 따로 표시합니다.',
    });
  }
  if (variantPolicy === 'stable-only' && excludedCandidateDependentCount > 0) {
    limitations.push({
      code: 'CANDIDATE_DEPENDENT_EXCLUDED',
      message: `기본값에서는 생시 후보에 따라 달라지는 결과 ${excludedCandidateDependentCount}개를 AI 입력에서 뺐습니다.`,
    });
  }
  if (assessment.unavailableRules.length > 0) {
    const ruleIds = assessment.unavailableRules.map(({ ruleId }) => ruleId).join(', ');
    limitations.push({
      code: 'UNAVAILABLE_RULES',
      message: `필수 기둥이 없어 평가하지 못한 규칙: ${ruleIds}`,
    });
  }
  if (assessment.findings.some(({ ruleId }) => ruleId === 'core.element-balance')) {
    limitations.push({
      code: 'SYNTHETIC_ELEMENT_BALANCE',
      message:
        '오행 비율은 여러 값을 합산한 참고 지표입니다. 이 숫자만으로 신강·신약이나 용신을 정하지 않습니다.',
    });
  }
  if (assessment.findings.every(({ category }) => category === 'structural-observation')) {
    limitations.push({
      code: 'STRUCTURAL_PROFILE_ONLY',
      message: '이 프로필은 원국 구조를 계산한 결과만 담습니다.',
    });
  }
  for (const profileLimitationId of assessment.profile.knownLimitations) {
    limitations.push({
      code: 'PROFILE_LIMITATION',
      profileLimitationId,
      message: profileLimitationMessage(profileLimitationId),
    });
  }
  return limitations;
}

export async function createAiSajuReading(
  input: CreateAiSajuReadingInput,
): Promise<AiSajuReadingReport> {
  if (!isRecord(input)) {
    throw new AiReadingError('INVALID_REQUEST', 'reading input must be an object.');
  }
  const narrator = snapshotNarrator(input.narrator);
  const request = prepareAiSajuNarrationRequest(input);
  const variantPolicy = request.grounding.variantPolicy;
  const question = request.user.question;
  const excludedCandidateDependentCount =
    input.assessment.findings.filter(({ stability }) => stability === 'candidate-dependent')
      .length -
    request.evidence.findings.filter(({ stability }) => stability === 'candidate-dependent').length;

  let parsedResponse: ParsedNarratorResponse | null = null;
  let narrative: SajuNarrative;
  if (request.evidence.findings.length === 0) {
    narrative = {
      title: SAJU_NARRATIVE_TITLE,
      summary: {
        text: '현재 입력과 프로필만으로 설명할 만한 결과가 없습니다.',
        findingIds: [],
        certainty: 'grounded',
      },
      sections: [],
    };
  } else {
    let providerResponse: SajuNarratorResponse;
    try {
      providerResponse = await narrator.narrate(request);
    } catch {
      // Provider errors frequently include request bodies, credentials, or headers.
      // Keep the public error deliberately opaque.
      throw new AiReadingError('NARRATOR_FAILURE', 'The narrator failed to generate a response.');
    }

    let safeProviderResponse: unknown;
    try {
      safeProviderResponse = copyProviderJson(providerResponse);
    } catch {
      throw new AiReadingError(
        'INVALID_NARRATOR_OUTPUT',
        'Narrator output could not be safely inspected.',
      );
    }
    parsedResponse = parseNarratorResponse(safeProviderResponse);
    narrative = parseNarrative(
      parsedResponse.output,
      request.evidence.findings,
      request.task.readingPolicy,
    );
  }
  const generatedByAI = parsedResponse !== null;
  const result: AiSajuReadingReport = {
    schemaVersion: '2',
    generatedByAI,
    generationMode: generatedByAI ? 'ai-interpreted' : 'deterministic-limitations-only',
    narrative,
    notice: {
      code: 'TRADITIONAL_INTERPRETATION',
      displayPolicy: 'audit-only',
      defaultDisplay: false,
      message: generatedByAI
        ? '엔진이 계산한 명식과 학파별 근거로 생성형 AI가 쓴 전통 명리 해석입니다. 전통 규칙의 현실 예측력은 실증되지 않았습니다. 사용한 근거와 프로필 한계는 검증 정보에 기록합니다.'
        : '현재 입력과 프로필에서 해석에 인용할 근거를 찾지 못해 계산상의 한계만 담았습니다.',
      empiricalValidation: 'not-established',
      limitations: buildReadingLimitations(
        input.assessment,
        variantPolicy,
        excludedCandidateDependentCount,
      ),
    },
    audit: {
      profile: {
        id: input.assessment.profile.id,
        version: input.assessment.profile.version,
      },
      narrator: {
        id: narrator.id,
        requestedModel: narrator.requestedModel,
        invoked: generatedByAI,
        actualModel: parsedResponse?.actualModel ?? null,
        providerRequestId: parsedResponse?.providerRequestId ?? null,
        finishReason: parsedResponse?.finishReason ?? null,
      },
      promptTemplate: SAJU_NARRATION_PROMPT_TEMPLATE,
      grounding: {
        id: 'saju-finding-references',
        version: '2.0.0',
        variantPolicy,
        chronologyOrTimingEvidenceProvided: false,
        calendarGanzhiClaimsAllowed: false,
        quotedOrRefutedClaimsExempted: false,
      },
      outputSchemaVersion: '3',
      privacy: {
        structuredBirthRequestSentToNarrator: false,
        chronologySentToNarrator: false,
        originalTimeEvidenceSentToNarrator: false,
        userQuestionSentToNarrator: generatedByAI && question !== null,
        userQuestionMayContainPersonalData: true,
      },
      validation: {
        everyAiParagraphHasFindingReferences: true,
        findingReferencesValidated: true,
        providerTextAccepted: generatedByAI,
        conditionalClaimsLabeled: true,
        plainTextValidated: true,
        unsupportedCalendarGanzhiClaimsRejected: true,
        compactPresentationValidated: true,
        unrequestedAdvancedDoctrineRejected: true,
      },
    },
  };
  return deepFreeze(result);
}

export function prepareAiSajuNarrationRequest(
  input: PrepareAiSajuNarrationRequestInput,
): SajuNarrationRequest {
  if (!isRecord(input)) {
    throw new AiReadingError('INVALID_REQUEST', 'narration request input must be an object.');
  }
  assertAuthenticAssessment(input.assessment);
  const locale = assertReadingLocale(input.locale ?? DEFAULT_LOCALE);
  const purpose = assertReadingPurpose(input.purpose ?? DEFAULT_PURPOSE);
  const audience = assertReadingAudience(input.audience ?? DEFAULT_AUDIENCE);
  const variantPolicy = assertReadingVariantPolicy(input.variantPolicy ?? DEFAULT_VARIANT_POLICY);
  const question = assertQuestion(input.question);
  const readingMode = assertReadingModePreference(input.readingMode ?? 'auto');
  return buildNarrationRequest(
    input.assessment,
    locale,
    purpose,
    audience,
    question,
    variantPolicy,
    readingMode,
  );
}

function assertServiceRequest(value: unknown): asserts value is AiSajuServiceRequest {
  if (
    !isRecord(value) ||
    !isRecord(value.calculation) ||
    (value.calculation.kind !== 'exact' && value.calculation.kind !== 'possibilities') ||
    !('request' in value.calculation)
  ) {
    throw new AiReadingError(
      'INVALID_REQUEST',
      'service request must contain an exact or possibilities calculation.',
    );
  }
}

async function readFromService(
  options: ServiceSnapshot,
  request: AiSajuServiceRequest,
): Promise<ExactAiSajuServiceResult | PossibilityAiSajuServiceResult> {
  assertServiceRequest(request);
  const calculation =
    request.calculation.kind === 'exact'
      ? calculateSaju(request.calculation.request)
      : calculateSajuPossibilities(request.calculation.request);
  const interpretation = evaluateSajuInterpretation(calculation, {
    profile: options.profile,
  });
  const reading = await createAiSajuReading({
    assessment: interpretation,
    narrator: options.narrator,
    locale: request.locale ?? options.locale,
    purpose: request.purpose ?? options.purpose,
    audience: request.audience ?? options.audience,
    ...(request.question === undefined ? {} : { question: request.question }),
    variantPolicy: request.variantPolicy ?? options.variantPolicy,
    readingMode: request.readingMode ?? options.readingMode,
  });

  if (request.calculation.kind === 'exact') {
    return deepFreeze({
      schemaVersion: OH_MY_SAJU_RUNTIME_MANIFEST.traditions.reportSchemaVersion,
      calculationKind: 'exact',
      calculation: calculation as ExactAiSajuServiceResult['calculation'],
      interpretation,
      reading,
    });
  }
  return deepFreeze({
    schemaVersion: OH_MY_SAJU_RUNTIME_MANIFEST.traditions.reportSchemaVersion,
    calculationKind: 'possibilities',
    calculation: calculation as PossibilityAiSajuServiceResult['calculation'],
    interpretation,
    reading,
  });
}

export function createAiSajuService(options: CreateAiSajuServiceOptions): AiSajuService {
  if (!isRecord(options)) {
    throw new AiReadingError('INVALID_REQUEST', 'service options are required.');
  }
  const snapshot: ServiceSnapshot = deepFreeze({
    profile: snapshotTraditionRuleProfile(options.profile),
    narrator: snapshotNarrator(options.narrator),
    locale: assertReadingLocale(options.locale ?? DEFAULT_LOCALE, 'options.locale'),
    purpose: assertReadingPurpose(options.purpose ?? DEFAULT_PURPOSE, 'options.purpose'),
    audience: assertReadingAudience(options.audience ?? DEFAULT_AUDIENCE, 'options.audience'),
    variantPolicy: assertReadingVariantPolicy(
      options.variantPolicy ?? DEFAULT_VARIANT_POLICY,
      'options.variantPolicy',
    ),
    readingMode: assertReadingModePreference(options.readingMode ?? 'auto', 'options.readingMode'),
  });
  const service = {
    read: (request: AiSajuServiceRequest) => readFromService(snapshot, request),
  };
  return Object.freeze(service) as AiSajuService;
}
