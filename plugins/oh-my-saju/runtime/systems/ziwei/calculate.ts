import { calculateSaju } from 'saju-engine';
import type { EarthlyBranch, FiveElement, HeavenlyStem } from 'saju-engine';
import { deepFreeze } from '../../internal/deep-freeze';
import {
  assertExplicitDayHourPolicies,
  branchAt,
  branchIndex,
  normalizedChronologyFromSajuReport,
  stemAt,
  stemIndex,
  systemModulo,
  TraditionalSystemError,
} from '../shared';
import { ZIWEI_QUANSHU_CORE_PROFILE } from './profile';
import type {
  ZiweiMainStar,
  ZiweiMainStarName,
  ZiweiPalace,
  ZiweiPalaceName,
  ZiweiReport,
  ZiweiRequest,
  ZiweiStarLocation,
} from './types';

const PALACE_BRANCHES = Object.freeze([
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
  '자',
  '축',
] as const satisfies readonly EarthlyBranch[]);

const PALACE_NAMES = Object.freeze([
  '명궁',
  '부모궁',
  '복덕궁',
  '전택궁',
  '관록궁',
  '교우궁',
  '천이궁',
  '질액궁',
  '재백궁',
  '자녀궁',
  '부처궁',
  '형제궁',
] as const satisfies readonly ZiweiPalaceName[]);

const NAYIN_PAIR_ELEMENTS = Object.freeze([
  '금',
  '화',
  '목',
  '토',
  '금',
  '화',
  '수',
  '토',
  '금',
  '목',
  '수',
  '토',
  '화',
  '목',
  '수',
  '금',
  '화',
  '목',
  '토',
  '금',
  '화',
  '수',
  '토',
  '금',
  '목',
  '수',
  '토',
  '화',
  '목',
  '수',
] as const satisfies readonly FiveElement[]);

const BUREAU_BY_ELEMENT: Readonly<
  Record<FiveElement, { readonly number: 2 | 3 | 4 | 5 | 6; readonly name: string }>
> = Object.freeze({
  수: Object.freeze({ number: 2, name: '수이국' }),
  목: Object.freeze({ number: 3, name: '목삼국' }),
  금: Object.freeze({ number: 4, name: '금사국' }),
  토: Object.freeze({ number: 5, name: '토오국' }),
  화: Object.freeze({ number: 6, name: '화육국' }),
});

const STAR_OFFSETS = Object.freeze([
  ['ziwei', '紫微', 'ziwei', 0],
  ['tianji', '天機', 'ziwei', -1],
  ['taiyang', '太陽', 'ziwei', -3],
  ['wuqu', '武曲', 'ziwei', -4],
  ['tiantong', '天同', 'ziwei', -5],
  ['lianzhen', '廉貞', 'ziwei', -8],
  ['tianfu', '天府', 'tianfu', 0],
  ['taiyin', '太陰', 'tianfu', 1],
  ['tanlang', '貪狼', 'tianfu', 2],
  ['jumen', '巨門', 'tianfu', 3],
  ['tianxiang', '天相', 'tianfu', 4],
  ['tianliang', '天梁', 'tianfu', 5],
  ['qisha', '七殺', 'tianfu', 6],
  ['pojun', '破軍', 'tianfu', 10],
] as const satisfies readonly (readonly [string, ZiweiMainStarName, 'ziwei' | 'tianfu', number])[]);

function assertProfile(request: ZiweiRequest): void {
  const profile = request?.profile;
  if (
    profile?.id !== 'ziwei-quanshu-core' ||
    profile.version !== '1.0.0' ||
    profile.leapMonthPolicy !== 'whole-leap-as-next-month' ||
    profile.birthYearBoundary !== 'lunar-new-year'
  ) {
    throw new TraditionalSystemError(
      'UNSUPPORTED_SYSTEM_PROFILE',
      'Zi Wei requires profile.leapMonthPolicy="whole-leap-as-next-month", profile.birthYearBoundary="lunar-new-year", and ziwei-quanshu-core@1.0.0.',
      { path: ['profile'] },
    );
  }
}

function lunarYearStem(year: number): HeavenlyStem {
  return stemAt(year - 4);
}

function yinPalaceStartStem(yearStem: HeavenlyStem): HeavenlyStem {
  const index = stemIndex(yearStem);
  const group = systemModulo(index, 5);
  return stemAt([2, 4, 6, 8, 0][group]!);
}

function sexagenaryCycleIndex(stem: HeavenlyStem, branch: EarthlyBranch): number {
  for (let index = 0; index < 60; index += 1) {
    if (stemAt(index) === stem && branchAt(index) === branch) return index;
  }
  throw new TraditionalSystemError(
    'SYSTEM_INVARIANT_VIOLATION',
    'The palace stem and branch did not form a sexagenary-cycle pair.',
    { details: { stem, branch } },
  );
}

function palaceNameAt(branchPosition: number, lifeIndex: number): ZiweiPalaceName {
  return PALACE_NAMES[systemModulo(branchPosition - lifeIndex, 12)]!;
}

export function locateZiweiStar(
  bureauNumber: 2 | 3 | 4 | 5 | 6,
  lunarDay: number,
): ZiweiStarLocation {
  if (!Number.isInteger(lunarDay) || lunarDay < 1 || lunarDay > 30) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'Zi Wei lunar day must be an integer from 1 through 30.',
      { path: ['subject', 'birth', 'date', 'day'] },
    );
  }
  let adjustment = 0;
  while ((lunarDay + adjustment) % bureauNumber !== 0) adjustment += 1;
  const quotient = (lunarDay + adjustment) / bureauNumber;
  const index = systemModulo(quotient - 1 + (adjustment % 2 === 0 ? adjustment : -adjustment), 12);
  return {
    index,
    branch: PALACE_BRANCHES[index]!,
    adjustment,
    quotient,
  };
}

