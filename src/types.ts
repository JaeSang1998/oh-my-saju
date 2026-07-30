export type HeavenlyStem = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계';
export type EarthlyBranch =
  | '자'
  | '축'
  | '인'
  | '묘'
  | '진'
  | '사'
  | '오'
  | '미'
  | '신'
  | '유'
  | '술'
  | '해';
export type YinYang = '양' | '음';
export type FiveElement = '목' | '화' | '토' | '금' | '수';
export type TenGod =
  | '비견'
  | '겁재'
  | '식신'
  | '상관'
  | '편재'
  | '정재'
  | '편관'
  | '정관'
  | '편인'
  | '정인';
export type Gender = 'male' | 'female';

export interface Pillar {
  heavenlyStem: HeavenlyStem;
  earthlyBranch: EarthlyBranch;
}

export interface FourPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
}

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
}

export interface SolarDate {
  year: number;
  month: number;
  day: number;
}

export interface LunarMonthVariantInfo {
  isLeapMonth: boolean;
  dayCount: 29 | 30;
  firstSolarDate: SolarDate;
  lastSolarDate: SolarDate;
}

export interface LunarMonthInfo {
  year: number;
  month: number;
  regular: LunarMonthVariantInfo;
  leap: LunarMonthVariantInfo | null;
}

export interface LuckPillar {
  age: number;
  pillar: Pillar;
  korean: string;
}

export interface LuckPillarInfo {
  forward: boolean;
  startAge: number;
  startYears: number;
  startMonths: number;
  startDays: number;
  pillars: LuckPillar[];
}
