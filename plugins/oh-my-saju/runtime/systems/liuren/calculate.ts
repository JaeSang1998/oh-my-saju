import { calculateSaju } from 'saju-engine';
import type { EarthlyBranch, FiveElement, HeavenlyStem, YinYang } from 'saju-engine';
import { findSolarTermsOfYear } from 'saju-engine/advanced';
import { deepFreeze } from '../../internal/deep-freeze';
import {
  assertExplicitDayHourPolicies,
  SYSTEM_EARTHLY_BRANCHES,
  branchAt,
  branchIndex,
  normalizedChronologyFromSajuReport,
  systemModulo,
  TraditionalSystemError,
} from '../shared';
import { LIUREN_QUANSHU_NINE_GATES_PROFILE } from './profile';
import type {
  LiurenControlCandidate,
  LiurenCoreInput,
  LiurenCoreResult,
  LiurenLesson,
  LiurenMonthGeneralEvidence,
  LiurenReport,
  LiurenRequest,
  LiurenRuleName,
  LiurenShehaiCandidate,
} from './types';

const STEM_ELEMENTS: Readonly<Record<HeavenlyStem, FiveElement>> = Object.freeze({
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
});

const BRANCH_ELEMENTS: Readonly<Record<EarthlyBranch, FiveElement>> = Object.freeze({
  자: '수',
  축: '토',
  인: '목',
  묘: '목',
  진: '토',
  사: '화',
  오: '화',
  미: '토',
  신: '금',
  유: '금',
  술: '토',
  해: '수',
});

const STEM_YIN_YANG: Readonly<Record<HeavenlyStem, YinYang>> = Object.freeze({
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
});

const BRANCH_YIN_YANG: Readonly<Record<EarthlyBranch, YinYang>> = Object.freeze({
  자: '양',
  축: '음',
  인: '양',
  묘: '음',
  진: '양',
  사: '음',
  오: '양',
  미: '음',
  신: '양',
  유: '음',
  술: '양',
  해: '음',
});

const STEM_LODGES: Readonly<Record<HeavenlyStem, EarthlyBranch>> = Object.freeze({
  갑: '인',
  을: '진',
  병: '사',
  정: '미',
  무: '사',
  기: '미',
  경: '신',
  신: '술',
  임: '해',
  계: '축',
});

const LODGED_STEMS_BY_BRANCH: Readonly<Partial<Record<EarthlyBranch, readonly HeavenlyStem[]>>> =
  Object.freeze({
    인: Object.freeze(['갑'] as const),
    진: Object.freeze(['을'] as const),
    사: Object.freeze(['병', '무'] as const),
    미: Object.freeze(['정', '기'] as const),
    신: Object.freeze(['경'] as const),
    술: Object.freeze(['신'] as const),
    해: Object.freeze(['임'] as const),
    축: Object.freeze(['계'] as const),
  });

const PUNISHMENT: Readonly<Record<EarthlyBranch, EarthlyBranch>> = Object.freeze({
  자: '묘',
  축: '술',
  인: '사',
  묘: '자',
  진: '진',
  사: '신',
  오: '오',
  미: '축',
  신: '인',
  유: '유',
  술: '미',
  해: '해',
});

const STEM_COMBINATION_PARTNER: Readonly<Record<HeavenlyStem, HeavenlyStem>> = Object.freeze({
  갑: '기',
  을: '경',
  병: '신',
  정: '임',
  무: '계',
  기: '갑',
  경: '을',
  신: '병',
  임: '정',
  계: '무',
});

const CONTROLLED_ELEMENT: Readonly<Record<FiveElement, FiveElement>> = Object.freeze({
  목: '토',
  토: '수',
  수: '화',
  화: '금',
  금: '목',
});

function controls(controller: FiveElement, controlled: FiveElement): boolean {
  return CONTROLLED_ELEMENT[controller] === controlled;
}

function branchSeasonPosition(branch: EarthlyBranch): 'meng' | 'zhong' | 'ji' {
  if (['인', '신', '사', '해'].includes(branch)) return 'meng';
  if (['자', '오', '묘', '유'].includes(branch)) return 'zhong';
  return 'ji';
}

function seasonPriority(position: 'meng' | 'zhong' | 'ji'): number {
  return position === 'meng' ? 3 : position === 'zhong' ? 2 : 1;
}

function opposite(branch: EarthlyBranch): EarthlyBranch {
  return branchAt(branchIndex(branch) + 6);
}

