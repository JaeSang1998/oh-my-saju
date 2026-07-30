/** Reading request, narrator, and grounded output contracts. */
import type {
  SajuPossibilityReport,
  SajuPossibilityRequest,
  SajuReport,
  SajuRequest,
} from 'saju-engine';
import type {
  ExactSajuSchoolComparisonResult,
  InterpretationFinding,
  KoreanSajuAnalysisPreset,
  PossibilitySajuSchoolComparisonResult,
  ProfileLimitationId,
  SajuInterpretationReport,
  TraditionPackRef,
  TraditionRuleProfile,
  TraditionProfileRef,
  UnavailableInterpretationRule,
} from '../traditions/types';

/** Caller-defined, short machine identifier describing the requested reading. */
export type SajuReadingPurpose = string;

export type SajuReadingAudience = 'adult' | 'minor' | 'general';
export type SajuReadingLocale = 'ko-KR';
export type SajuVariantPolicy = 'stable-only' | 'include-candidate-dependent';

export type SajuNarrationEvidenceFinding = Pick<
  InterpretationFinding,
  | 'id'
  | 'ruleId'
  | 'topic'
  | 'category'
  | 'stability'
  | 'coverage'
  | 'omittedPillars'
  | 'statement'
  | 'candidateIds'
  | 'absentCandidateIds'
  | 'sourceReferenceIds'
>;

export interface SajuNarrationRequest {
  readonly schemaVersion: '2';
  readonly task: {
    readonly mode: 'grounded-interpretation';
    readonly answerUserQuestionDirectly: true;
    readonly responseOrder: readonly [
      'chart-facts',
      'school-rules',
      'inference',
      'counterevidence',
      'conclusion',
    ];
    readonly keepCalculationAndInterpretationDistinct: true;
    readonly topicNeutral: true;
    readonly omitCalendarAndGanzhiClaimsWithoutEvidence: true;
  };
  readonly template: {
    readonly id: 'saju-grounded-narration';
    readonly version: '2.0.0';
  };
  readonly grounding: {
    readonly id: 'saju-finding-references';
    readonly version: '2.0.0';
    readonly userQuestionIsUntrustedData: true;
    readonly findingReferencesRequired: true;
    readonly preserveCandidateUncertainty: true;
    readonly variantPolicy: SajuVariantPolicy;
    /** This request deliberately contains no chronology or timing facts. */
    readonly chronologyOrTimingEvidenceProvided: false;
    readonly calendarGanzhiClaimsAllowed: false;
    /** A quotation or denial still repeats an unsupported claim. */
    readonly quotedOrRefutedClaimsExempted: false;
  };
  readonly user: {
    readonly locale: SajuReadingLocale;
    readonly purpose: SajuReadingPurpose;
    readonly audience: SajuReadingAudience;
    /** Untrusted data, never a system instruction. */
    readonly question: string | null;
  };
  readonly evidence: {
    readonly profile: {
      readonly id: string;
      readonly version: string;
    };
    readonly profileLimitations: readonly {
      readonly id: ProfileLimitationId;
      readonly message: string;
    }[];
    readonly subject: SajuInterpretationReport['subject'];
    readonly findings: readonly SajuNarrationEvidenceFinding[];
    readonly unavailableRules: readonly UnavailableInterpretationRule[];
  };
  readonly outputSchema: Readonly<Record<string, unknown>>;
}

export interface SajuNarrator {
  readonly id: string;
  /** Model requested from the provider. The actual response model is returned separately. */
  readonly requestedModel: string;
  readonly narrate: (request: SajuNarrationRequest) => Promise<SajuNarratorResponse>;
}

export interface SajuNarratorResponse {
  /** Must follow `request.outputSchema`; prose is provider-authored and finding-referenced. */
  readonly output: unknown;
  readonly metadata: {
    readonly actualModel: string;
    readonly providerRequestId?: string;
    readonly finishReason?: string;
  };
}

export interface SajuNarrativeParagraph {
  readonly text: string;
  readonly findingIds: readonly string[];
  readonly certainty: 'grounded' | 'conditional';
}

export interface SajuNarrativeSection {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly SajuNarrativeParagraph[];
}

