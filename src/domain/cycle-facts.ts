import type {
  EarthlyBranch,
  FiveElement,
  FourPillars,
  HeavenlyStem,
  Pillar,
  TenGod,
  YinYang,
} from '../types';

interface StemRecord {
  readonly korean: HeavenlyStem;
  readonly hanja: string;
  readonly element: FiveElement;
  readonly yinYang: YinYang;
}

interface BranchRecord {
  readonly korean: EarthlyBranch;
  readonly hanja: string;
  readonly element: FiveElement;
  readonly yinYang: YinYang;
  readonly mainStem: HeavenlyStem;
}

const STEM_CATALOG: readonly StemRecord[] = [
  { korean: '갑', hanja: '甲', element: '목', yinYang: '양' },
  { korean: '을', hanja: '乙', element: '목', yinYang: '음' },
  { korean: '병', hanja: '丙', element: '화', yinYang: '양' },
  { korean: '정', hanja: '丁', element: '화', yinYang: '음' },
  { korean: '무', hanja: '戊', element: '토', yinYang: '양' },
  { korean: '기', hanja: '己', element: '토', yinYang: '음' },
  { korean: '경', hanja: '庚', element: '금', yinYang: '양' },
  { korean: '신', hanja: '辛', element: '금', yinYang: '음' },
  { korean: '임', hanja: '壬', element: '수', yinYang: '양' },
  { korean: '계', hanja: '癸', element: '수', yinYang: '음' },
];

const BRANCH_CATALOG: readonly BranchRecord[] = [
  { korean: '자', hanja: '子', element: '수', yinYang: '양', mainStem: '계' },
  { korean: '축', hanja: '丑', element: '토', yinYang: '음', mainStem: '기' },
  { korean: '인', hanja: '寅', element: '목', yinYang: '양', mainStem: '갑' },
  { korean: '묘', hanja: '卯', element: '목', yinYang: '음', mainStem: '을' },
  { korean: '진', hanja: '辰', element: '토', yinYang: '양', mainStem: '무' },
  { korean: '사', hanja: '巳', element: '화', yinYang: '음', mainStem: '병' },
  { korean: '오', hanja: '午', element: '화', yinYang: '양', mainStem: '정' },
  { korean: '미', hanja: '未', element: '토', yinYang: '음', mainStem: '기' },
  { korean: '신', hanja: '申', element: '금', yinYang: '양', mainStem: '경' },
  { korean: '유', hanja: '酉', element: '금', yinYang: '음', mainStem: '신' },
  { korean: '술', hanja: '戌', element: '토', yinYang: '양', mainStem: '무' },
  { korean: '해', hanja: '亥', element: '수', yinYang: '음', mainStem: '임' },
];

export const FIVE_ELEMENTS = Object.freeze(['목', '화', '토', '금', '수'] as const);
export const YIN_YANG = Object.freeze(['양', '음'] as const);
export const HEAVENLY_STEMS: readonly HeavenlyStem[] = Object.freeze(
  STEM_CATALOG.map(({ korean }) => korean),
);
export const HEAVENLY_STEMS_HANJA: readonly string[] = Object.freeze(
  STEM_CATALOG.map(({ hanja }) => hanja),
);
export const EARTHLY_BRANCHES: readonly EarthlyBranch[] = Object.freeze(
  BRANCH_CATALOG.map(({ korean }) => korean),
);
export const EARTHLY_BRANCHES_HANJA: readonly string[] = Object.freeze(
  BRANCH_CATALOG.map(({ hanja }) => hanja),
);
export const STEM_ELEMENTS: readonly FiveElement[] = Object.freeze(
  STEM_CATALOG.map(({ element }) => element),
);
export const BRANCH_ELEMENTS: readonly FiveElement[] = Object.freeze(
  BRANCH_CATALOG.map(({ element }) => element),
);

const STEM_BY_NAME = new Map(STEM_CATALOG.map((record) => [record.korean, record]));
const BRANCH_BY_NAME = new Map(BRANCH_CATALOG.map((record) => [record.korean, record]));

export const BRANCH_MAIN_STEM = Object.freeze(
  Object.fromEntries(BRANCH_CATALOG.map(({ korean, mainStem }) => [korean, mainStem])),
) as Readonly<Record<EarthlyBranch, HeavenlyStem>>;

export const MONTH_BRANCHES = Object.freeze(
  Object.fromEntries(
    Array.from({ length: 12 }, (_, offset) => {
      const monthNumber = offset + 1;
      return [monthNumber, EARTHLY_BRANCHES[(monthNumber + 1) % EARTHLY_BRANCHES.length]!];
    }),
  ),
) as Readonly<Record<number, EarthlyBranch>>;

