import { calculateSaju } from '../src/index';

interface BrowserSmokeResult {
  readonly passed: true;
  readonly browserTimeZone: string;
  readonly instantUtc: string;
  readonly offsetSeconds: number;
  readonly pillars: {
    readonly year: string;
    readonly month: string;
    readonly day: string;
    readonly hour: string;
  };
}

declare global {
  // Exposed only by the bundled browser smoke-test entry.
  var SAJU_ENGINE_BROWSER_SMOKE: BrowserSmokeResult | undefined;
}

const report = calculateSaju({
  birth: {
    date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
    time: { hour: 5, minute: 30 },
    timeZone: 'Asia/Seoul',
  },
});

const actualPillars = {
  year: report.pillars.year.korean,
  month: report.pillars.month.korean,
  day: report.pillars.day.korean,
  hour: report.pillars.hour.korean,
};
const actualProjection = JSON.stringify({
  instantUtc: report.chronology.instantUtc,
  offsetSeconds: report.chronology.offsetSeconds,
  pillars: actualPillars,
});
const expectedProjection = JSON.stringify({
  instantUtc: '1992-10-23T20:30:00.000Z',
  offsetSeconds: 32_400,
  pillars: { year: '임신', month: '경술', day: '계유', hour: '을묘' },
});
if (actualProjection !== expectedProjection) {
  throw new Error(`Browser calculation mismatch: ${actualProjection}`);
}

globalThis.SAJU_ENGINE_BROWSER_SMOKE = Object.freeze({
  passed: true,
  browserTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  instantUtc: report.chronology.instantUtc,
  offsetSeconds: report.chronology.offsetSeconds,
  pillars: Object.freeze(actualPillars),
});

const resultElement = (
  globalThis as typeof globalThis & {
    document?: {
      getElementById(id: string): { textContent: string | null } | null;
    };
  }
).document?.getElementById('result');
if (resultElement !== null && resultElement !== undefined) {
  resultElement.textContent = JSON.stringify(globalThis.SAJU_ENGINE_BROWSER_SMOKE);
}
