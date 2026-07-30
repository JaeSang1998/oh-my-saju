/** Contracts owned by the Oh My Saju Tradition Pack runtime. */
import type { EngineManifest } from 'saju-engine';
import type {
  SajuPillarName,
  SajuPossibilityReport,
  SajuPossibilityRequest,
  SajuReport,
  SajuRequest,
} from 'saju-engine';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type InterpretationTopic =
  | 'chart-overview'
  | 'day-master'
  | 'five-elements'
  | 'yin-yang'
  | 'ten-gods'
  | 'relationships'
  | 'void-branches'
  | 'strength'
  | 'pattern'
  | 'useful-god'
  | 'growth-stages'
  | 'luck-cycles'
  | 'symbolic-stars'
  | 'compatibility'
  | 'timing';

export type InterpretationRuleId =
  | 'core.day-master'
  | 'core.pillar-year'
  | 'core.pillar-month'
  | 'core.pillar-day'
  | 'core.pillar-hour'
  | 'core.element-balance'
  | 'core.yin-yang-balance'
  | 'core.ten-gods'
  | 'core.relationships'
  | 'core.growth-stages'
  | 'core.void-branches'
  | 'ziping.month-command'
  | 'ziping.pattern-candidate'
  | 'ditianshui.seasonal-state'
  | 'ditianshui.support-ledger'
  | 'qiongtong.climate-candidates'
  | 'sanming.travel-horse'
  | 'sanming.general-star'
  | 'sanming.canopy'
  | 'sanming.xianchi'
  | 'sanming.robbery'
  | 'sanming.lost-spirit'
  | 'sanming.disaster'
  | 'sanming.six-misfortune'
  | 'sanming.lonely'
  | 'sanming.widow'
  | 'sanming.heavenly-noble'
  | 'sanming.lu'
  | 'sanming.literary-star'
  | 'sanming.blade-after-lu-all-stems'
  | 'sanming.blade-yang-stems-only';

export type ProfileLimitationId =
  | 'synthetic-element-balance-not-strength'
  | 'raw-relationships-no-fortune'
  | 'structural-profile-no-doctrine'
  | 'doctrine-not-scientifically-validated'
  | 'ziping-candidate-not-complete-pattern'
  | 'ditianshui-evidence-no-strength-verdict'
  | 'qiongtong-candidates-no-final-useful-god'
  | 'sanming-symbolic-raw-observation-only';

export interface InterpretationSourceReference {
  readonly id: string;
  readonly kind:
    | 'engine-rule'
    | 'classical-text'
    | 'commentary'
    | 'academic-study'
    | 'modern-convention';
  readonly title: string;
  readonly citation: string;
  readonly url?: string;
  readonly locator?: string;
  readonly textualLayer?:
    | 'base-text'
    | 'commentary'
    | 'editorial'
    | 'modern-analysis'
    | 'not-applicable';
  readonly verification:
    | 'engine-tested'
    | 'scan-verified'
    | 'transcription-reviewed'
    | 'bibliographic-only'
    | 'unverified';
}

/**
 * A serializable, versioned selection of rules.
 *
 * Profiles contain no executable callbacks. The Pack runtime owns and tests the
 * rule implementations named by `enabledRuleIds`; a profile only selects
 * rules, sources, and explicit parameters.
 */
export interface TraditionRuleProfile {
  readonly schemaVersion: '1';
  readonly id: string;
  readonly version: string;
  readonly displayName: string;
  readonly school: string;
  readonly textualLayer:
    | 'cross-school-common'
    | 'base-text'
    | 'commentary'
    | 'reconstruction'
    | 'modern-synthesis';
  /**
   * @deprecated This is the runtime release status only. Use the catalog
   * entry's multi-axis `maturity` and `assurance` records.
   */
  readonly status: 'stable' | 'experimental' | 'deprecated';
  readonly enabledRuleIds: readonly InterpretationRuleId[];
  readonly supportedTopics: readonly InterpretationTopic[];
  readonly references: readonly InterpretationSourceReference[];
  readonly parameters: Readonly<Record<string, JsonValue>>;
  /** Plugin-owned display-message IDs; arbitrary profile prose is not rendered. */
  readonly knownLimitations: readonly ProfileLimitationId[];
}

export interface InterpretationEvidencePointer {
  readonly source: 'calculation-report' | 'derived-from-candidate-pillars';
  readonly candidateId: string;
  /** Dot-separated, stable path in the corresponding candidate/report view. */
  readonly path: string;
}

export interface FindingComparisonCoordinate {
  /** Exact definition; differing definition IDs are never voted or averaged. */
  readonly definitionId: string;
  /** Broad concept used to place compatible and incompatible methods side by side. */
  readonly conceptId: string;
  readonly methodId: string;
  readonly subjectKey: string;
  readonly outcomeKey: string;
}

