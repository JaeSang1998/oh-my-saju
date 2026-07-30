import type {
  EarthlyBranch,
  FiveElement,
  FourPillars,
  HeavenlyStem,
  TenGod,
  YinYang,
} from 'saju-engine';

export const HEAVENLY_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;

export const EARTHLY_BRANCHES = [
  '자',
  '축',
  '인',
  '묘',
  '진',
  '사',
  '오',
  '미',
  '신',
  '유',
  '술',
  '해',
] as const;

export const FIVE_ELEMENTS = ['목', '화', '토', '금', '수'] as const;

export const BRANCH_MAIN_STEM: Readonly<Record<EarthlyBranch, HeavenlyStem>> = {
  자: '계',
  축: '기',
  인: '갑',
  묘: '을',
  진: '무',
  사: '병',
  오: '정',
  미: '기',
  신: '경',
  유: '신',
  술: '무',
  해: '임',
};

export const ELEMENT_GENERATES: Readonly<Record<FiveElement, FiveElement>> = {
  목: '화',
  화: '토',
  토: '금',
  금: '수',
  수: '목',
};

export const ELEMENT_CONTROLS: Readonly<Record<FiveElement, FiveElement>> = {
  목: '토',
  토: '수',
  수: '화',
  화: '금',
  금: '목',
};

const STEM_ELEMENTS: Readonly<Record<HeavenlyStem, FiveElement>> = {
  갑: '목',
  을: '목',
  병: '화',
  정: '화',
  무: '토',
  기: '토',
  경: '금',
  신: '금',
  임: '수',
  계: '수',
};

const STEM_YIN_YANG: Readonly<Record<HeavenlyStem, YinYang>> = {
  갑: '양',
  을: '음',
  병: '양',
  정: '음',
  무: '양',
  기: '음',
  경: '양',
  신: '음',
  임: '양',
  계: '음',
};

export interface WeightedHiddenStem {
  readonly stem: HeavenlyStem;
  readonly weight: number;
}

export const HIDDEN_STEMS: Readonly<Record<EarthlyBranch, readonly WeightedHiddenStem[]>> = {
  자: [{ stem: '계', weight: 1 }],
  축: [
    { stem: '기', weight: 0.6 },
    { stem: '계', weight: 0.3 },
    { stem: '신', weight: 0.1 },
  ],
  인: [
    { stem: '갑', weight: 0.6 },
    { stem: '병', weight: 0.3 },
    { stem: '무', weight: 0.1 },
  ],
  묘: [{ stem: '을', weight: 1 }],
  진: [
    { stem: '무', weight: 0.6 },
    { stem: '을', weight: 0.3 },
    { stem: '계', weight: 0.1 },
  ],
  사: [
    { stem: '병', weight: 0.6 },
    { stem: '무', weight: 0.3 },
    { stem: '경', weight: 0.1 },
  ],
  오: [
    { stem: '정', weight: 0.7 },
    { stem: '기', weight: 0.3 },
  ],
  미: [
    { stem: '기', weight: 0.6 },
    { stem: '정', weight: 0.3 },
    { stem: '을', weight: 0.1 },
  ],
  신: [
    { stem: '경', weight: 0.6 },
    { stem: '임', weight: 0.3 },
    { stem: '무', weight: 0.1 },
  ],
  유: [{ stem: '신', weight: 1 }],
  술: [
    { stem: '무', weight: 0.6 },
    { stem: '신', weight: 0.3 },
    { stem: '정', weight: 0.1 },
  ],
  해: [
    { stem: '임', weight: 0.7 },
    { stem: '갑', weight: 0.3 },
  ],
};

export function assertHeavenlyStem(value: unknown, name = '천간'): asserts value is HeavenlyStem {
  if (typeof value !== 'string' || !(HEAVENLY_STEMS as readonly string[]).includes(value)) {
    throw new RangeError(`${name}은 유효한 천간이어야 합니다: ${String(value)}`);
  }
}

export function assertEarthlyBranch(value: unknown, name = '지지'): asserts value is EarthlyBranch {
  if (typeof value !== 'string' || !(EARTHLY_BRANCHES as readonly string[]).includes(value)) {
    throw new RangeError(`${name}은 유효한 지지여야 합니다: ${String(value)}`);
  }
}

export function getHeavenlyStemElement(stem: HeavenlyStem): FiveElement {
  return STEM_ELEMENTS[stem];
}

export function getHeavenlyStemYinYang(stem: HeavenlyStem): YinYang {
  return STEM_YIN_YANG[stem];
}

export function getTenGod(dayMaster: HeavenlyStem, target: HeavenlyStem): TenGod {
  const dayElement = getHeavenlyStemElement(dayMaster);
  const targetElement = getHeavenlyStemElement(target);
  const sameYinYang = getHeavenlyStemYinYang(dayMaster) === getHeavenlyStemYinYang(target);

  if (targetElement === dayElement) return sameYinYang ? '비견' : '겁재';
  if (ELEMENT_GENERATES[dayElement] === targetElement) return sameYinYang ? '식신' : '상관';
  if (ELEMENT_CONTROLS[dayElement] === targetElement) return sameYinYang ? '편재' : '정재';
  if (ELEMENT_CONTROLS[targetElement] === dayElement) return sameYinYang ? '편관' : '정관';
  return sameYinYang ? '편인' : '정인';
}

export function getBranchTenGod(dayMaster: HeavenlyStem, branch: EarthlyBranch): TenGod {
  return getTenGod(dayMaster, BRANCH_MAIN_STEM[branch]);
}

export function getTenGodChart(pillars: FourPillars): {
  readonly year: { readonly stem: TenGod; readonly branch: TenGod };
  readonly month: { readonly stem: TenGod; readonly branch: TenGod };
  readonly day: { readonly stem: '일간'; readonly branch: TenGod };
  readonly hour: { readonly stem: TenGod; readonly branch: TenGod };
} {
  const dayMaster = pillars.day.heavenlyStem;
  return {
    year: {
      stem: getTenGod(dayMaster, pillars.year.heavenlyStem),
      branch: getBranchTenGod(dayMaster, pillars.year.earthlyBranch),
    },
    month: {
      stem: getTenGod(dayMaster, pillars.month.heavenlyStem),
      branch: getBranchTenGod(dayMaster, pillars.month.earthlyBranch),
    },
    day: {
      stem: '일간',
      branch: getBranchTenGod(dayMaster, pillars.day.earthlyBranch),
    },
    hour: {
      stem: getTenGod(dayMaster, pillars.hour.heavenlyStem),
      branch: getBranchTenGod(dayMaster, pillars.hour.earthlyBranch),
    },
  };
}

export function getVoidBranches(
  dayStem: HeavenlyStem,
  dayBranch: EarthlyBranch,
): readonly EarthlyBranch[] {
  const stemIndex = HEAVENLY_STEMS.indexOf(dayStem);
  const branchIndex = EARTHLY_BRANCHES.indexOf(dayBranch);
  const cycleIndex = Array.from({ length: 60 }, (_, index) => index).find(
    (index) => index % 10 === stemIndex && index % 12 === branchIndex,
  );
  if (cycleIndex === undefined) throw new RangeError('유효하지 않은 일주 조합입니다.');
  const xunStartBranch = (cycleIndex - (cycleIndex % 10)) % 12;
  return [
    EARTHLY_BRANCHES[(xunStartBranch + 10) % 12]!,
    EARTHLY_BRANCHES[(xunStartBranch + 11) % 12]!,
  ];
}