function deduplicateCandidates(
  candidates: readonly LiurenControlCandidate[],
): readonly LiurenControlCandidate[] {
  const seen = new Set<EarthlyBranch>();
  return candidates.filter(({ upper }) => {
    if (seen.has(upper)) return false;
    seen.add(upper);
    return true;
  });
}

export function heavenBranchAbove(
  earthBranch: EarthlyBranch,
  monthGeneral: EarthlyBranch,
  hourBranch: EarthlyBranch,
): EarthlyBranch {
  return branchAt(branchIndex(earthBranch) + branchIndex(monthGeneral) - branchIndex(hourBranch));
}

function earthBranchBelow(
  heavenBranch: EarthlyBranch,
  monthGeneral: EarthlyBranch,
  hourBranch: EarthlyBranch,
): EarthlyBranch {
  return branchAt(branchIndex(heavenBranch) - branchIndex(monthGeneral) + branchIndex(hourBranch));
}

function makeLessons(input: LiurenCoreInput): readonly LiurenLesson[] {
  const heaven = (earth: EarthlyBranch): EarthlyBranch =>
    heavenBranchAbove(earth, input.monthGeneral, input.hourBranch);
  const firstUpper = heaven(STEM_LODGES[input.dayStem]);
  const thirdUpper = heaven(input.dayBranch);
  return [
    {
      index: 1,
      lowerKind: 'stem',
      lower: input.dayStem,
      upper: firstUpper,
      lowerElement: STEM_ELEMENTS[input.dayStem],
      upperElement: BRANCH_ELEMENTS[firstUpper],
    },
    {
      index: 2,
      lowerKind: 'branch',
      lower: firstUpper,
      upper: heaven(firstUpper),
      lowerElement: BRANCH_ELEMENTS[firstUpper],
      upperElement: BRANCH_ELEMENTS[heaven(firstUpper)],
    },
    {
      index: 3,
      lowerKind: 'branch',
      lower: input.dayBranch,
      upper: thirdUpper,
      lowerElement: BRANCH_ELEMENTS[input.dayBranch],
      upperElement: BRANCH_ELEMENTS[thirdUpper],
    },
    {
      index: 4,
      lowerKind: 'branch',
      lower: thirdUpper,
      upper: heaven(thirdUpper),
      lowerElement: BRANCH_ELEMENTS[thirdUpper],
      upperElement: BRANCH_ELEMENTS[heaven(thirdUpper)],
    },
  ];
}

function candidateFromLesson(
  lesson: LiurenLesson,
  direction: LiurenControlCandidate['direction'],
  input: LiurenCoreInput,
): LiurenControlCandidate {
  return {
    lessonIndex: lesson.index,
    upper: lesson.upper,
    direction,
    yinYang: BRANCH_YIN_YANG[lesson.upper],
    side: lesson.index <= 2 ? 'day-stem' : 'day-branch',
    riddenEarth: earthBranchBelow(lesson.upper, input.monthGeneral, input.hourBranch),
  };
}

function directCandidates(
  lessons: readonly LiurenLesson[],
  input: LiurenCoreInput,
): readonly LiurenControlCandidate[] {
  const lowerControls = lessons
    .filter(({ lowerElement, upperElement }) => controls(lowerElement, upperElement))
    .map((lesson) => candidateFromLesson(lesson, 'lower-controls-upper', input));
  if (lowerControls.length > 0) return deduplicateCandidates(lowerControls);
  return deduplicateCandidates(
    lessons
      .filter(({ lowerElement, upperElement }) => controls(upperElement, lowerElement))
      .map((lesson) => candidateFromLesson(lesson, 'upper-controls-lower', input)),
  );
}

function remoteCandidates(
  lessons: readonly LiurenLesson[],
  input: LiurenCoreInput,
): readonly LiurenControlCandidate[] {
  const uniqueUpperLessons = lessons.filter(
    (lesson, index) => lessons.findIndex(({ upper }) => upper === lesson.upper) === index,
  );
  const dayElement = STEM_ELEMENTS[input.dayStem];
  const upperControlsDay = uniqueUpperLessons
    .filter(({ upperElement }) => controls(upperElement, dayElement))
    .map((lesson) => candidateFromLesson(lesson, 'upper-controls-lower', input));
  if (upperControlsDay.length > 0) return deduplicateCandidates(upperControlsDay);
  return deduplicateCandidates(
    uniqueUpperLessons
      .filter(({ upperElement }) => controls(dayElement, upperElement))
      .map((lesson) => candidateFromLesson(lesson, 'lower-controls-upper', input)),
  );
}