export interface InterpretationFinding {
  readonly id: string;
  readonly ruleId: InterpretationRuleId;
  readonly profileId: string;
  readonly profileVersion: string;
  readonly topic: InterpretationTopic;
  readonly category: 'structural-observation' | 'traditional-judgment';
  readonly stability: 'stable' | 'candidate-dependent';
  /** Complete eight-character fact or a subtotal over explicitly known pillars. */
  readonly coverage: 'complete' | 'partial';
  readonly omittedPillars: readonly SajuPillarName[];
  readonly statement: string;
  readonly values: Readonly<Record<string, JsonValue>>;
  readonly candidateIds: readonly string[];
  readonly absentCandidateIds: readonly string[];
  readonly evidence: readonly InterpretationEvidencePointer[];
  readonly sourceReferenceIds: readonly string[];
  readonly comparison: FindingComparisonCoordinate;
}

export interface UnavailableInterpretationRule {
  readonly ruleId: InterpretationRuleId;
  readonly reason: 'missing-required-pillar';
  readonly missingPillars: readonly SajuPillarName[];
  readonly candidateIds: readonly string[];
}

export interface SajuInterpretationReport {
  readonly schemaVersion: '2';
  readonly profile: TraditionRuleProfile;
  readonly subject: {
    readonly kind: 'exact' | 'possibilities';
    readonly candidateCount: number;
    readonly hourPillar: 'known' | 'candidate' | 'omitted';
  };
  readonly findings: readonly InterpretationFinding[];
  readonly unavailableRules: readonly UnavailableInterpretationRule[];
  readonly audit: {
    readonly engine: EngineManifest['engine'];
    readonly sourceReportSchemaVersion: string;
    readonly evaluationMethod: 'candidate-set-intersection-v1';
    readonly supportDurationsAreProbabilities: false;
    readonly profileIsolation: 'single-profile-no-implicit-mixing';
  };
}

export interface EvaluateSajuInterpretationOptions {
  readonly profile: TraditionRuleProfile;
}

export interface ExactSajuInterpretationRequest {
  readonly kind: 'exact';
  readonly request: SajuRequest;
}

export interface PossibilitySajuInterpretationRequest {
  readonly kind: 'possibilities';
  readonly request: SajuPossibilityRequest;
}

export type SajuInterpretationCalculationRequest =
  | ExactSajuInterpretationRequest
  | PossibilitySajuInterpretationRequest;

export interface ExactSajuInterpretationResult {
  readonly schemaVersion: '2';
  readonly calculationKind: 'exact';
  readonly calculation: SajuReport;
  readonly interpretation: SajuInterpretationReport;
}

export interface PossibilitySajuInterpretationResult {
  readonly schemaVersion: '2';
  readonly calculationKind: 'possibilities';
  readonly calculation: SajuPossibilityReport;
  readonly interpretation: SajuInterpretationReport;
}

export type SajuInterpretationErrorCode =
  | 'INVALID_PROFILE'
  | 'UNKNOWN_RULE'
  | 'INVALID_REQUEST'
  | 'INVALID_CALCULATION_REPORT'
  | 'INVALID_PROFILE_SET'
  | 'UNKNOWN_PROFILE'
  | 'INCOMPATIBLE_PROFILE_SET';

export interface TraditionPackRef {
  readonly id: string;
  readonly version: string;
}

export interface TraditionProfileRef {
  readonly id: string;
  readonly version: string;
}

/** @deprecated Use TraditionProfileRef. */
export type SchoolProfileRef = TraditionProfileRef;

export interface ProfileAssurance {
  /**
   * @deprecated This is the runtime release status only. Use `maturity.runtime`
   * and the remaining assurance axes independently.
   */
  readonly release: 'stable' | 'experimental' | 'research-only' | 'deprecated';
  readonly sourceFidelity:
    | 'engine-tested'
    | 'edition-located'
    | 'transcription-located'
    | 'bibliographic-only'
    | 'unverified';
  readonly fixtureMaturity: 'exhaustive' | 'source-and-dispute-set' | 'basic' | 'none';
  readonly expertReview: 'independently-reproduced' | 'single-reviewed' | 'not-reviewed';
  readonly predictiveValidity: 'not-established';
}

/**
 * Machine-readable completion boundary for one installed Tradition Pack.
 * A stable runtime and a complete declared output do not imply that the
 * whole doctrine, a final traditional verdict, or real-world prediction has
 * been established.
 */