function elementCycle(step: number): Readonly<Record<FiveElement, FiveElement>> {
  return Object.freeze(
    Object.fromEntries(
      FIVE_ELEMENTS.map((element, index) => [
        element,
        FIVE_ELEMENTS[euclideanModulo(index + step, FIVE_ELEMENTS.length)]!,
      ]),
    ),
  ) as Readonly<Record<FiveElement, FiveElement>>;
}

export const ELEMENT_GENERATES = elementCycle(1);
export const ELEMENT_CONTROLS = elementCycle(2);

const TEN_GOD_HANJA_PAIRS = [
  ['비견', '比肩'],
  ['겁재', '劫財'],
  ['식신', '食神'],
  ['상관', '傷官'],
  ['편재', '偏財'],
  ['정재', '正財'],
  ['편관', '偏官'],
  ['정관', '正官'],
  ['편인', '偏印'],
  ['정인', '正印'],
] as const satisfies readonly (readonly [TenGod, string])[];

export const TEN_GOD_HANJA = Object.freeze(Object.fromEntries(TEN_GOD_HANJA_PAIRS)) as Readonly<
  Record<TenGod, string>
>;

const TEN_GOD_BY_ELEMENT_DISTANCE = [
  ['비견', '겁재'],
  ['식신', '상관'],
  ['편재', '정재'],
  ['편관', '정관'],
  ['편인', '정인'],
] as const satisfies readonly (readonly [TenGod, TenGod])[];

const CYCLE_PILLARS: readonly Pillar[] = Object.freeze(
  Array.from({ length: 60 }, (_, index) =>
    Object.freeze({
      heavenlyStem: HEAVENLY_STEMS[index % HEAVENLY_STEMS.length]!,
      earthlyBranch: EARTHLY_BRANCHES[index % EARTHLY_BRANCHES.length]!,
    }),
  ),
);

const CYCLE_INDEX_BY_PAIR = new Map(
  CYCLE_PILLARS.map((pillar, index) => [
    `${HEAVENLY_STEMS.indexOf(pillar.heavenlyStem)}:${EARTHLY_BRANCHES.indexOf(pillar.earthlyBranch)}`,
    index,
  ]),
);

export interface PillarDescriptor {
  readonly cycleIndex: number;
  readonly korean: string;
  readonly hanja: string;
  readonly stem: {
    readonly index: number;
    readonly korean: HeavenlyStem;
    readonly hanja: string;
    readonly element: FiveElement;
    readonly yinYang: YinYang;
  };
  readonly branch: {
    readonly index: number;
    readonly korean: EarthlyBranch;
    readonly hanja: string;
    readonly element: FiveElement;
    readonly yinYang: YinYang;
  };
}

export interface TenGodChart {
  readonly year: { readonly stem: TenGod; readonly branch: TenGod };
  readonly month: { readonly stem: TenGod; readonly branch: TenGod };
  readonly day: { readonly stem: '일간'; readonly branch: TenGod };
  readonly hour: { readonly stem: TenGod; readonly branch: TenGod };
}

export function euclideanModulo(value: number, modulus: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(modulus) || modulus <= 0) {
    throw new RangeError(
      'Euclidean modulo requires a finite value and a positive integer modulus.',
    );
  }
  const remainder = value % modulus;
  return remainder < 0 ? remainder + modulus : remainder;
}

function assertIndex(value: number, size: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value >= size) {
    throw new RangeError(`${label} must be an integer from 0 through ${size - 1}.`);
  }
}

export function assertHeavenlyStem(
  value: unknown,
  label = 'heavenly stem',
): asserts value is HeavenlyStem {
  if (typeof value !== 'string' || !STEM_BY_NAME.has(value as HeavenlyStem)) {
    throw new RangeError(`${label} is not a canonical heavenly stem: ${String(value)}`);
  }
}

export function assertEarthlyBranch(
  value: unknown,
  label = 'earthly branch',
): asserts value is EarthlyBranch {
  if (typeof value !== 'string' || !BRANCH_BY_NAME.has(value as EarthlyBranch)) {
    throw new RangeError(`${label} is not a canonical earthly branch: ${String(value)}`);
  }
}

export function assertPillar(value: unknown, label = 'pillar'): asserts value is Pillar {
  if (value === null || typeof value !== 'object') {
    throw new TypeError(`${label} must be an object.`);
  }
  const candidate = value as Partial<Pillar>;
  assertHeavenlyStem(candidate.heavenlyStem, `${label}.heavenlyStem`);
  assertEarthlyBranch(candidate.earthlyBranch, `${label}.earthlyBranch`);
  cycleIndexFromPair(
    HEAVENLY_STEMS.indexOf(candidate.heavenlyStem),
    EARTHLY_BRANCHES.indexOf(candidate.earthlyBranch),
  );
}

