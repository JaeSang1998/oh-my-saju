import type { EarthlyBranch, FiveElement, HeavenlyStem } from 'saju-engine';
import type {
  ExplicitDayHourSajuRequest,
  TraditionalSystemNormalizedChronology,
  TraditionalSystemReport,
} from '../shared';

export interface ZiweiProfileSelection {
  readonly id: 'ziwei-quanshu-core';
  readonly version: '1.0.0';
  readonly leapMonthPolicy: 'whole-leap-as-next-month';
  readonly birthYearBoundary: 'lunar-new-year';
}

export interface ZiweiRequest {
  readonly kind: 'ziwei';
  readonly subject: ExplicitDayHourSajuRequest;
  readonly profile: ZiweiProfileSelection;
}

export type ZiweiPalaceName =
  | '명궁'
  | '부모궁'
  | '복덕궁'
  | '전택궁'
  | '관록궁'
  | '교우궁'
  | '천이궁'
  | '질액궁'
  | '재백궁'
  | '자녀궁'
  | '부처궁'
  | '형제궁';

export type ZiweiMainStarName =
  | '紫微'
  | '天機'
  | '太陽'
  | '武曲'
  | '天同'
  | '廉貞'
  | '天府'
  | '太陰'
  | '貪狼'
  | '巨門'
  | '天相'
  | '天梁'
  | '七殺'
  | '破軍';

export interface ZiweiMainStar {
  readonly id: string;
  readonly name: ZiweiMainStarName;
  readonly branch: EarthlyBranch;
  readonly palaceName: ZiweiPalaceName;
}

export interface ZiweiPalace {
  readonly index: number;
  readonly branch: EarthlyBranch;
  readonly stem: HeavenlyStem;
  readonly pillar: string;
  readonly name: ZiweiPalaceName;
  readonly isLifePalace: boolean;
  readonly isBodyPalace: boolean;
  readonly mainStars: readonly ZiweiMainStarName[];
}

export interface ZiweiValue {
  readonly normalizedLunarDate: {
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly isLeapMonth: boolean;
    readonly effectiveMonth: number;
  };
  readonly lunarYearStem: HeavenlyStem;
  readonly lifePalaceBranch: EarthlyBranch;
  readonly bodyPalaceBranch: EarthlyBranch;
  readonly bureau: {
    readonly element: FiveElement;
    readonly number: 2 | 3 | 4 | 5 | 6;
    readonly name: string;
  };
  readonly palaces: readonly ZiweiPalace[];
  readonly mainStars: readonly ZiweiMainStar[];
}

export interface ZiweiTrace {
  readonly normalizedChronology: TraditionalSystemNormalizedChronology;
  readonly hourBranch: EarthlyBranch;
  readonly hourBranchIndex: number;
  readonly effectiveLunarMonth: number;
  readonly lifePalaceIndex: number;
  readonly bodyPalaceIndex: number;
  readonly yinPalaceStartStem: HeavenlyStem;
  readonly lifePalacePillar: {
    readonly stem: HeavenlyStem;
    readonly branch: EarthlyBranch;
    readonly cycleIndex: number;
    readonly nayinElement: FiveElement;
  };
  readonly ziwei: {
    readonly lunarDay: number;
    readonly bureauNumber: 2 | 3 | 4 | 5 | 6;
    readonly adjustment: number;
    readonly quotient: number;
    readonly index: number;
    readonly branch: EarthlyBranch;
  };
  readonly tianfu: {
    readonly index: number;
    readonly branch: EarthlyBranch;
  };
}

export type ZiweiReport = TraditionalSystemReport<ZiweiValue, ZiweiTrace> & {
  readonly kind: 'ziwei';
};

export interface ZiweiStarLocation {
  readonly index: number;
  readonly branch: EarthlyBranch;
  readonly adjustment: number;
  readonly quotient: number;
}
