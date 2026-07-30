/** Public deterministic presentation tests. */
import { describe, expect, test } from 'vitest';
import {
  prepareOhMySajuReading,
  renderOhMySajuCompact,
  renderOhMySajuMarkdown,
} from '../application';

const EXACT_REQUEST = {
  calculation: {
    kind: 'exact' as const,
    request: {
      birth: {
        date: { calendar: 'gregorian' as const, year: 1996, month: 5, day: 27 },
        time: { hour: 6, minute: 50 },
        timeZone: 'Asia/Seoul',
      },
      rules: {
        ziHourPolicy: 'ziStart' as const,
        dayHourClock: {
          kind: 'local-apparent-solar' as const,
          longitudeDegreesEast: 126.978,
          equationOfTime: 'apply' as const,
        },
      },
    },
  },
  question: '계산 사실과 계파별 판정을 구분해서 보여줘.',
};

describe('Oh My Saju deterministic presentation', () => {
  test('정확한 명식과 선택한 세운·월운·대운을 LLM 친화적 compact와 Markdown으로 렌더링한다', () => {
    const prepared = prepareOhMySajuReading({
      command: 'prepare-reading',
      request: EXACT_REQUEST,
      timing: {
        fromYear: 2026,
        throughYear: 2026,
        gender: 'female',
        luckPillarCount: 3,
      },
    });

    const compact = renderOhMySajuCompact(prepared);
    const markdown = renderOhMySajuMarkdown(prepared);
    const firstLuck = prepared.timing?.luckPillars?.pillars[0];
    const growthStage = prepared.analysis.baseline.interpretation.findings.find(
      ({ ruleId }) => ruleId === 'core.growth-stages',
    );
    const exact = prepared.analysis.calculation;
    const packResults = [prepared.analysis.baseline, ...prepared.analysis.doctrines];
    const findingIds = packResults.flatMap(({ interpretation }) =>
      interpretation.findings.map(({ id }) => id),
    );

    expect(renderOhMySajuCompact(prepared)).toBe(compact);
    expect(renderOhMySajuMarkdown(prepared)).toBe(markdown);
    expect(firstLuck).toBeDefined();
    expect(growthStage).toBeDefined();
    if (firstLuck === undefined || growthStage === undefined) return;
    expect(compact).toContain(
      `출생|입력달력=양력|양력=1996-05-27|한국음력=${exact.chronology.koreanLunarDate.year}-${String(
        exact.chronology.koreanLunarDate.month,
      ).padStart(2, '0')}-${String(exact.chronology.koreanLunarDate.day).padStart(2, '0')}(${
        exact.chronology.koreanLunarDate.monthKind === 'leap' ? '윤달' : '평달'
      })`,
    );
    expect(compact).toContain('원국|년=병자|월=계사|일=갑자|시=정묘');
    expect(compact).toContain('일간|전체:갑(甲)/양/목');
    expect(compact).toContain('십신(지지=본기)|');
    expect(compact).toContain('오행(합성가중치;신강·신약 아님)|');
    expect(compact).toContain('음양|전체:양=');
    expect(compact).toContain('지장간|전체:년=');
    expect(compact).toContain('공망|술·해');
    expect(compact).toContain('Pack 판정|');
    expect(compact).toContain('세운|2026=');
    expect(compact).toContain('절월|2026=');
    expect(compact).toContain('대운(근사)|');
    expect(prepared.timing?.luckPillars?.pillars).toHaveLength(3);
    expect(compact).toContain(
      `${firstLuck.age}세:${firstLuck.pillar.korean}(${firstLuck.tenGods.stem}/${firstLuck.tenGods.branch})@약${firstLuck.approximateStartDate.date}`,
    );
    expect(compact).toContain(`십이운성|profile=${String(growthStage.values.profileId)}`);
    const stages = growthStage.values.stages;
    expect(typeof stages).toBe('object');
    expect(stages).not.toBeNull();
    if (typeof stages !== 'object' || stages === null || Array.isArray(stages)) return;
    for (const [position, value] of Object.entries(stages)) {
      expect(typeof value).toBe('object');
      expect(value).not.toBeNull();
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return;
      expect(compact).toContain(
        `${position === 'year' ? '년' : position === 'month' ? '월' : position === 'day' ? '일' : '시'}=${String(value.branch)}/${String(value.stage)}`,
      );
    }
    expect(compact).toContain(
      `규칙|자시정책=ziStart|일·시계=local-apparent-solar|경도=126.978°E|균시차=apply`,
    );
    expect(compact).toContain(`일시기준=${exact.chronology.dayHourDateTime}`);
    expect(compact).toContain(
      `태양시보정=경도환산${exact.chronology.solarTimeCorrection?.longitudeSeconds}s;균시차${exact.chronology.solarTimeCorrection?.equationOfTimeSeconds}s;민간시차총${exact.chronology.solarTimeCorrection?.totalDifferenceFromCivilSeconds}s`,
    );
    expect(compact).toContain(
      `시각감사|UTC=${exact.chronology.instantUtc}|offset=${exact.chronology.offsetSeconds}s|약어=${exact.chronology.timeZoneAbbreviation}`,
    );
    expect(compact).toContain(`중복시각해소=${exact.chronology.disambiguation}`);
    const year = prepared.timing?.years[0];
    expect(year).toBeDefined();
    if (year === undefined) return;
    expect(compact).toContain(
      `@[${year.start.localDateTime}±${year.start.uncertaintyMilliseconds}ms,${year.end.localDateTime}±${year.end.uncertaintyMilliseconds}ms)`,
    );
    const firstMonth = year.months[0];
    expect(firstMonth).toBeDefined();
    if (firstMonth === undefined) return;
    expect(compact).toContain(
      `@[${firstMonth.start.name} ${firstMonth.start.localDateTime}±${firstMonth.start.uncertaintyMilliseconds}ms,${firstMonth.end.name} ${firstMonth.end.localDateTime}±${firstMonth.end.uncertaintyMilliseconds}ms)`,
    );

    expect(markdown).toContain('# 오 마이 사주 계산 보고서');
    expect(markdown).toContain('입력달력=양력');
    expect(markdown).toContain('양력=1996-05-27');
    expect(markdown).toContain('한국음력=');
    expect(markdown).toContain('## 원국');
    expect(markdown).toContain('| 기둥 | 천간 | 지지 | 십신(천간) | 십신(지지 본기) |');
    expect(markdown).toContain('## 일간·음양');
    expect(markdown).toContain('## 지장간');
    expect(markdown).toContain('| 기둥 | 지장간(가중치/십신) |');
    expect(markdown).toContain('## 오행 분포');
    expect(markdown).toContain('합성 가중치 표시이며 신강·신약 판정이 아닙니다.');
    expect(markdown).toContain('## 십이운성');
    expect(markdown).toContain(`- 프로필: \`${String(growthStage.values.profileId)}\``);
    expect(markdown).toContain('## Tradition Pack 판정');
    expect(markdown).toContain('## 학파 비교');
    expect(markdown).toContain(`- UTC 순간: \`${exact.chronology.instantUtc}\``);
    expect(markdown).toContain(`- 중복 시각 해소: \`${exact.chronology.disambiguation}\``);
    expect(markdown).toContain('## 세운·절월');
    expect(markdown).toContain('경계 불확실성');
    expect(markdown).toContain('### 대운(근사)');
    expect(markdown).toContain('| 나이 | 대운 | 십신(천간/지지) | 근사 시작일 |');
    expect(markdown).toContain(
      `| ${firstLuck.age} | ${firstLuck.pillar.korean}(${firstLuck.pillar.hanja}) | ${firstLuck.tenGods.stem}/${firstLuck.tenGods.branch} | 약 ${firstLuck.approximateStartDate.date} |`,
    );
    expect(markdown).toContain('해석·길흉을 추가하지 않은 결정론적 계산 표시');

    for (const findingId of findingIds) {
      expect(compact).toContain(findingId);
      expect(markdown).toContain(`\`${findingId}\``);
    }
    for (const row of prepared.analysis.comparison.rows) {
      expect(compact).toContain(
        `학파비교|${row.id}|concept=${row.conceptId}|topic=${row.topic}|status=${row.status}|stability=${row.stability}`,
      );
      expect(markdown).toContain(`\`${row.id}\``);
      expect(markdown).toContain(`\`${row.status}\``);
      for (const profile of row.profiles) {
        for (const findingId of profile.findingIds) {
          expect(compact).toContain(findingId);
          expect(markdown).toContain(findingId);
        }
      }
    }

    expect(compact.length).toBeLessThan(markdown.length * 0.75);
    for (const output of [compact, markdown]) {
      expect(output).not.toContain('[object Object]');
      expect(output).not.toContain('undefined');
      expect(output).not.toContain('확률=true');
      expect(output).not.toContain('확률로 환산');
    }
  });

  test('생시 미상은 정오를 만들지 않고 시주 제외와 부분 coverage를 명시한다', () => {
    const prepared = prepareOhMySajuReading({
      command: 'prepare-reading',
      request: {
        calculation: {
          kind: 'possibilities',
          request: {
            birth: {
              date: { calendar: 'gregorian', year: 1996, month: 5, day: 27 },
              time: { kind: 'unknown' },
              timeZone: 'Asia/Seoul',
              expectedOffsetSeconds: 32_400,
              timeEvidence: {
                source: 'family-memory',
                originalText: '출력하면 안 되는 개인정보 원문',
                conflict: 'multiple-sources',
              },
            },
            rules: {
              ziHourPolicies: 'all',
              dayHourClock: {
                kind: 'local-apparent-solar',
                longitudeDegreesEast: 126.978,
                equationOfTime: 'omit',
              },
            },
          },
        },
      },
    });

    const compact = renderOhMySajuCompact(prepared);
    const markdown = renderOhMySajuMarkdown(prepared);

    expect(compact).toContain('계산유형|생시 가능성');
    expect(compact).toContain('원국|년=병자|월=계사|일=후보별|시=미상(제외)');
    expect(compact).toContain('원국후보|chart-2|년=병자|월=계사|일=갑자|시=미상(제외)');
    expect(compact).toContain(
      '시간근거|예상offset=32400s|출처=family-memory|상충=multiple-sources',
    );
    expect(compact).toContain('지원시간=');
    expect(compact).toContain('확률 아님');
    expect(compact).toContain('후보구간|');
    expect(compact).toContain('|자시정책=');
    expect(compact).toContain('|UTC=[');
    expect(compact).toContain('|근거=');
    expect(compact).toContain('불확실성|생시 미상');
    expect(compact).toContain('[부분:시 제외]');
    expect(compact).toContain(
      '규칙|자시정책=civilMidnight,ziStart,splitZi|일·시계=local-apparent-solar|경도=126.978°E|균시차=omit',
    );
    expect(compact).toContain('일시기준=후보 범위');
    expect(compact).toContain('태양시보정=후보 범위별 적용(단일값 없음)');
    expect(compact).toContain('지장간|');
    expect(compact).toContain('십이운성|profile=');
    expect(markdown).toContain('생시 미상');
    expect(markdown).toContain('시주는 계산에서 제외');
    expect(markdown).toContain('| 시 | 미상(제외) | 미상(제외) | 미정 | 미정 |');
    expect(markdown).toContain('부분 (시 제외)');
    expect(markdown).toContain('### 원국 후보');
    expect(markdown).toContain('#### 후보 지원 구간');
    expect(markdown).toContain('지원 시간(ms, 확률 아님)');
    expect(markdown).toContain('출처=`family-memory`, 상충=`multiple-sources`');
    expect(markdown).toContain('자시 정책: `civilMidnight`, `ziStart`, `splitZi`');
    expect(markdown).toContain('진태양시 보정은 후보 범위별로 적용되며 단일 보정값이 없습니다.');
    expect(markdown).toContain('| 시 | 미상(제외) |');
    expect(markdown).not.toContain('정오');
    expect(compact).not.toContain('출력하면 안 되는 개인정보 원문');
    expect(markdown).not.toContain('출력하면 안 되는 개인정보 원문');
  });

  test('음력 입력을 중복하지 않고 정규화된 양력과 한국음력을 함께 표시한다', () => {
    const prepared = prepareOhMySajuReading({
      command: 'prepare-reading',
      request: {
        calculation: {
          kind: 'exact',
          request: {
            birth: {
              date: {
                calendar: 'korean-lunar',
                year: 1992,
                month: 9,
                day: 29,
                monthKind: 'regular',
              },
              time: { hour: 5, minute: 30 },
              timeZone: 'Asia/Seoul',
            },
          },
        },
      },
    });

    const compact = renderOhMySajuCompact(prepared);
    const markdown = renderOhMySajuMarkdown(prepared);

    expect(compact).toContain(
      '출생|입력달력=한국음력(평달)|양력=1992-10-24|한국음력=1992-09-29(평달)',
    );
    expect(markdown).toContain('입력달력=한국음력(평달)');
    expect(markdown).toContain('양력=1992-10-24');
    expect(markdown).toContain('한국음력=1992-09-29(평달)');
    expect(compact.match(/한국음력=1992-09-29\(평달\)/gu)).toHaveLength(1);
  });
});
