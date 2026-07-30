import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const typescriptBinary = `./node_modules/.bin/tsc${process.platform === 'win32' ? '.cmd' : ''}`;

const request = {
  birth: {
    date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
    time: { hour: 5, minute: 30 },
    timeZone: 'Asia/Seoul',
  },
};

if (process.argv.includes('--child')) {
  const { calculateSaju } = await import('saju-engine');
  const { calculateSajuDailyTransit, calculateSajuTiming } = await import('saju-engine/timing');
  process.stdout.write(
    JSON.stringify({
      report: calculateSaju(request),
      timing: calculateSajuTiming({
        natalRequest: request,
        fromYear: 2026,
        throughYear: 2026,
      }),
      dailyTransit: calculateSajuDailyTransit({
        natalRequest: request,
        date: { calendar: 'gregorian', year: 2026, month: 6, day: 28 },
      }),
    }),
  );
} else {
  const esm = await import('saju-engine');
  const calendar = await import('saju-engine/calendar');
  const advanced = await import('saju-engine/advanced');
  const timing = await import('saju-engine/timing');
  const require = createRequire(import.meta.url);
  const commonJs = require('saju-engine');
  const commonJsCalendar = require('saju-engine/calendar');
  const commonJsAdvanced = require('saju-engine/advanced');
  const commonJsTiming = require('saju-engine/timing');
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const gitCommit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  const gitStatus = spawnSync('git', ['status', '--porcelain', '--untracked-files=normal'], {
    encoding: 'utf8',
  });

  assert.equal(esm.ENGINE_MANIFEST.engine.version, packageJson.version);
  assert.deepEqual(Object.keys(packageJson.exports).sort(), [
    '.',
    './advanced',
    './calendar',
    './package.json',
    './timing',
  ]);
  assert.equal(Object.hasOwn(esm.ENGINE_MANIFEST, 'interpretation'), false);
  assert.equal(Object.hasOwn(commonJs.ENGINE_MANIFEST, 'interpretation'), false);

  const removedSubpaths = [
    'saju-engine/legacy',
    'saju-engine/interpretation',
    'saju-engine/ai',
    'saju-engine/agent',
  ];
  for (const subpath of removedSubpaths) {
    await assert.rejects(import(subpath), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
    assert.throws(() => require(subpath), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
  }

  const removedDistEntries = readdirSync(new URL('../dist/', import.meta.url)).filter((path) =>
    /^(?:legacy|interpretation|ai|agent)(?:\.|$)/u.test(path),
  );
  assert.deepEqual(
    removedDistEntries,
    [],
    'The calculation-core build must not contain interpretation, AI, or agent entries.',
  );
  const runtimeFiles = readdirSync(new URL('../dist/', import.meta.url)).filter((path) =>
    /\.(?:cjs|js)$/u.test(path),
  );
  for (const runtimeFile of runtimeFiles) {
    assert.doesNotMatch(
      readFileSync(new URL(`../dist/${runtimeFile}`, import.meta.url), 'utf8'),
      /(?:from\s+|require\()['"]astronomy-engine['"]/u,
      `Published runtime must bundle astronomy-engine for Node 18 compatibility: ${runtimeFile}`,
    );
  }

  if (gitCommit.status === 0 && gitStatus.status === 0) {
    const expectedRevision = `${gitCommit.stdout.trim()}${gitStatus.stdout.trim() ? '-dirty' : ''}`;
    assert.equal(esm.ENGINE_MANIFEST.engine.sourceRevision, expectedRevision);
  }
  const esmReport = esm.calculateSaju(request);
  assert.equal(esmReport.pillars.day.korean, '계유');
  const timingReport = timing.calculateSajuTiming({
    natalRequest: request,
    fromYear: 2026,
    throughYear: 2026,
  });
  assert.equal(timingReport.years[0].months.length, 12);
  assert.equal(timingReport.years[0].annualPillar.pillar.korean, '병오');
  assert.deepEqual(
    timingReport.years[0].months.map(({ pillar }) => pillar.korean),
    [
      '경인',
      '신묘',
      '임진',
      '계사',
      '갑오',
      '을미',
      '병신',
      '정유',
      '무술',
      '기해',
      '경자',
      '신축',
    ],
  );
  assert.deepEqual(
    commonJsTiming.calculateSajuTiming({
      natalRequest: request,
      fromYear: 2026,
      throughYear: 2026,
    }),
    timingReport,
  );
  const dailyTransit = timing.calculateSajuDailyTransit({
    natalRequest: request,
    date: { calendar: 'gregorian', year: 2026, month: 6, day: 28 },
  });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(dailyTransit.pillars).map(([position, pillar]) => [position, pillar.korean]),
    ),
    { year: '병오', month: '갑오', day: '계유' },
  );
  assert.deepEqual(dailyTransit.relationships.branchClashes, [
    {
      positions: ['transit-day', 'natal-hour'],
      members: ['유', '묘'],
      direction: 'mutual',
    },
  ]);
  assert.equal(Object.isFrozen(dailyTransit), true);
  assert.deepEqual(
    commonJsTiming.calculateSajuDailyTransit({
      natalRequest: request,
      date: { calendar: 'gregorian', year: 2026, month: 6, day: 28 },
    }),
    dailyTransit,
  );
  assert.deepEqual(esmReport.chronology.daylightSaving, {
    representation: 'iana-tzif-isdst-with-derived-save',
    isDaylightSavingTime: false,
    offsetSeconds: 0,
  });
  assert.equal(commonJs.calculateSaju(request).pillars.day.korean, '계유');
  const unknownTimeReport = esm.calculateSajuPossibilities({
    birth: {
      date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
      time: { kind: 'unknown', reason: 'asked-unknown' },
      timeZone: 'Asia/Seoul',
    },
  });
  assert.equal(unknownTimeReport.hourPillar, 'omitted');
  assert.equal(unknownTimeReport.policyResults[0].stablePillars.day.korean, '계유');
  assert.equal(
    commonJs.calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 1992, month: 10, day: 24 },
        time: { kind: 'unknown' },
        timeZone: 'Asia/Seoul',
      },
    }).policyResults[0].stablePillars.day.korean,
    '계유',
  );
  assert.deepEqual(calendar.solarToLunar(1997, 2, 8), {
    year: 1997,
    month: 1,
    day: 1,
    isLeapMonth: false,
  });
  assert.deepEqual(commonJsCalendar.solarToLunar(1997, 2, 8), {
    year: 1997,
    month: 1,
    day: 1,
    isLeapMonth: false,
  });
  const lunarMonthInfo = calendar.getLunarMonthInfo(2023, 2);
  assert.deepEqual(lunarMonthInfo, {
    year: 2023,
    month: 2,
    regular: {
      isLeapMonth: false,
      dayCount: 30,
      firstSolarDate: { year: 2023, month: 2, day: 20 },
      lastSolarDate: { year: 2023, month: 3, day: 21 },
    },
    leap: {
      isLeapMonth: true,
      dayCount: 29,
      firstSolarDate: { year: 2023, month: 3, day: 22 },
      lastSolarDate: { year: 2023, month: 4, day: 19 },
    },
  });
  assert.deepEqual(commonJsCalendar.getLunarMonthInfo(2023, 2), lunarMonthInfo);
  const luckTiming = timing.calculateSajuTiming({
    natalRequest: request,
    fromYear: 2026,
    throughYear: 2026,
    gender: 'male',
    luckPillarCount: 3,
  });
  assert.equal(luckTiming.luckPillars.pillars.length, 3);
  assert.deepEqual(luckTiming.luckPillars.pillars[0].tenGods, {
    stem: '편인',
    branch: '겁재',
  });
  assert.equal(
    advanced.resolveBirthInstant({
      localDateTime: {
        year: 1908,
        month: 3,
        day: 31,
        hour: 23,
        minute: 59,
        second: 59,
        millisecond: 0,
      },
      timeZone: 'Asia/Seoul',
    }).offsetSeconds,
    30_472,
  );
  let crossEntryError;
  try {
    commonJsAdvanced.resolveBirthInstant({
      localDateTime: {
        year: 1992,
        month: 10,
        day: 24,
        hour: 5,
        minute: 30,
        second: 0,
        millisecond: 0,
      },
      timeZone: 'Not/A_Zone',
    });
  } catch (error) {
    crossEntryError = error;
  }
  assert.equal(
    commonJs.isSajuError(crossEntryError),
    true,
    'CJS errors from a subpath must be recognized by the root API',
  );
  assert.equal(
    crossEntryError instanceof commonJs.SajuError,
    true,
    'CJS errors from a subpath must satisfy the root SajuError class',
  );

  const typeCheck = spawnSync(
    typescriptBinary,
    [
      '--noEmit',
      '--ignoreConfig',
      '--strict',
      '--types',
      'node',
      '--target',
      'ES2022',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      'test/package-consumer.ts',
      'test/package-consumer.cts',
    ],
    {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    },
  );
  assert.equal(typeCheck.status, 0, typeCheck.stderr || typeCheck.stdout);

  const script = fileURLToPath(import.meta.url);
  const outputs = ['UTC', 'America/New_York', 'Asia/Seoul'].map((timeZone) => {
    const child = spawnSync(process.execPath, [script, '--child'], {
      encoding: 'utf8',
      env: { ...process.env, TZ: timeZone },
    });
    assert.equal(child.status, 0, child.stderr);
    return child.stdout;
  });
  assert.equal(new Set(outputs).size, 1, 'Result changed with the host TZ variable');
  console.log(
    'ESM, CommonJS, declaration consumers, supported subpaths, and host-TZ independence verified.',
  );
}