export function calculateZiweiChart(request: ZiweiRequest): ZiweiReport {
  assertProfile(request);
  assertExplicitDayHourPolicies(request.subject);
  const calculation = calculateSaju(request.subject);
  const lunar = calculation.chronology.koreanLunarDate;
  const effectiveMonth = lunar.month + (lunar.monthKind === 'leap' ? 1 : 0);
  const hourBranch = calculation.pillars.hour.branch.korean;
  const hourIndex = branchIndex(hourBranch);
  const lifeIndex = systemModulo(effectiveMonth - 1 - hourIndex, 12);
  const bodyIndex = systemModulo(effectiveMonth - 1 + hourIndex, 12);
  const yearStem = lunarYearStem(lunar.year);
  const startStem = yinPalaceStartStem(yearStem);

  const palaceSeeds = PALACE_BRANCHES.map((branch, index) => {
    const stem = stemAt(stemIndex(startStem) + index);
    return {
      index,
      branch,
      stem,
      pillar: `${stem}${branch}`,
      name: palaceNameAt(index, lifeIndex),
      isLifePalace: index === lifeIndex,
      isBodyPalace: index === bodyIndex,
    };
  });
  const lifePalace = palaceSeeds[lifeIndex]!;
  const lifeCycleIndex = sexagenaryCycleIndex(lifePalace.stem, lifePalace.branch);
  const nayinElement = NAYIN_PAIR_ELEMENTS[Math.floor(lifeCycleIndex / 2)]!;
  const bureau = BUREAU_BY_ELEMENT[nayinElement];
  const ziwei = locateZiweiStar(bureau.number, lunar.day);
  const tianfuIndex = systemModulo(12 - ziwei.index, 12);

  const stars: ZiweiMainStar[] = STAR_OFFSETS.map(([id, name, anchor, offset]) => {
    const index = systemModulo((anchor === 'ziwei' ? ziwei.index : tianfuIndex) + offset, 12);
    return {
      id,
      name,
      branch: PALACE_BRANCHES[index]!,
      palaceName: palaceNameAt(index, lifeIndex),
    };
  });
  const palaces: ZiweiPalace[] = palaceSeeds.map((palace) => ({
    ...palace,
    mainStars: stars.filter(({ branch }) => branch === palace.branch).map(({ name }) => name),
  }));

  return deepFreeze({
    schemaVersion: '1',
    kind: 'ziwei',
    value: {
      normalizedLunarDate: {
        year: lunar.year,
        month: lunar.month,
        day: lunar.day,
        isLeapMonth: lunar.monthKind === 'leap',
        effectiveMonth,
      },
      lunarYearStem: yearStem,
      lifePalaceBranch: PALACE_BRANCHES[lifeIndex]!,
      bodyPalaceBranch: PALACE_BRANCHES[bodyIndex]!,
      bureau: {
        element: nayinElement,
        number: bureau.number,
        name: bureau.name,
      },
      palaces,
      mainStars: stars,
    },
    audit: {
      module: { id: 'ziwei', version: '1.0.0', schemaVersion: '1' },
      profile: ZIWEI_QUANSHU_CORE_PROFILE,
      calculationCore: calculation.audit.engine,
      implementation: 'oh-my-saju-independent',
      policies: [
        {
          id: 'ziwei.leap-month',
          version: '1.0.0',
          value: request.profile.leapMonthPolicy,
        },
        {
          id: 'ziwei.birth-year-boundary',
          version: '1.0.0',
          value: request.profile.birthYearBoundary,
        },
        {
          id: 'saju.zi-hour-policy',
          version: '1.0.0',
          value: calculation.audit.rules.ziHourPolicy,
        },
        {
          id: 'saju.day-hour-clock',
          version: '1.0.0',
          value: calculation.audit.rules.dayHourClock,
        },
      ],
      implicitAdjustments: [],
      predictiveValidity: 'not-established',
      interpretationScope: 'calculation-and-classical-classification-only',
      limitations: [
        {
          id: 'ziwei-primary-stars-only',
          message:
            'This profile stops at the twelve palaces, five-element bureau, and fourteen main stars.',
        },
        {
          id: 'ziwei-no-interpretation',
          message:
            'Auxiliary stars, transformations, periods, dignity, and event interpretation are not produced.',
        },
      ],
      trace: {
        normalizedChronology: normalizedChronologyFromSajuReport(calculation),
        hourBranch,
        hourBranchIndex: hourIndex,
        effectiveLunarMonth: effectiveMonth,
        lifePalaceIndex: lifeIndex,
        bodyPalaceIndex: bodyIndex,
        yinPalaceStartStem: startStem,
        lifePalacePillar: {
          stem: lifePalace.stem,
          branch: lifePalace.branch,
          cycleIndex: lifeCycleIndex,
          nayinElement,
        },
        ziwei: {
          lunarDay: lunar.day,
          bureauNumber: bureau.number,
          adjustment: ziwei.adjustment,
          quotient: ziwei.quotient,
          index: ziwei.index,
          branch: ziwei.branch,
        },
        tianfu: {
          index: tianfuIndex,
          branch: PALACE_BRANCHES[tianfuIndex]!,
        },
      },
    },
  });
}
