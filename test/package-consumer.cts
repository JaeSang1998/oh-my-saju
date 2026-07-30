import root = require('saju-engine');
import advanced = require('saju-engine/advanced');
import calendar = require('saju-engine/calendar');
import timing = require('saju-engine/timing');

const request: root.SajuRequest = {
  birth: {
    date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
    time: { hour: 5, minute: 30 },
    timeZone: 'Asia/Seoul',
  },
};
const report: root.SajuReport = root.calculateSaju(request);
const possibilities: root.SajuPossibilityReport = root.calculateSajuPossibilities({
  birth: {
    date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
    time: { kind: 'day-period', period: 'am' },
    timeZone: 'Asia/Seoul',
  },
});
const knownStructure: advanced.KnownPillarStructuralAnalysis = advanced.analyzeKnownPillarStructure(
  {
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
  },
);
const timingReport: timing.SajuTimingReport = timing.calculateSajuTiming({
  natalRequest: request,
  fromYear: 2026,
  throughYear: 2026,
  gender: 'female',
  luckPillarCount: 3,
});
const dailyTransitReport: timing.SajuDailyTransitReport = timing.calculateSajuDailyTransit({
  natalRequest: request,
  date: { calendar: 'gregorian', year: 2026, month: 6, day: 28 },
});
const monthInfo: calendar.LunarMonthInfo = calendar.getLunarMonthInfo(2023, 2);

// @ts-expect-error The calculation-core manifest does not own interpretation profiles.
void root.ENGINE_MANIFEST.interpretation;

void [
  report.schemaVersion,
  possibilities.policyResults[0]?.candidates,
  knownStructure.omittedPillars,
  advanced.findSolarTermBoundary(2024, 2),
  calendar.solarToLunar(1997, 2, 8),
  timingReport.years[0]?.months,
  timingReport.luckPillars?.pillars[0]?.tenGods,
  dailyTransitReport.relationships.branchClashes[0]?.positions,
  monthInfo.regular.dayCount,
];
