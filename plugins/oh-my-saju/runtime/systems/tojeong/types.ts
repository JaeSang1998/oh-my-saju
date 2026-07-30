import type {
  EarthlyBranch,
  GregorianBirthDate,
  HeavenlyStem,
  KoreanLunarBirthDate,
  SajuRequest,
} from 'saju-engine';
import type { EngineManifest } from 'saju-engine';
import type { TraditionalSystemReport } from '../shared';

export interface Tojeong144Conventions {
  readonly profileId: 'tojeong-number-144';
  readonly profileVersion: '1.0.0';
  readonly countingAge: 'target-year-minus-normalized-lunar-birth-year-plus-one';
  readonly targetDate: 'same-regular-korean-lunar-month-and-day';
  readonly yearBoundary: 'explicit-target-year';
  readonly monthGanzhi: 'target-lunar-month-number';
}

export interface Tojeong144Request {
  readonly kind: 'tojeong-144';
  /** An exact, auditable saju-engine request used to normalize the birth date. */
  readonly sajuRequest: SajuRequest;
  readonly targetYear: number;
  readonly conventions: Tojeong144Conventions;
}

export interface TojeongGanzhiFact {
  readonly korean: string;
  readonly hanja: string;
  readonly stem: {
    readonly korean: HeavenlyStem;
    readonly hanja: string;
  };
  readonly branch: {
    readonly korean: EarthlyBranch;
    readonly hanja: string;
  };
}

export interface TojeongCalendarFacts {
  readonly inputBirthDate: SajuRequest['birth']['date'];
  readonly normalizedBirthGregorianDate: GregorianBirthDate;
  readonly normalizedBirthLunarDate: KoreanLunarBirthDate;
  readonly targetYear: number;
  readonly countingAgeInTargetYear: number;
  readonly targetLunarDate: KoreanLunarBirthDate;
  readonly targetGregorianDate: GregorianBirthDate;
  readonly targetLunarMonthDays: 29 | 30;
  readonly targetYearGanzhi: TojeongGanzhiFact;
  readonly targetMonthGanzhi: TojeongGanzhiFact;
  readonly targetDayGanzhi: TojeongGanzhiFact;
  readonly koreanLunarDataset: EngineManifest['koreanLunar'];
}

export interface TojeongFormulaTrace {
  readonly tableKind: 'taese' | 'wolgeon' | 'iljin';
  readonly stemNumber: number;
  readonly branchNumber: number;
  readonly ganzhiNumber: number;
  readonly calendarValue: number;
  readonly sum: number;
  readonly divisor: 8 | 6 | 3;
  readonly rawRemainder: number;
  readonly normalizedResidue: number;
}

export interface Tojeong144Trace {
  readonly input: {
    readonly targetYear: number;
    readonly conventions: Tojeong144Conventions;
    readonly birthCivilDateTime: string;
  };
  readonly normalization: {
    readonly inputBirthDate: SajuRequest['birth']['date'];
    readonly gregorianDate: GregorianBirthDate;
    readonly koreanLunarDate: KoreanLunarBirthDate;
  };
  readonly targetDateResolution: {
    readonly lunarMonthDay29Gregorian: GregorianBirthDate;
    readonly lunarMonthDay30Exists: boolean;
    readonly resolvedTargetGregorianDate: GregorianBirthDate;
    readonly targetDayPillarSource: 'saju-engine-civil-midnight-day-pillar';
  };
  readonly ganzhiDerivation: {
    readonly targetYear: {
      readonly targetYear: number;
      readonly cycleIndex: number;
      readonly cycleAnchor: '4-甲子';
    };
    readonly targetMonth: {
      readonly yearStemIndex: number;
      readonly lunarMonth: number;
      readonly stemIndex: number;
      readonly branchIndex: number;
      readonly formula: 'stem=2*(yearStemIndex mod 5)+lunarMonth+1; branch=lunarMonth+1';
    };
    readonly targetDay: {
      readonly cycleIndex: number;
      readonly source: 'saju-engine-civil-midnight-day-pillar';
    };
  };
  readonly numberTable: {
    readonly id: 'tojeong-number-table-yamazato-pp201';
    readonly version: '1.0.0';
    readonly digest: string;
    readonly digestSerialization: 'fixed-korean-cycle-order-v1';
  };
  readonly formulas: {
    readonly upper: TojeongFormulaTrace;
    readonly middle: TojeongFormulaTrace;
    readonly lower: TojeongFormulaTrace;
  };
}

export interface Tojeong144Value {
  readonly upper: number;
  readonly middle: number;
  readonly lower: number;
  readonly code: number;
  readonly calendarFacts: TojeongCalendarFacts;
  readonly numberTableDigest: string;
  readonly interpretations: readonly [];
}

export type Tojeong144Report = TraditionalSystemReport<Tojeong144Value, Tojeong144Trace> & {
  readonly kind: 'tojeong-144';
};