function shehaiCandidate(candidate: LiurenControlCandidate): LiurenShehaiCandidate {
  const targetIndex = branchIndex(candidate.upper);
  const startIndex = branchIndex(candidate.riddenEarth);
  const traversedBranches: EarthlyBranch[] = [];
  const controllingNodes: string[] = [];

  for (let step = 1; step <= 12; step += 1) {
    const branch = branchAt(startIndex + step);
    traversedBranches.push(branch);
    const branchElement = BRANCH_ELEMENTS[branch];
    const branchMatches =
      candidate.direction === 'lower-controls-upper'
        ? controls(branchElement, BRANCH_ELEMENTS[candidate.upper])
        : controls(BRANCH_ELEMENTS[candidate.upper], branchElement);
    if (branchMatches) controllingNodes.push(branch);

    for (const stem of LODGED_STEMS_BY_BRANCH[branch] ?? []) {
      const stemMatches =
        candidate.direction === 'lower-controls-upper'
          ? controls(STEM_ELEMENTS[stem], BRANCH_ELEMENTS[candidate.upper])
          : controls(BRANCH_ELEMENTS[candidate.upper], STEM_ELEMENTS[stem]);
      if (stemMatches) controllingNodes.push(stem);
    }
    if (branchIndex(branch) === targetIndex) break;
  }

  return {
    ...candidate,
    depth: controllingNodes.length,
    traversedBranches,
    controllingNodes,
    seasonPosition: branchSeasonPosition(candidate.riddenEarth),
  };
}

function chooseByShehai(
  candidates: readonly LiurenControlCandidate[],
  input: LiurenCoreInput,
): {
  readonly selected: LiurenControlCandidate;
  readonly evidence: readonly LiurenShehaiCandidate[];
} {
  const evidence = candidates.map((candidate) => shehaiCandidate(candidate));
  const preferredSide: LiurenControlCandidate['side'] =
    STEM_YIN_YANG[input.dayStem] === '양' ? 'day-stem' : 'day-branch';
  const sorted = [...evidence].sort(
    (left, right) =>
      right.depth - left.depth ||
      seasonPriority(right.seasonPosition) - seasonPriority(left.seasonPosition) ||
      Number(right.side === preferredSide) - Number(left.side === preferredSide) ||
      left.lessonIndex - right.lessonIndex,
  );
  return { selected: sorted[0]!, evidence };
}

function generalTransmissions(
  initial: EarthlyBranch,
  input: LiurenCoreInput,
): readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch] {
  const middle = heavenBranchAbove(initial, input.monthGeneral, input.hourBranch);
  return [initial, middle, heavenBranchAbove(middle, input.monthGeneral, input.hourBranch)];
}

function selectCandidate(
  candidates: readonly LiurenControlCandidate[],
  input: LiurenCoreInput,
  path: LiurenRuleName[],
): {
  readonly initial: EarthlyBranch;
  readonly parity: readonly LiurenControlCandidate[];
  readonly shehai: readonly LiurenShehaiCandidate[];
} {
  if (candidates.length === 1) {
    return { initial: candidates[0]!.upper, parity: [], shehai: [] };
  }
  const dayPolarity = STEM_YIN_YANG[input.dayStem];
  const parity = candidates.filter(({ yinYang }) => yinYang === dayPolarity);
  path.push('比用');
  if (parity.length === 1) {
    return { initial: parity[0]!.upper, parity, shehai: [] };
  }
  path.push('涉害');
  const pool = parity.length > 0 ? parity : candidates;
  const selected = chooseByShehai(pool, input);
  return { initial: selected.selected.upper, parity, shehai: selected.evidence };
}

function fuyinTransmissions(
  input: LiurenCoreInput,
  lessons: readonly LiurenLesson[],
  directInitial?: EarthlyBranch,
): readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch] {
  const isYangDay = STEM_YIN_YANG[input.dayStem] === '양';
  const initial = directInitial ?? (isYangDay ? lessons[0]!.upper : input.dayBranch);
  let middle = PUNISHMENT[initial];
  if (middle === initial) middle = isYangDay ? input.dayBranch : lessons[0]!.upper;
  let final = PUNISHMENT[middle];
  if (final === middle) final = opposite(middle);
  return [initial, middle, final];
}

function travelHorse(branch: EarthlyBranch): EarthlyBranch {
  if (['신', '자', '진'].includes(branch)) return '인';
  if (['인', '오', '술'].includes(branch)) return '신';
  if (['사', '유', '축'].includes(branch)) return '해';
  return '사';
}