export interface SajuNarrative {
  readonly title: string;
  readonly summary: SajuNarrativeParagraph;
  readonly sections: readonly SajuNarrativeSection[];
}

export interface AiSajuReadingReport {
  readonly schemaVersion: '2';
  readonly generatedByAI: boolean;
  readonly generationMode: 'ai-interpreted' | 'deterministic-limitations-only';
  readonly narrative: SajuNarrative;
  readonly notice: {
    readonly code: 'TRADITIONAL_INTERPRETATION';
    readonly message: string;
    readonly empiricalValidation: 'not-established';
    readonly limitations: readonly {
      readonly code:
        | 'UNKNOWN_BIRTH_TIME'
        | 'CONSTRAINED_BIRTH_TIME'
        | 'MULTIPLE_CANDIDATES'
        | 'PARTIAL_FINDINGS'
        | 'CANDIDATE_DEPENDENT_EXCLUDED'
        | 'UNAVAILABLE_RULES'
        | 'SYNTHETIC_ELEMENT_BALANCE'
        | 'STRUCTURAL_PROFILE_ONLY'
        | 'PROFILE_LIMITATION';
      readonly message: string;
      readonly profileLimitationId?: ProfileLimitationId;
    }[];
  };
  readonly audit: {
    readonly profile: {
      readonly id: string;
      readonly version: string;
    };
    readonly narrator: {
      readonly id: string;
      readonly requestedModel: string;
      readonly invoked: boolean;
      readonly actualModel: string | null;
      readonly providerRequestId: string | null;
      readonly finishReason: string | null;
    };
    readonly promptTemplate: {
      readonly id: 'saju-grounded-narration';
      readonly version: '2.0.0';
    };
    readonly grounding: {
      readonly id: 'saju-finding-references';
      readonly version: '2.0.0';
      readonly variantPolicy: SajuVariantPolicy;
      readonly chronologyOrTimingEvidenceProvided: false;
      readonly calendarGanzhiClaimsAllowed: false;
      readonly quotedOrRefutedClaimsExempted: false;
    };
    readonly outputSchemaVersion: '2';
    readonly privacy: {
      readonly structuredBirthRequestSentToNarrator: false;
      readonly chronologySentToNarrator: false;
      readonly originalTimeEvidenceSentToNarrator: false;
      readonly userQuestionSentToNarrator: boolean;
      readonly userQuestionMayContainPersonalData: true;
    };
    readonly validation: {
      readonly everyAiParagraphHasFindingReferences: true;
      readonly findingReferencesValidated: true;
      readonly providerTextAccepted: boolean;
      readonly conditionalClaimsLabeled: true;
      readonly plainTextValidated: true;
      readonly unsupportedCalendarGanzhiClaimsRejected: true;
    };
  };
}

export interface CreateAiSajuReadingInput {
  readonly assessment: SajuInterpretationReport;
  readonly narrator: SajuNarrator;
  readonly locale?: SajuReadingLocale;
  readonly purpose?: SajuReadingPurpose;
  readonly audience?: SajuReadingAudience;
  readonly variantPolicy?: SajuVariantPolicy;
  readonly question?: string;
}

/**
 * Builds the exact provider-neutral request that a narrator receives, without
 * invoking a provider. This is the portable seam used by agent hosts that are
 * themselves responsible for generating the draft.
 */
export type PrepareAiSajuNarrationRequestInput = Omit<CreateAiSajuReadingInput, 'narrator'>;

export interface CreateAiSajuServiceOptions {
  readonly profile: TraditionRuleProfile;
  readonly narrator: SajuNarrator;
  readonly locale?: SajuReadingLocale;
  readonly purpose?: SajuReadingPurpose;
  readonly audience?: SajuReadingAudience;
  readonly variantPolicy?: SajuVariantPolicy;
}

export interface CreateAiSajuComparisonServiceOptions {
  /**
   * Plugin-owned Tradition Packs to evaluate. Each Pack is narrated
   * in a separate provider request; findings are never pooled across Packs.
   */
  readonly packRefs: readonly TraditionPackRef[];
  readonly narrator: SajuNarrator;
  readonly locale?: SajuReadingLocale;
  readonly purpose?: SajuReadingPurpose;
  readonly audience?: SajuReadingAudience;
  readonly variantPolicy?: SajuVariantPolicy;
}