export interface TraditionPackMaturity {
  readonly runtime: 'stable' | 'deprecated';
  readonly implementation: 'complete-for-declared-output';
  readonly doctrineCoverage: 'not-applicable' | 'partial' | 'edition-complete';
  readonly outputBoundary: 'chart-observation' | 'traditional-candidates' | 'traditional-evidence';
  readonly sourceCoverage: {
    readonly status: 'complete' | 'partial';
    readonly verifiedUnits: number;
    readonly totalUnits: number;
    readonly unit: 'rules' | 'cells';
  };
  readonly implementedCapabilityIds: readonly string[];
  readonly unresolvedCapabilityIds: readonly string[];
}

export interface AdoptionEvidence {
  readonly status: 'measured' | 'documented' | 'unknown';
  readonly market: 'ko-KR';
  readonly asOf: string;
  readonly sourceReferenceIds: readonly string[];
  readonly note:
    | 'foundational-calculation'
    | 'canonical-academic-reference'
    | 'method-documented-no-market-share'
    | 'no-quantitative-market-survey';
}

export interface TraditionPackContract {
  readonly schemaVersion: '1';
  readonly ruleIds: readonly InterpretationRuleId[];
  readonly sourceReferenceIds: readonly string[];
  readonly requiredPillarsByRule: Readonly<
    Partial<Record<InterpretationRuleId, readonly SajuPillarName[]>>
  >;
  /** Pillars inspected when present even though their absence does not suppress the rule. */
  readonly observedPillarsByRule: Readonly<
    Partial<Record<InterpretationRuleId, readonly SajuPillarName[]>>
  >;
  readonly missingInputBehavior: 'return-unavailable-rule';
  readonly fixtureSetIds: readonly string[];
  readonly reproducibility: {
    /**
     * Immutable knowledge-provider snapshot selected by this Pack release.
     * Future ontology and graph providers use the same version/digest/provenance
     * binding without changing the calculation core.
     */
    readonly knowledgeSnapshot: {
      readonly providerContract: 'tradition-knowledge-provider-v1';
      readonly adapter: 'static-files' | 'ontology-snapshot' | 'knowledge-graph-snapshot';
      readonly kind: 'static-file-snapshot' | 'ontology-snapshot' | 'knowledge-graph-snapshot';
      readonly version: string;
      readonly immutability: 'content-addressed';
      readonly algorithm: 'sha256';
      readonly canonicalization: 'ordered-file-bytes-with-path-v1';
      readonly digest: string;
      readonly provenanceContract: 'tradition-provenance-v1';
      readonly queryContract:
        | 'static-resource-query-v1'
        | 'ontology-query-v1'
        | 'knowledge-graph-query-v1';
      readonly paths: readonly string[];
    };
    readonly editionLocks: readonly {
      readonly sourceReferenceId: string;
      readonly catalogUrl: string | null;
      readonly scanUrl: string | null;
      readonly publication: string;
      readonly contentSha256: string | null;
      readonly status: 'verified' | 'checksum-pending';
    }[];
    readonly ruleTraces: readonly {
      readonly ruleId: InterpretationRuleId;
      readonly sourceReferenceIds: readonly string[];
      readonly sourceLocators: readonly string[];
      readonly formalizationStatus: 'literal-table' | 'formalized-prose' | 'reconstruction';
      readonly transcriptionSha256: string | null;
      readonly reviewerIds: readonly string[];
    }[];
    readonly rulesArtifact: {
      readonly algorithm: 'sha256';
      readonly canonicalization: 'ordered-file-bytes-with-path-v1';
      readonly paths: readonly string[];
      readonly digest: string;
      readonly retrieval: {
        readonly packageUrl: string;
        readonly representation: 'plugin-files';
      };
    };
    readonly fixturesArtifact: {
      readonly algorithm: 'sha256';
      readonly canonicalization: 'ordered-file-bytes-with-path-v1';
      readonly paths: readonly string[];
      readonly digest: string;
      readonly retrieval: {
        readonly packageUrl: string;
        readonly representation: 'plugin-fixtures';
      };
    };
  };
  readonly aiPromptTemplate: {
    readonly id: 'saju-grounded-narration';
    readonly version: '2.0.0';
    readonly findingsFromOnePackOnly: true;
  } | null;
}

/** Pack-local declaration consumed by the plugin's built-in registry. */
export type TraditionPackProvenance = Pick<TraditionPackContract, 'fixtureSetIds'> &
  TraditionPackContract['reproducibility'] & {
    readonly ruleIds: readonly InterpretationRuleId[];
  };

export interface TraditionPackCatalogEntry {
  readonly packRef: TraditionPackRef;
  readonly profileRef: TraditionProfileRef;
  readonly displayName: string;
  readonly kind: 'cross-school-baseline' | 'classical-doctrine' | 'modern-doctrine';
  readonly productPriority: number;
  readonly lineage: {
    readonly work: string;
    readonly attributedAuthor?: string;
    readonly commentator?: string;
    readonly textualLayer:
      | 'cross-school-common'
      | 'base-text'
      | 'commentary'
      | 'reconstruction'
      | 'modern-synthesis';
  };
  readonly supportedTopics: readonly InterpretationTopic[];
  readonly execution: {
    readonly deterministicGrounding: true;
    readonly aiSynthesis: 'not-used' | 'optional';
    readonly crossPackRawFindingMixing: 'forbidden';
  };
  readonly maturity: TraditionPackMaturity;
  readonly contract: TraditionPackContract;
  readonly assurance: ProfileAssurance;
  readonly adoption: AdoptionEvidence;
}