function uniqueLessonPairCount(lessons: readonly LiurenLesson[], dayStem: HeavenlyStem): number {
  return new Set(
    lessons.map(({ index, lower, upper }) => {
      const normalizedLower = index === 1 ? STEM_LODGES[dayStem] : lower;
      return `${normalizedLower}/${upper}`;
    }),
  ).size;
}

export function calculateLiurenCore(input: LiurenCoreInput): LiurenCoreResult {
  const earthPlate = [...SYSTEM_EARTHLY_BRANCHES];
  const heavenPlate = earthPlate.map((earth) => ({
    earth,
    heaven: heavenBranchAbove(earth, input.monthGeneral, input.hourBranch),
  }));
  const lessons = makeLessons(input);
  const direct = directCandidates(lessons, input);
  const remote = direct.length === 0 ? remoteCandidates(lessons, input) : [];
  const path: LiurenRuleName[] = [];
  let parity: readonly LiurenControlCandidate[] = [];
  let shehai: readonly LiurenShehaiCandidate[] = [];
  let transmissions: readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch];
  const shift = systemModulo(branchIndex(input.monthGeneral) - branchIndex(input.hourBranch), 12);
  const isFuyin = shift === 0;
  const isFanyin = shift === 6;

  if (isFuyin) {
    path.push('伏吟');
    if (direct.length > 0) {
      path.push('賊克', direct[0]!.direction === 'lower-controls-upper' ? '下賊上' : '上克下');
      const selected = selectCandidate(direct, input, path);
      parity = selected.parity;
      shehai = selected.shehai;
      transmissions = fuyinTransmissions(input, lessons, selected.initial);
    } else {
      transmissions = fuyinTransmissions(input, lessons);
    }
  } else if (direct.length > 0) {
    if (isFanyin) path.push('返吟');
    path.push('賊克', direct[0]!.direction === 'lower-controls-upper' ? '下賊上' : '上克下');
    const selected = selectCandidate(direct, input, path);
    parity = selected.parity;
    shehai = selected.shehai;
    transmissions = generalTransmissions(selected.initial, input);
  } else if (isFanyin) {
    path.push('返吟', '井欄');
    transmissions = [travelHorse(input.dayBranch), lessons[2]!.upper, lessons[0]!.upper];
  } else if (remote.length > 0) {
    path.push('遙克', remote[0]!.direction === 'upper-controls-lower' ? '蒿矢' : '彈射');
    const selected = selectCandidate(remote, input, path);
    parity = selected.parity;
    shehai = selected.shehai;
    transmissions = generalTransmissions(selected.initial, input);
  } else {
    const pairCount = uniqueLessonPairCount(lessons, input.dayStem);
    const isYangDay = STEM_YIN_YANG[input.dayStem] === '양';
    if (pairCount === 4) {
      path.push('昴星');
      transmissions = isYangDay
        ? [
            heavenBranchAbove('유', input.monthGeneral, input.hourBranch),
            lessons[2]!.upper,
            lessons[0]!.upper,
          ]
        : [
            earthBranchBelow('유', input.monthGeneral, input.hourBranch),
            lessons[0]!.upper,
            lessons[2]!.upper,
          ];
    } else if (pairCount === 3) {
      path.push('別責');
      const initial = isYangDay
        ? heavenBranchAbove(
            STEM_LODGES[STEM_COMBINATION_PARTNER[input.dayStem]],
            input.monthGeneral,
            input.hourBranch,
          )
        : heavenBranchAbove(
            branchAt(branchIndex(input.dayBranch) + 4),
            input.monthGeneral,
            input.hourBranch,
          );
      transmissions = [initial, lessons[0]!.upper, lessons[0]!.upper];
    } else if (pairCount === 2) {
      path.push('八專');
      const initial = isYangDay
        ? branchAt(branchIndex(lessons[0]!.upper) + 2)
        : branchAt(branchIndex(lessons[2]!.upper) - 2);
      transmissions = [initial, lessons[0]!.upper, lessons[0]!.upper];
    } else {
      path.push('不備歸一');
      transmissions = [
        lessons[0]!.upper,
        heavenBranchAbove(lessons[0]!.upper, input.monthGeneral, input.hourBranch),
        heavenBranchAbove(
          heavenBranchAbove(lessons[0]!.upper, input.monthGeneral, input.hourBranch),
          input.monthGeneral,
          input.hourBranch,
        ),
      ];
    }
  }

  return deepFreeze({
    earthPlate,
    heavenPlate,
    fourLessons: lessons,
    directControlCandidates: direct,
    parityCandidates: parity,
    remoteControlCandidates: remote,
    shehaiCandidates: shehai,
    rulePath: path,
    threeTransmissions: transmissions,
  });
}