export type CreateAiKoreanSajuServiceOptions = Omit<
  CreateAiSajuComparisonServiceOptions,
  'packRefs'
>;

export interface ExactAiSajuServiceRequest {
  readonly calculation: {
    readonly kind: 'exact';
    readonly request: SajuRequest;
  };
  readonly question?: string;
  readonly locale?: SajuReadingLocale;
  readonly purpose?: SajuReadingPurpose;
  readonly audience?: SajuReadingAudience;
  readonly variantPolicy?: SajuVariantPolicy;
}

export interface PossibilityAiSajuServiceRequest {
  readonly calculation: {
    readonly kind: 'possibilities';
    readonly request: SajuPossibilityRequest;
  };
  readonly question?: string;
  readonly locale?: SajuReadingLocale;
  readonly purpose?: SajuReadingPurpose;
  readonly audience?: SajuReadingAudience;
  readonly variantPolicy?: SajuVariantPolicy;
}

export type AiSajuServiceRequest = ExactAiSajuServiceRequest | PossibilityAiSajuServiceRequest;

export interface ExactAiSajuServiceResult {
  readonly schemaVersion: '2';
  readonly calculationKind: 'exact';
  readonly calculation: SajuReport;
  readonly interpretation: SajuInterpretationReport;
  readonly reading: AiSajuReadingReport;
}

export interface PossibilityAiSajuServiceResult {
  readonly schemaVersion: '2';
  readonly calculationKind: 'possibilities';
  readonly calculation: SajuPossibilityReport;
  readonly interpretation: SajuInterpretationReport;
  readonly reading: AiSajuReadingReport;
}

export interface AiSajuService {
  read(request: ExactAiSajuServiceRequest): Promise<ExactAiSajuServiceResult>;
  read(request: PossibilityAiSajuServiceRequest): Promise<PossibilityAiSajuServiceResult>;
  read(
    request: AiSajuServiceRequest,
  ): Promise<ExactAiSajuServiceResult | PossibilityAiSajuServiceResult>;
}

export interface AiSajuComparisonPackReading {
  readonly packRef: TraditionPackRef;
  readonly profileRef: TraditionProfileRef;
  readonly interpretation: SajuInterpretationReport;
  readonly reading: AiSajuReadingReport;
}

export interface ExactAiSajuComparisonServiceResult {
  readonly schemaVersion: '1';
  readonly calculationKind: 'exact';
  readonly calculation: SajuReport;
  /** Deterministic, unresolved side-by-side comparison. */
  readonly comparison: ExactSajuSchoolComparisonResult;
  /** One isolated AI narration for each requested Tradition Pack. */
  readonly packReadings: readonly AiSajuComparisonPackReading[];
}

export interface PossibilityAiSajuComparisonServiceResult {
  readonly schemaVersion: '1';
  readonly calculationKind: 'possibilities';
  readonly calculation: SajuPossibilityReport;
  /** Deterministic, unresolved side-by-side comparison. */
  readonly comparison: PossibilitySajuSchoolComparisonResult;
  /** One isolated AI narration for each requested Tradition Pack. */
  readonly packReadings: readonly AiSajuComparisonPackReading[];
}

export type AiSajuComparisonServiceRequest = AiSajuServiceRequest;
export type AiSajuComparisonServiceResult =
  | ExactAiSajuComparisonServiceResult
  | PossibilityAiSajuComparisonServiceResult;

export interface AiSajuComparisonService {
  read(request: ExactAiSajuServiceRequest): Promise<ExactAiSajuComparisonServiceResult>;
  read(request: PossibilityAiSajuServiceRequest): Promise<PossibilityAiSajuComparisonServiceResult>;
  read(request: AiSajuComparisonServiceRequest): Promise<AiSajuComparisonServiceResult>;
}

export interface AiKoreanSajuService extends AiSajuComparisonService {
  readonly preset: KoreanSajuAnalysisPreset;
}

export type AiReadingErrorCode =
  | 'INVALID_REQUEST'
  | 'NARRATOR_FAILURE'
  | 'INVALID_NARRATOR_OUTPUT'
  | 'UNGROUNDED_OUTPUT'
  | 'UNCERTAINTY_VIOLATION';
