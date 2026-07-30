import {
  calculateSaju,
  calculateSajuPossibilities,
  ENGINE_MANIFEST,
  type DaylightSavingMetadata,
  type SajuPossibilityReport,
  type SajuReport,
  type SolarTimeCorrection,
} from 'saju-engine';
import {
  analyzeKnownPillarStructure,
  findSolarTermBoundary,
  resolveBirthInstant,
  type KnownPillarStructuralAnalysis,
} from 'saju-engine/advanced';
import {
  getLunarMonthInfo,
  lunarToSolar,
  solarToLunar,
  type LunarMonthInfo,
} from 'saju-engine/calendar';
import {
  calculateSajuDailyTransit,
  calculateSajuTiming,
  type SajuDailyTransitReport,
  type SajuTimingReport,
} from 'saju-engine/timing';

const EXACT_REQUEST = {
  birth: {
    date: { calendar: 'gregorian' as const, year: 1992, month: 10, day: 24 },
    time: { hour: 5, minute: 30 },
    timeZone: 'Asia/Seoul',
  },
};
const report: SajuReport = calculateSaju(EXACT_REQUEST);
const correction: SolarTimeCorrection | null = report.chronology.solarTimeCorrection;
const daylightSaving: DaylightSavingMetadata = report.chronology.daylightSaving;
const possibilities: SajuPossibilityReport = calculateSajuPossibilities({
  birth: {
    date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
    time: { kind: 'unknown', reason: 'asked-unknown' },
    timeZone: 'Asia/Seoul',
  },
});
const knownStructure: KnownPillarStructuralAnalysis = analyzeKnownPillarStructure({
  year: {
    heavenlyStem: report.pillars.year.stem.korean,
    earthlyBranch: report.pillars.year.branch.korean,
  },
  month: {
    heavenlyStem: report.pillars.month.stem.korean,
    earthlyBranch: report.pillars.month.branch.korean,
  },
  day: {
    heavenlyStem: report.pillars.day.stem.korean,
    earthlyBranch: report.pillars.day.branch.korean,
  },
});
const timingReport: SajuTimingReport = calculateSajuTiming({
  natalRequest: EXACT_REQUEST,
  fromYear: 2026,
  throughYear: 2026,
  gender: 'male',
  luckPillarCount: 3,
});
const dailyTransitReport: SajuDailyTransitReport = calculateSajuDailyTransit({
  natalRequest: EXACT_REQUEST,
  date: { calendar: 'gregorian', year: 2026, month: 6, day: 28 },
});
const monthInfo: LunarMonthInfo = getLunarMonthInfo(2023, 2);

// @ts-expect-error The calculation-core manifest does not own interpretation profiles.
void ENGINE_MANIFEST.interpretation;

void [
  ENGINE_MANIFEST.engine.version,
  correction,
  daylightSaving,
  possibilities.policyResults[0]?.stablePillars.day,
  knownStructure.omittedPillars,
  findSolarTermBoundary(2024, 2),
  resolveBirthInstant({
    localDateTime: {
      year: 1992,
      month: 10,
      day: 24,
      hour: 5,
      minute: 30,
      second: 0,
      millisecond: 0,
    },
    timeZone: 'Asia/Seoul',
  }),
  solarToLunar(1997, 2, 8),
  lunarToSolar(2020, 4, 1, true),
  timingReport.years[0]?.months,
  timingReport.luckPillars?.pillars[0]?.tenGods,
  dailyTransitReport.relationships.branchClashes[0]?.positions,
  monthInfo.leap?.dayCount,
];