export function resolveMonthGeneral(epochMilliseconds: number): LiurenMonthGeneralEvidence {
  if (!Number.isFinite(epochMilliseconds)) {
    throw new TraditionalSystemError(
      'INVALID_SYSTEM_INPUT',
      'Liuren month-general resolution requires a finite epoch millisecond value.',
      { path: ['epochMilliseconds'] },
    );
  }
  const year = new Date(epochMilliseconds).getUTCFullYear();
  const events = [
    ...(year > 1800 ? findSolarTermsOfYear(year - 1) : []),
    ...findSolarTermsOfYear(year),
  ]
    .filter(({ index }) => index % 2 === 1)
    .filter(({ epochMilliseconds: eventEpoch }) => eventEpoch <= epochMilliseconds)
    .sort((left, right) => right.epochMilliseconds - left.epochMilliseconds);
  const event = events[0];
  if (event === undefined) {
    throw new TraditionalSystemError(
      'UNSUPPORTED_SYSTEM_DATE',
      'No preceding middle-qi event is available for the Liuren month general.',
      { path: ['subject', 'birth', 'date'] },
    );
  }
  return deepFreeze({
    branch: branchAt(-Math.floor((event.index - 1) / 2)),
    middleQi: {
      year: event.year,
      index: event.index,
      name: event.name,
      hanja: event.hanja,
      instantUtc: event.instantUtc,
      epochMilliseconds: event.epochMilliseconds,
      uncertaintyMilliseconds: event.uncertaintyMilliseconds,
    },
  });
}

function assertProfile(request: LiurenRequest): void {
  const profile = request?.profile;
  if (
    profile?.id !== 'liuren-quanshu-nine-gates' ||
    profile.version !== '1.0.0' ||
    profile.monthGeneralBoundary !== 'middle-qi-instant-inclusive' ||
    profile.shehaiTieBreak !== 'depth-then-season-position-then-day-side'
  ) {
    throw new TraditionalSystemError(
      'UNSUPPORTED_SYSTEM_PROFILE',
      'Liuren requires profile.monthGeneralBoundary="middle-qi-instant-inclusive", profile.shehaiTieBreak="depth-then-season-position-then-day-side", and liuren-quanshu-nine-gates@1.0.0.',
      { path: ['profile'] },
    );
  }
}

export function calculateLiurenChart(request: LiurenRequest): LiurenReport {
  assertProfile(request);
  assertExplicitDayHourPolicies(request.subject);
  const calculation = calculateSaju(request.subject);
  const monthGeneralEvidence = resolveMonthGeneral(calculation.chronology.epochMilliseconds);
  const input: LiurenCoreInput = {
    dayStem: calculation.pillars.day.stem.korean,
    dayBranch: calculation.pillars.day.branch.korean,
    hourBranch: calculation.pillars.hour.branch.korean,
    monthGeneral: monthGeneralEvidence.branch,
  };
  const core = calculateLiurenCore(input);

  return deepFreeze({
    schemaVersion: '1',
    kind: 'liuren',
    value: {
      ...core,
      dayPillar: calculation.pillars.day.korean,
      hourBranch: input.hourBranch,
      monthGeneral: input.monthGeneral,
    },
    audit: {
      module: { id: 'liuren', version: '1.0.0', schemaVersion: '1' },
      profile: LIUREN_QUANSHU_NINE_GATES_PROFILE,
      calculationCore: calculation.audit.engine,
      implementation: 'oh-my-saju-independent',
      policies: [
        {
          id: 'liuren.month-general-boundary',
          version: '1.0.0',
          value: request.profile.monthGeneralBoundary,
        },
        {
          id: 'liuren.shehai-tie-break',
          version: '1.0.0',
          value: request.profile.shehaiTieBreak,
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
          id: 'liuren-no-heavenly-generals',
          message:
            'This profile calculates month general, plates, four lessons, and transmissions; heavenly generals and judgment text are excluded.',
        },
        {
          id: 'liuren-no-prediction-score',
          message:
            'The report does not convert classical chart mechanics into an empirical prediction or auspiciousness score.',
        },
      ],
      trace: {
        normalizedChronology: normalizedChronologyFromSajuReport(calculation),
        input,
        monthGeneralEvidence,
        selection: {
          directControlCandidates: core.directControlCandidates,
          parityCandidates: core.parityCandidates,
          remoteControlCandidates: core.remoteControlCandidates,
          shehaiCandidates: core.shehaiCandidates,
          rulePath: core.rulePath,
        },
      },
    },
  });
}
