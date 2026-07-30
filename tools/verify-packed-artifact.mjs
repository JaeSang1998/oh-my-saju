import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const temporaryRoot = mkdtempSync(join(tmpdir(), 'saju-engine-artifact-'));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    ...options,
  });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`,
  );
  return result;
}

function packArtifact() {
  const result = run('npm', [
    'pack',
    '--json',
    '--ignore-scripts',
    '--pack-destination',
    temporaryRoot,
    '--cache',
    join(temporaryRoot, 'npm-cache'),
  ]);
  const packed = JSON.parse(result.stdout);
  assert.equal(Array.isArray(packed), true);
  assert.equal(packed.length, 1);
  return join(temporaryRoot, packed[0].filename);
}

const requestedArchive = process.argv[2];
const archivePath =
  requestedArchive === undefined ? packArtifact() : resolve(projectRoot, requestedArchive);

try {
  assert.equal(existsSync(archivePath), true, `Archive does not exist: ${archivePath}`);
  const extractRoot = join(temporaryRoot, 'extract');
  mkdirSync(extractRoot);
  run('tar', ['-xzf', archivePath, '-C', extractRoot]);

  const packageRoot = join(extractRoot, 'package');
  const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  assert.equal(packageJson.name, 'saju-engine');
  assert.equal(packageJson.license, 'Apache-2.0');
  assert.equal(basename(archivePath), `saju-engine-${packageJson.version}.tgz`);
  assert.match(
    readFileSync(join(packageRoot, 'LICENSE'), 'utf8'),
    /^Apache License\nVersion 2\.0, January 2004$/mu,
  );
  assert.match(
    readFileSync(join(packageRoot, 'LICENSES/korean-lunar-calendar-MIT.txt'), 'utf8'),
    /^MIT License\n\nCopyright \(c\) 2022 Jinil Lee$/mu,
  );
  assert.match(
    readFileSync(join(packageRoot, 'LICENSES/astronomy-engine-MIT.txt'), 'utf8'),
    /^MIT License\n\nCopyright \(c\) 2019-2023 Don Cross <cosinekitty@gmail\.com>$/mu,
  );
  const fixture = readFileSync(join(packageRoot, 'test/fixtures/kasi-lunar-dataset.json'));
  assert.equal(
    createHash('sha256').update(fixture).digest('hex'),
    'd651d5a77d7970cde4b36f414995b6ea833b4d50760f23fe0f462c96fdf8ca1a',
  );
  assert.match(
    readFileSync(join(packageRoot, 'test/fixtures/kasi-lunar-dataset.provenance.md'), 'utf8'),
    /KASI/u,
  );
  assert.match(readFileSync(join(packageRoot, 'NOTICE.md'), 'utf8'), /Copyright 2026 Jaesang Lee/u);
  assert.deepEqual(Object.keys(packageJson.exports).sort(), [
    '.',
    './advanced',
    './calendar',
    './package.json',
    './timing',
  ]);
  const removedDistEntries = readdirSync(join(packageRoot, 'dist')).filter((path) =>
    /^(?:legacy|interpretation|ai|agent)(?:\.|$)/u.test(path),
  );
  assert.deepEqual(
    removedDistEntries,
    [],
    'The packed calculation core must not contain interpretation, AI, or agent entries.',
  );

  symlinkSync(join(projectRoot, 'node_modules'), join(packageRoot, 'node_modules'), 'dir');
  const root = await import(pathToFileURL(join(packageRoot, 'dist/index.js')));
  assert.equal(root.ENGINE_MANIFEST.engine.version, packageJson.version);
  assert.equal(Object.hasOwn(root.ENGINE_MANIFEST, 'interpretation'), false);

  const smokeScript = String.raw`
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    import {
      calculateSaju,
      calculateSajuPossibilities,
      ENGINE_MANIFEST,
    } from 'saju-engine';
    import { resolveBirthInstant } from 'saju-engine/advanced';
    import { getLunarMonthInfo, solarToLunar } from 'saju-engine/calendar';
    import { calculateSajuDailyTransit, calculateSajuTiming } from 'saju-engine/timing';

    const request = {
      birth: {
        date: { calendar: 'gregorian', year: 1996, month: 5, day: 27 },
        time: { hour: 6, minute: 50 },
        timeZone: 'Asia/Seoul',
      },
    };
    assert.deepEqual(
      Object.values(calculateSaju(request).pillars).map(({ korean }) => korean),
      ['병자', '계사', '갑자', '정묘'],
    );
    const possibilities = calculateSajuPossibilities({
      birth: {
        date: { calendar: 'gregorian', year: 1996, month: 5, day: 27 },
        time: { kind: 'unknown', reason: 'asked-unknown' },
        timeZone: 'Asia/Seoul',
      },
    });
    assert.equal(possibilities.hourPillar, 'omitted');
    assert.equal(possibilities.stablePillars.day.korean, '갑자');
    assert.deepEqual(solarToLunar(1997, 2, 8), {
      year: 1997,
      month: 1,
      day: 1,
      isLeapMonth: false,
    });
    assert.deepEqual(getLunarMonthInfo(2023, 2).leap, {
      isLeapMonth: true,
      dayCount: 29,
      firstSolarDate: { year: 2023, month: 3, day: 22 },
      lastSolarDate: { year: 2023, month: 4, day: 19 },
    });
    assert.equal(resolveBirthInstant({
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
    }).offsetSeconds, 30472);
    const timingResult = calculateSajuTiming({
      natalRequest: request,
      fromYear: 2026,
      throughYear: 2026,
      gender: 'female',
      luckPillarCount: 3,
    });
    assert.equal(timingResult.years[0].months.length, 12);
    assert.equal(timingResult.years[0].annualPillar.pillar.korean, '병오');
    assert.deepEqual(
      timingResult.years[0].months.map(({ pillar }) => pillar.korean),
      ['경인', '신묘', '임진', '계사', '갑오', '을미', '병신', '정유', '무술', '기해', '경자', '신축'],
    );
    assert.equal(timingResult.luckPillars.pillars.length, 3);
    assert.equal(typeof timingResult.luckPillars.pillars[0].tenGods.stem, 'string');
    const dailyTransit = calculateSajuDailyTransit({
      natalRequest: request,
      date: { calendar: 'gregorian', year: 2026, month: 6, day: 28 },
    });
    assert.equal(dailyTransit.pillars.year.korean, '병오');
    assert.equal(dailyTransit.pillars.day.korean, '계유');
    assert.equal(dailyTransit.representative.policy, 'local-civil-noon');
    assert.equal(Object.isFrozen(dailyTransit), true);
    assert.equal(Object.hasOwn(ENGINE_MANIFEST, 'interpretation'), false);

    const require = createRequire(import.meta.url);
    const cjsRoot = require('saju-engine');
    const cjsAdvanced = require('saju-engine/advanced');
    const cjsCalendar = require('saju-engine/calendar');
    const cjsTiming = require('saju-engine/timing');
    assert.deepEqual(cjsRoot.calculateSaju(request), calculateSaju(request));
    assert.deepEqual(cjsCalendar.solarToLunar(1997, 2, 8), solarToLunar(1997, 2, 8));
    assert.equal(cjsAdvanced.resolveBirthInstant({
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
    }).offsetSeconds, 30472);
    assert.deepEqual(
      cjsTiming.calculateSajuTiming({
        natalRequest: request,
        fromYear: 2026,
        throughYear: 2026,
        gender: 'female',
        luckPillarCount: 3,
      }),
      timingResult,
    );
    assert.deepEqual(
      cjsTiming.calculateSajuDailyTransit({
        natalRequest: request,
        date: { calendar: 'gregorian', year: 2026, month: 6, day: 28 },
      }),
      dailyTransit,
    );
    assert.equal(Object.hasOwn(cjsRoot.ENGINE_MANIFEST, 'interpretation'), false);

    for (const subpath of [
      'saju-engine/legacy',
      'saju-engine/interpretation',
      'saju-engine/ai',
      'saju-engine/agent',
    ]) {
      await assert.rejects(import(subpath), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
      assert.throws(() => require(subpath), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
    }
  `;
  run(process.execPath, ['--input-type=module', '--eval', smokeScript], {
    cwd: packageRoot,
  });

  const archiveSha256 = createHash('sha256').update(readFileSync(archivePath)).digest('hex');
  console.log(`Packed artifact verified: ${basename(archivePath)} sha256=${archiveSha256}`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
