import type { EarthlyBranch, FiveElement, HeavenlyStem, YinYang } from 'saju-engine';
import type {
  ExplicitDayHourSajuRequest,
  TraditionalSystemNormalizedChronology,
  TraditionalSystemReport,
} from '../shared';

export interface LiurenProfileSelection {
  readonly id: 'liuren-quanshu-nine-gates';
  readonly version: '1.0.0';
  readonly monthGeneralBoundary: 'middle-qi-instant-inclusive';
  readonly shehaiTieBreak: 'depth-then-season-position-then-day-side';
}

export interface LiurenRequest {
  readonly kind: 'liuren';
  readonly subject: ExplicitDayHourSajuRequest;
  readonly profile: LiurenProfileSelection;
}

export interface LiurenCoreInput {
  readonly dayStem: HeavenlyStem;
  readonly dayBranch: EarthlyBranch;
  readonly hourBranch: EarthlyBranch;
  readonly monthGeneral: EarthlyBranch;
}

export interface LiurenPlateEntry {
  readonly earth: EarthlyBranch;
  readonly heaven: EarthlyBranch;
}

export interface LiurenLesson {
  readonly index: 1 | 2 | 3 | 4;
  readonly lowerKind: 'stem' | 'branch';
  readonly lower: HeavenlyStem | EarthlyBranch;
  readonly upper: EarthlyBranch;
  readonly lowerElement: FiveElement;
  readonly upperElement: FiveElement;
}

export interface LiurenControlCandidate {
  readonly lessonIndex: 1 | 2 | 3 | 4;
  readonly upper: EarthlyBranch;
  readonly direction: 'lower-controls-upper' | 'upper-controls-lower';
  readonly yinYang: YinYang;
  readonly side: 'day-stem' | 'day-branch';
  readonly riddenEarth: EarthlyBranch;
}

export interface LiurenShehaiCandidate extends LiurenControlCandidate {
  readonly depth: number;
  readonly traversedBranches: readonly EarthlyBranch[];
  readonly controllingNodes: readonly string[];
  readonly seasonPosition: 'meng' | 'zhong' | 'ji';
}

export type LiurenRuleName =
  | '伏吟'
  | '返吟'
  | '賊克'
  | '下賊上'
  | '上克下'
  | '比用'
  | '涉害'
  | '遙克'
  | '蒿矢'
  | '彈射'
  | '井欄'
  | '昴星'
  | '別責'
  | '八專'
  | '不備歸一';

export interface LiurenCoreResult {
  readonly earthPlate: readonly EarthlyBranch[];
  readonly heavenPlate: readonly LiurenPlateEntry[];
  readonly fourLessons: readonly LiurenLesson[];
  readonly directControlCandidates: readonly LiurenControlCandidate[];
  readonly parityCandidates: readonly LiurenControlCandidate[];
  readonly remoteControlCandidates: readonly LiurenControlCandidate[];
  readonly shehaiCandidates: readonly LiurenShehaiCandidate[];
  readonly rulePath: readonly LiurenRuleName[];
  readonly threeTransmissions: readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch];
}

export interface LiurenMonthGeneralEvidence {
  readonly branch: EarthlyBranch;
  readonly middleQi: {
    readonly year: number;
    readonly index: number;
    readonly name: string;
    readonly hanja: string;
    readonly instantUtc: string;
    readonly epochMilliseconds: number;
    readonly uncertaintyMilliseconds: number;
  };
}

export interface LiurenValue extends LiurenCoreResult {
  readonly dayPillar: string;
  readonly hourBranch: EarthlyBranch;
  readonly monthGeneral: EarthlyBranch;
}

export interface LiurenTrace {
  readonly normalizedChronology: TraditionalSystemNormalizedChronology;
  readonly input: LiurenCoreInput;
  readonly monthGeneralEvidence: LiurenMonthGeneralEvidence;
  readonly selection: {
    readonly directControlCandidates: readonly LiurenControlCandidate[];
    readonly parityCandidates: readonly LiurenControlCandidate[];
    readonly remoteControlCandidates: readonly LiurenControlCandidate[];
    readonly shehaiCandidates: readonly LiurenShehaiCandidate[];
    readonly rulePath: readonly LiurenRuleName[];
  };
}

export type LiurenReport = TraditionalSystemReport<LiurenValue, LiurenTrace> & {
  readonly kind: 'liuren';
};