/** @deprecated Use TraditionPackCatalogEntry. */
export type SchoolProfileCatalogEntry = TraditionPackCatalogEntry;

export interface CalculateSajuSchoolComparisonOptions {
  readonly packRefs: readonly TraditionPackRef[];
}

export interface TraditionPackResult {
  readonly packRef: TraditionPackRef;
  readonly profileRef: TraditionProfileRef;
  readonly interpretation: SajuInterpretationReport;
}

/** @deprecated Use TraditionPackResult. */
export type SchoolProfileResult = TraditionPackResult;

export type SchoolComparisonStatus =
  | 'unanimous-agreement'
  | 'partial-agreement'
  | 'disagreement'
  | 'semantic-mismatch'
  | 'insufficient-evidence';

export interface SchoolComparisonRow {
  readonly id: string;
  readonly conceptId: string;
  readonly topic: InterpretationTopic;
  readonly status: SchoolComparisonStatus;
  readonly stability: 'stable' | 'candidate-dependent' | 'unavailable';
  readonly definitionIds: readonly string[];
  readonly profiles: readonly {
    readonly packRef: TraditionPackRef;
    readonly profileRef: TraditionProfileRef;
    readonly findingIds: readonly string[];
    readonly outcomeKeys: readonly string[];
    readonly unavailableRuleIds: readonly InterpretationRuleId[];
  }[];
  readonly resolution: 'reported-unresolved';
}

export interface SajuSchoolComparison {
  readonly schemaVersion: '1';
  readonly rows: readonly SchoolComparisonRow[];
  readonly resolution: 'reported-unresolved';
  readonly majorityVoteApplied: false;
  readonly winnerSelected: false;
  readonly supportDurationsAreProbabilities: false;
}

export interface ExactSajuSchoolComparisonResult {
  readonly schemaVersion: '1';
  readonly calculationKind: 'exact';
  readonly calculation: SajuReport;
  readonly packResults: readonly TraditionPackResult[];
  readonly comparison: SajuSchoolComparison;
}

export interface PossibilitySajuSchoolComparisonResult {
  readonly schemaVersion: '1';
  readonly calculationKind: 'possibilities';
  readonly calculation: SajuPossibilityReport;
  readonly packResults: readonly TraditionPackResult[];
  readonly comparison: SajuSchoolComparison;
}

export type KoreanSajuUnsupportedOutput =
  | 'final-pattern'
  | 'final-strength'
  | 'final-useful-god'
  | 'luck-cycles'
  | 'symbolic-stars'
  | 'personality'
  | 'compatibility'
  | 'event-prediction';

/**
 * Package-owned Korean service preset. The baseline is always separated from
 * doctrine results, and every unresolved output is explicit.
 */
export interface KoreanSajuAnalysisPreset {
  readonly schemaVersion: '1';
  readonly id: 'ko-KR-default-v1';
  readonly baselinePackRef: TraditionPackRef;
  readonly traditionPackRefs: readonly TraditionPackRef[];
  readonly packMaturities: readonly {
    readonly packRef: TraditionPackRef;
    readonly maturity: TraditionPackMaturity;
  }[];
  /**
   * Conclusions that the deterministic layer does not manufacture. An AI
   * interpretation may reason about them while citing the selected Pack
   * findings and keeping its inference distinct from chart facts.
   */
  readonly unsupportedDeterministicOutputs: readonly KoreanSajuUnsupportedOutput[];
  readonly predictiveValidity: 'not-established';
}

export interface ExactKoreanSajuAnalysisResult {
  readonly schemaVersion: '1';
  readonly calculationKind: 'exact';
  readonly calculation: SajuReport;
  readonly preset: KoreanSajuAnalysisPreset;
  readonly baseline: TraditionPackResult;
  readonly doctrines: readonly TraditionPackResult[];
  readonly comparison: SajuSchoolComparison;
}

export interface PossibilityKoreanSajuAnalysisResult {
  readonly schemaVersion: '1';
  readonly calculationKind: 'possibilities';
  readonly calculation: SajuPossibilityReport;
  readonly preset: KoreanSajuAnalysisPreset;
  readonly baseline: TraditionPackResult;
  readonly doctrines: readonly TraditionPackResult[];
  readonly comparison: SajuSchoolComparison;
}