export function cycleIndexFromPair(stemIndex: number, branchIndex: number): number {
  assertIndex(stemIndex, HEAVENLY_STEMS.length, 'Stem index');
  assertIndex(branchIndex, EARTHLY_BRANCHES.length, 'Branch index');
  const cycleIndex = CYCLE_INDEX_BY_PAIR.get(`${stemIndex}:${branchIndex}`);
  if (cycleIndex === undefined) {
    throw new RangeError('The requested stem and branch do not form a sexagenary-cycle pair.');
  }
  return cycleIndex;
}

export function pillarAtCycleIndex(cycleIndex: number): Pillar {
  assertIndex(cycleIndex, CYCLE_PILLARS.length, 'Cycle index');
  const pillar = CYCLE_PILLARS[cycleIndex]!;
  return {
    heavenlyStem: pillar.heavenlyStem,
    earthlyBranch: pillar.earthlyBranch,
  };
}

export function describePillar(pillar: Pillar): PillarDescriptor {
  assertPillar(pillar);
  const stemIndex = HEAVENLY_STEMS.indexOf(pillar.heavenlyStem);
  const branchIndex = EARTHLY_BRANCHES.indexOf(pillar.earthlyBranch);
  const stem = STEM_CATALOG[stemIndex]!;
  const branch = BRANCH_CATALOG[branchIndex]!;
  return {
    cycleIndex: cycleIndexFromPair(stemIndex, branchIndex),
    korean: `${stem.korean}${branch.korean}`,
    hanja: `${stem.hanja}${branch.hanja}`,
    stem: { index: stemIndex, ...stem },
    branch: {
      index: branchIndex,
      korean: branch.korean,
      hanja: branch.hanja,
      element: branch.element,
      yinYang: branch.yinYang,
    },
  };
}

export function getHeavenlyStemElement(stem: HeavenlyStem): FiveElement {
  assertHeavenlyStem(stem);
  return STEM_BY_NAME.get(stem)!.element;
}

export function getHeavenlyStemYinYang(stem: HeavenlyStem): YinYang {
  assertHeavenlyStem(stem);
  return STEM_BY_NAME.get(stem)!.yinYang;
}

export function getEarthlyBranchElement(branch: EarthlyBranch): FiveElement {
  assertEarthlyBranch(branch);
  return BRANCH_BY_NAME.get(branch)!.element;
}

export function getEarthlyBranchYinYang(branch: EarthlyBranch): YinYang {
  assertEarthlyBranch(branch);
  return BRANCH_BY_NAME.get(branch)!.yinYang;
}

export function getTenGod(dayMaster: HeavenlyStem, target: HeavenlyStem): TenGod {
  assertHeavenlyStem(dayMaster, 'day master');
  assertHeavenlyStem(target, 'target stem');
  const day = STEM_BY_NAME.get(dayMaster)!;
  const other = STEM_BY_NAME.get(target)!;
  const dayElementIndex = FIVE_ELEMENTS.indexOf(day.element);
  const targetElementIndex = FIVE_ELEMENTS.indexOf(other.element);
  const distance = euclideanModulo(targetElementIndex - dayElementIndex, FIVE_ELEMENTS.length);
  return TEN_GOD_BY_ELEMENT_DISTANCE[distance]![day.yinYang === other.yinYang ? 0 : 1];
}

export function getBranchTenGod(dayMaster: HeavenlyStem, branch: EarthlyBranch): TenGod {
  assertEarthlyBranch(branch);
  return getTenGod(dayMaster, BRANCH_BY_NAME.get(branch)!.mainStem);
}

export function getTenGodChart(pillars: FourPillars): TenGodChart {
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

export function getVoidBranches(dayStem: HeavenlyStem, dayBranch: EarthlyBranch): EarthlyBranch[] {
  assertHeavenlyStem(dayStem, 'day stem');
  assertEarthlyBranch(dayBranch, 'day branch');
  const cycleIndex = cycleIndexFromPair(
    HEAVENLY_STEMS.indexOf(dayStem),
    EARTHLY_BRANCHES.indexOf(dayBranch),
  );
  const decadeStartBranch = (Math.floor(cycleIndex / 10) * 10) % EARTHLY_BRANCHES.length;
  return [
    EARTHLY_BRANCHES[(decadeStartBranch + 10) % EARTHLY_BRANCHES.length]!,
    EARTHLY_BRANCHES[(decadeStartBranch + 11) % EARTHLY_BRANCHES.length]!,
  ];
}
