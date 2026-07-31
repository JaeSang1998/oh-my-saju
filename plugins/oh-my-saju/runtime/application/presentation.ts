/** Deterministic, provider-neutral presentation of a prepared reading. */
import type {
  EarthlyBranch,
  FiveElement,
  Pillar,
  PillarReport,
  SajuBirthDate,
  SajuPillarName,
  TenGod,
  YinYang,
} from 'saju-engine';
import {
  analyzeKnownPillarStructure,
  type KnownPillarStructuralAnalysis,
  type StructuralAnalysis,
} from 'saju-engine/advanced';
import type { SajuTimingReport } from 'saju-engine/timing';
import { SAJU_TOPIC_TITLES } from '../reading/output-contract';
import type {
  InterpretationFinding,
  InterpretationTopic,
  JsonValue,
  TraditionPackResult,
} from '../traditions/types';
import type { PreparedOhMySajuReading } from './types';

const POSITIONS = [
  { id: 'year', label: '년' },
  { id: 'month', label: '월' },
  { id: 'day', label: '일' },
  { id: 'hour', label: '시' },
] as const satisfies readonly {
  readonly id: SajuPillarName;
  readonly label: string;
}[];

const ELEMENTS = ['목', '화', '토', '금', '수'] as const satisfies readonly FiveElement[];

const TOPICS = [
  'chart-overview',
  'day-master',
  'five-elements',
  'yin-yang',
  'ten-gods',
  'relationships',
  'void-branches',
  'growth-stages',
  'strength',
  'pattern',
  'useful-god',
  'luck-cycles',
  'symbolic-stars',
  'compatibility',
  'timing',
] as const satisfies readonly InterpretationTopic[];

const PRESENTED_CORE_RULES = new Set<string>([
  'core.day-master',
  'core.pillar-year',
  'core.pillar-month',
  'core.pillar-day',
  'core.pillar-hour',
  'core.element-balance',
  'core.yin-yang-balance',
  'core.ten-gods',
  'core.relationships',
  'core.growth-stages',
  'core.void-branches',
]);

type PositionMap<T> = Readonly<Partial<Record<SajuPillarName, T>>>;

interface TenGodPair {
  readonly stem: string;
  readonly branch: string;
}

interface TenGodView {
  readonly label: string;
  readonly values: PositionMap<TenGodPair>;
  readonly finding: InterpretationFinding | null;
}

interface ElementView {
  readonly label: string;
  readonly percentages: Readonly<Partial<Record<FiveElement, number>>>;
  readonly scores: Readonly<Partial<Record<FiveElement, number>>>;
  readonly finding: InterpretationFinding | null;
}

interface DayMasterView {
  readonly label: string;
  readonly stem: string;
  readonly hanja: string;
  readonly element: FiveElement;
  readonly yinYang: YinYang;
  readonly finding: InterpretationFinding | null;
}

interface YinYangView {
  readonly label: string;
  readonly counts: Readonly<Partial<Record<YinYang, number>>>;
  readonly percentages: Readonly<Partial<Record<YinYang, number>>>;
  readonly finding: InterpretationFinding | null;
}

interface HiddenStemValue {
  readonly stem: string;
  readonly weight: number;
  readonly tenGod: TenGod;
}

interface HiddenStemView {
  readonly label: string;
  readonly values: PositionMap<readonly HiddenStemValue[]>;
  readonly omittedPillars: readonly SajuPillarName[];
}

interface GrowthStageValue {
  readonly branch: EarthlyBranch;
  readonly stage: string;
}

interface GrowthStageView {
  readonly label: string;
  readonly profileId: string;
  readonly dayStem: string;
  readonly values: PositionMap<GrowthStageValue>;
  readonly finding: InterpretationFinding;
}

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function compactText(value: string): string {
  return value.replace(/\s+/gu, ' ').replaceAll('|', '/').trim();
}

function markdownText(value: string): string {
  return value.replace(/\s+/gu, ' ').replaceAll('|', '\\|').trim();
}

function isRecord(value: JsonValue | undefined): value is Readonly<Record<string, JsonValue>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: JsonValue | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: JsonValue | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function packResults(reading: PreparedOhMySajuReading): readonly TraditionPackResult[] {
  return [reading.analysis.baseline, ...reading.analysis.doctrines];
}

function sortedFindings(result: TraditionPackResult): readonly InterpretationFinding[] {
  return [...result.interpretation.findings].sort((left, right) => {
    const topicOrder = TOPICS.indexOf(left.topic) - TOPICS.indexOf(right.topic);
    if (topicOrder !== 0) return topicOrder;
    const ruleOrder = compareText(left.ruleId, right.ruleId);
    return ruleOrder === 0 ? compareText(left.id, right.id) : ruleOrder;
  });
}

function baselineFindings(
  reading: PreparedOhMySajuReading,
  ruleId: string,
): readonly InterpretationFinding[] {
  return sortedFindings(reading.analysis.baseline).filter((finding) => finding.ruleId === ruleId);
}

function findingQualifier(finding: InterpretationFinding): string {
  const qualifiers: string[] = [];
  if (finding.stability === 'candidate-dependent') qualifiers.push('후보별');
  if (finding.coverage === 'partial') {
    const omitted = finding.omittedPillars.map(positionLabel).join('·');
    qualifiers.push(`부분:${omitted} 제외`);
  }
  return qualifiers.length === 0 ? '' : ` [${qualifiers.join(',')}]`;
}

function findingCoverage(finding: InterpretationFinding): string {
  if (finding.coverage === 'complete') return '완전';
  return `부분 (${finding.omittedPillars.map(positionLabel).join('·')} 제외)`;
}

function findingStability(finding: InterpretationFinding, candidateCount: number): string {
  return finding.stability === 'stable'
    ? '고정'
    : `후보별 (${finding.candidateIds.length}/${candidateCount})`;
}

function positionLabel(position: SajuPillarName): string {
  return POSITIONS.find(({ id }) => id === position)?.label ?? position;
}

function pillarCell(
  pillar: PillarReport | null,
  position: SajuPillarName,
  hourPillar: 'known' | 'candidate' | 'omitted',
): string {
  if (pillar !== null) return pillar.korean;
  if (position === 'hour' && hourPillar === 'omitted') return '미상(제외)';
  return '후보별';
}

function exactTenGodViews(reading: PreparedOhMySajuReading): readonly TenGodView[] {
  if (reading.analysis.calculationKind !== 'exact') return [];
  const values = reading.analysis.calculation.facts.tenGods;
  return [
    {
      label: '전체',
      finding: null,
      values: {
        year: values.year,
        month: values.month,
        day: values.day,
        hour: values.hour,
      },
    },
  ];
}

function tenGodPair(value: JsonValue | undefined): TenGodPair | null {
  if (!isRecord(value)) return null;
  const stem = asString(value.stem);
  const branch = asString(value.branch);
  return stem === null || branch === null ? null : { stem, branch };
}

function possibilityTenGodViews(reading: PreparedOhMySajuReading): readonly TenGodView[] {
  if (reading.analysis.calculationKind !== 'possibilities') return [];
  return baselineFindings(reading, 'core.ten-gods').map((finding) => {
    const values: Partial<Record<SajuPillarName, TenGodPair>> = {};
    for (const { id } of POSITIONS) {
      const pair = tenGodPair(finding.values[id]);
      if (pair !== null) values[id] = pair;
    }
    return {
      label:
        finding.stability === 'stable'
          ? '공통'
          : `후보 ${finding.candidateIds.join(',') || '미상'}`,
      values,
      finding,
    };
  });
}

function tenGodViews(reading: PreparedOhMySajuReading): readonly TenGodView[] {
  return reading.analysis.calculationKind === 'exact'
    ? exactTenGodViews(reading)
    : possibilityTenGodViews(reading);
}

function exactElementViews(reading: PreparedOhMySajuReading): readonly ElementView[] {
  if (reading.analysis.calculationKind !== 'exact') return [];
  const balance = reading.analysis.calculation.facts.structure.elementBalance;
  return [
    {
      label: '전체',
      percentages: balance.percentages,
      scores: balance.scores,
      finding: null,
    },
  ];
}

function numberMap(value: JsonValue | undefined): Readonly<Partial<Record<FiveElement, number>>> {
  if (!isRecord(value)) return {};
  const result: Partial<Record<FiveElement, number>> = {};
  for (const element of ELEMENTS) {
    const number = asNumber(value[element]);
    if (number !== null) result[element] = number;
  }
  return result;
}

function possibilityElementViews(reading: PreparedOhMySajuReading): readonly ElementView[] {
  if (reading.analysis.calculationKind !== 'possibilities') return [];
  return baselineFindings(reading, 'core.element-balance').map((finding) => ({
    label: finding.stability === 'stable' ? '공통 소계' : `후보 ${finding.candidateIds.join(',')}`,
    percentages: numberMap(finding.values.percentages),
    scores: numberMap(finding.values.scores),
    finding,
  }));
}

function elementViews(reading: PreparedOhMySajuReading): readonly ElementView[] {
  return reading.analysis.calculationKind === 'exact'
    ? exactElementViews(reading)
    : possibilityElementViews(reading);
}

function findingViewLabel(finding: InterpretationFinding): string {
  return finding.stability === 'stable'
    ? '공통'
    : `후보 ${finding.candidateIds.join(',') || '미상'}`;
}

function dayMasterViews(reading: PreparedOhMySajuReading): readonly DayMasterView[] {
  if (reading.analysis.calculationKind === 'exact') {
    const stem = reading.analysis.calculation.facts.dayMaster;
    return [
      {
        label: '전체',
        stem: stem.korean,
        hanja: stem.hanja,
        element: stem.element,
        yinYang: stem.yinYang,
        finding: null,
      },
    ];
  }
  return baselineFindings(reading, 'core.day-master').flatMap((finding) => {
    const stem = asString(finding.values.stem);
    const hanja = asString(finding.values.hanja);
    const element = asString(finding.values.element);
    const yinYang = asString(finding.values.yinYang);
    if (
      stem === null ||
      hanja === null ||
      !ELEMENTS.includes(element as FiveElement) ||
      !['양', '음'].includes(yinYang ?? '')
    ) {
      return [];
    }
    return [
      {
        label: findingViewLabel(finding),
        stem,
        hanja,
        element: element as FiveElement,
        yinYang: yinYang as YinYang,
        finding,
      },
    ];
  });
}

function yinYangNumberMap(
  value: JsonValue | undefined,
): Readonly<Partial<Record<YinYang, number>>> {
  if (!isRecord(value)) return {};
  const result: Partial<Record<YinYang, number>> = {};
  for (const yinYang of ['양', '음'] as const) {
    const number = asNumber(value[yinYang]);
    if (number !== null) result[yinYang] = number;
  }
  return result;
}

function yinYangViews(reading: PreparedOhMySajuReading): readonly YinYangView[] {
  if (reading.analysis.calculationKind === 'exact') {
    const balance = reading.analysis.calculation.facts.structure.yinYangBalance;
    return [
      {
        label: '전체',
        counts: balance.counts,
        percentages: balance.percentages,
        finding: null,
      },
    ];
  }
  return baselineFindings(reading, 'core.yin-yang-balance').map((finding) => ({
    label: findingViewLabel(finding),
    counts: yinYangNumberMap(finding.values.counts),
    percentages: yinYangNumberMap(finding.values.percentages),
    finding,
  }));
}

function toPillar(report: PillarReport): Pillar {
  return {
    heavenlyStem: report.stem.korean,
    earthlyBranch: report.branch.korean,
  };
}

function hiddenStemValues(
  structure: StructuralAnalysis | KnownPillarStructuralAnalysis,
): PositionMap<readonly HiddenStemValue[]> {
  const values: Partial<Record<SajuPillarName, readonly HiddenStemValue[]>> = {};
  for (const { id } of POSITIONS) {
    const hidden = structure.hiddenStems[id];
    if (hidden !== undefined) {
      values[id] = hidden.map(({ stem, weight, tenGod }) => ({ stem, weight, tenGod }));
    }
  }
  return values;
}

function hiddenStemViews(reading: PreparedOhMySajuReading): readonly HiddenStemView[] {
  if (reading.analysis.calculationKind === 'exact') {
    return [
      {
        label: '전체',
        values: hiddenStemValues(reading.analysis.calculation.facts.structure),
        omittedPillars: [],
      },
    ];
  }
  return reading.analysis.calculation.candidates.map((candidate) => {
    const pillars: Partial<Record<SajuPillarName, Pillar>> = {
      year: toPillar(candidate.pillars.year),
      month: toPillar(candidate.pillars.month),
      day: toPillar(candidate.pillars.day),
      ...(candidate.pillars.hour === null ? {} : { hour: toPillar(candidate.pillars.hour) }),
    };
    const structure = analyzeKnownPillarStructure(pillars);
    return {
      label: `후보 ${candidate.id}`,
      values: hiddenStemValues(structure),
      omittedPillars: structure.omittedPillars,
    };
  });
}

function growthStageValue(value: JsonValue | undefined): GrowthStageValue | null {
  if (!isRecord(value)) return null;
  const branch = asString(value.branch);
  const stage = asString(value.stage);
  if (branch === null || stage === null) return null;
  return { branch: branch as EarthlyBranch, stage };
}

function growthStageViews(reading: PreparedOhMySajuReading): readonly GrowthStageView[] {
  return baselineFindings(reading, 'core.growth-stages').flatMap((finding) => {
    const profileId = asString(finding.values.profileId);
    const dayStem = asString(finding.values.dayStem);
    const stages = finding.values.stages;
    if (profileId === null || dayStem === null || !isRecord(stages)) return [];
    const values: Partial<Record<SajuPillarName, GrowthStageValue>> = {};
    for (const { id } of POSITIONS) {
      const stage = growthStageValue(stages[id]);
      if (stage !== null) values[id] = stage;
    }
    return [
      {
        label: findingViewLabel(finding),
        profileId,
        dayStem,
        values,
        finding,
      },
    ];
  });
}

function formatTenGods(view: TenGodView): string {
  const values = POSITIONS.flatMap(({ id, label }) => {
    const pair = view.values[id];
    return pair === undefined ? [] : [`${label}=${pair.stem}/${pair.branch}`];
  });
  return `${compactText(view.label)}:${values.join(',')}${
    view.finding === null ? '' : findingQualifier(view.finding)
  }`;
}

function formatElements(view: ElementView): string {
  const values = ELEMENTS.flatMap((element) => {
    const percentage = view.percentages[element];
    return percentage === undefined ? [] : [`${element}=${percentage}%`];
  });
  return `${compactText(view.label)}:${values.join(',')}${
    view.finding === null ? '' : findingQualifier(view.finding)
  }`;
}

function formatDayMaster(view: DayMasterView): string {
  return `${compactText(view.label)}:${view.stem}(${view.hanja})/${view.yinYang}/${view.element}${
    view.finding === null ? '' : findingQualifier(view.finding)
  }`;
}

function formatYinYang(view: YinYangView): string {
  const values = (['양', '음'] as const).map((yinYang) => {
    const count = view.counts[yinYang];
    const percentage = view.percentages[yinYang];
    return `${yinYang}=${count ?? '미정'}(${percentage ?? '미정'}%)`;
  });
  return `${compactText(view.label)}:${values.join(',')}${
    view.finding === null ? '' : findingQualifier(view.finding)
  }`;
}

function hiddenStemQualifier(view: HiddenStemView): string {
  return view.omittedPillars.length === 0
    ? ''
    : ` [부분:${view.omittedPillars.map(positionLabel).join('·')} 제외]`;
}

function formatHiddenStems(view: HiddenStemView): string {
  const values = POSITIONS.flatMap(({ id, label }) => {
    const hidden = view.values[id];
    return hidden === undefined
      ? []
      : [
          `${label}=${hidden
            .map(({ stem, weight, tenGod }) => `${stem}@${weight}/${tenGod}`)
            .join('+')}`,
        ];
  });
  return `${compactText(view.label)}:${values.join(',')}${hiddenStemQualifier(view)}`;
}

function formatGrowthStages(view: GrowthStageView): string {
  const values = POSITIONS.flatMap(({ id, label }) => {
    const stage = view.values[id];
    return stage === undefined ? [] : [`${label}=${stage.branch}/${stage.stage}`];
  });
  return `${compactText(view.label)}:일간=${view.dayStem};${values.join(',')}${findingQualifier(
    view.finding,
  )}`;
}

function voidBranches(reading: PreparedOhMySajuReading): string {
  if (reading.analysis.calculationKind === 'exact') {
    return reading.analysis.calculation.facts.voidBranches.join('·');
  }
  const findings = baselineFindings(reading, 'core.void-branches');
  return findings
    .map((finding) => {
      const branches = finding.values.branches;
      const label = Array.isArray(branches)
        ? branches.filter((branch): branch is string => typeof branch === 'string').join('·')
        : compactText(finding.statement);
      return `${label}${findingQualifier(finding)}`;
    })
    .join(';');
}

function relationshipStatements(reading: PreparedOhMySajuReading): readonly string[] {
  return baselineFindings(reading, 'core.relationships').map(
    (finding) => `${compactText(finding.statement)}${findingQualifier(finding)}`,
  );
}

function formatDateValue(date: Pick<SajuBirthDate, 'year' | 'month' | 'day'>): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function inputCalendarLabel(date: SajuBirthDate): string {
  if (date.calendar === 'gregorian') return '양력';
  return `한국음력(${date.monthKind === 'leap' ? '윤달' : '평달'})`;
}

function normalizedBirthDates(reading: PreparedOhMySajuReading): {
  readonly input: SajuBirthDate;
  readonly gregorian: Pick<SajuBirthDate, 'year' | 'month' | 'day'>;
  readonly lunar: {
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly monthKind: 'regular' | 'leap';
  } | null;
} {
  if (reading.analysis.calculationKind === 'exact') {
    const chronology = reading.analysis.calculation.chronology;
    return {
      input: chronology.inputDate,
      gregorian: chronology.gregorianDate,
      lunar: chronology.koreanLunarDate,
    };
  }
  const input = reading.analysis.calculation.input;
  return {
    input: input.date,
    gregorian: input.gregorianDate,
    lunar: input.date.calendar === 'korean-lunar' ? input.date : null,
  };
}

function compactNormalizedDates(reading: PreparedOhMySajuReading): string {
  const dates = normalizedBirthDates(reading);
  return [
    `입력달력=${inputCalendarLabel(dates.input)}`,
    `양력=${formatDateValue(dates.gregorian)}`,
    dates.lunar === null
      ? '한국음력=가능성 계산 보고서에 미포함'
      : `한국음력=${formatDateValue(dates.lunar)}(${
          dates.lunar.monthKind === 'leap' ? '윤달' : '평달'
        })`,
  ].join('|');
}

function uncertaintyLines(reading: PreparedOhMySajuReading): readonly string[] {
  if (reading.analysis.calculationKind === 'exact') return [];
  const report = reading.analysis.calculation;
  if (report.hourPillar === 'omitted') {
    return [
      '생시 미상; 시주는 계산에서 제외; 삼주 소계와 부분 판정은 완전한 사주 전체 결과가 아님',
    ];
  }
  return [
    `입력 시간 범위·자시 정책·절기 소스의 불확실성에 따라 원국 후보 ${report.candidates.length}개가 성립; 지원 시간 길이는 확률이 아님`,
  ];
}

function compactBirthLine(reading: PreparedOhMySajuReading): string {
  if (reading.analysis.calculationKind === 'exact') {
    const chronology = reading.analysis.calculation.chronology;
    return [
      `출생|${compactNormalizedDates(reading)}`,
      `민간시=${chronology.civilDateTime}`,
      `시간대=${chronology.timeZone}`,
    ].join('|');
  }
  const input = reading.analysis.calculation.input;
  const time =
    input.time.kind === 'unknown'
      ? '생시 미상'
      : input.time.kind === 'day-period'
        ? input.time.period === 'am'
          ? '오전 범위'
          : '오후 범위'
        : input.time.kind === 'approximate'
          ? `약 ${String(input.time.time.hour).padStart(2, '0')}:${String(
              input.time.time.minute,
            ).padStart(2, '0')} ±${input.time.toleranceMinutes}분`
          : `${String(input.time.startInclusive.hour).padStart(2, '0')}:${String(
              input.time.startInclusive.minute,
            ).padStart(2, '0')}~${String(input.time.endExclusive.hour).padStart(2, '0')}:${String(
              input.time.endExclusive.minute,
            ).padStart(2, '0')}`;
  return `출생|${compactNormalizedDates(reading)}|민간시=${time}|시간대=${input.timeZone}`;
}

function compactConventionLine(reading: PreparedOhMySajuReading): string {
  if (reading.analysis.calculationKind === 'exact') {
    const report = reading.analysis.calculation;
    const rules = report.audit.rules;
    const correction = report.chronology.solarTimeCorrection;
    return [
      `규칙|자시정책=${rules.ziHourPolicy}`,
      `일·시계=${rules.dayHourClock}`,
      `경도=${rules.longitudeDegreesEast === null ? '해당없음' : `${rules.longitudeDegreesEast}°E`}`,
      `균시차=${rules.equationOfTime ?? '해당없음'}`,
      `일시기준=${report.chronology.dayHourDateTime}`,
      `태양시보정=${
        correction === null
          ? '없음'
          : `경도환산${correction.longitudeSeconds}s;균시차${correction.equationOfTimeSeconds}s;민간시차총${correction.totalDifferenceFromCivilSeconds}s`
      }`,
    ].join('|');
  }
  const report = reading.analysis.calculation;
  const rules = report.audit.rules;
  return [
    `규칙|자시정책=${rules.ziHourPolicies.join(',')}`,
    `일·시계=${rules.dayHourClock}`,
    `경도=${rules.longitudeDegreesEast === null ? '해당없음' : `${rules.longitudeDegreesEast}°E`}`,
    `균시차=${rules.equationOfTime ?? '해당없음'}`,
    `일시기준=후보 범위 ${report.coverage.startLocalDateTimeInclusive}~${report.coverage.endLocalDateTimeExclusive} ${report.coverage.intervalSemantics}`,
    `태양시보정=${
      rules.dayHourClock === 'local-apparent-solar' ? '후보 범위별 적용(단일값 없음)' : '없음'
    }`,
  ].join('|');
}

function compactChronologyLine(reading: PreparedOhMySajuReading): string | null {
  if (reading.analysis.calculationKind !== 'exact') return null;
  const chronology = reading.analysis.calculation.chronology;
  const daylightSaving = chronology.daylightSaving;
  return [
    '시각감사',
    `UTC=${chronology.instantUtc}`,
    `offset=${chronology.offsetSeconds}s`,
    `약어=${chronology.timeZoneAbbreviation}`,
    `DST=${daylightSaving.isDaylightSavingTime ?? '미확정'}`,
    `DST보정=${daylightSaving.offsetSeconds === null ? '미확정' : `${daylightSaving.offsetSeconds}s`}`,
    `중복시각해소=${chronology.disambiguation}`,
  ].join('|');
}

function compactPossibilityEvidenceLine(reading: PreparedOhMySajuReading): string | null {
  if (reading.analysis.calculationKind !== 'possibilities') return null;
  const input = reading.analysis.calculation.input;
  return [
    '시간근거',
    `예상offset=${input.expectedOffsetSeconds === null ? '없음' : `${input.expectedOffsetSeconds}s`}`,
    `출처=${input.timeEvidence?.source ?? '없음'}`,
    `상충=${input.timeEvidence?.conflict ?? '없음'}`,
  ].join('|');
}

function compactNatalLine(reading: PreparedOhMySajuReading): string {
  if (reading.analysis.calculationKind === 'exact') {
    const report = reading.analysis.calculation;
    return `원국|${POSITIONS.map(({ id, label }) => `${label}=${report.pillars[id].korean}`).join(
      '|',
    )}`;
  }
  const report = reading.analysis.calculation;
  return `원국|${POSITIONS.map(
    ({ id, label }) => `${label}=${pillarCell(report.stablePillars[id], id, report.hourPillar)}`,
  ).join('|')}`;
}

function compactCandidateLines(reading: PreparedOhMySajuReading): readonly string[] {
  if (reading.analysis.calculationKind !== 'possibilities') return [];
  const report = reading.analysis.calculation;
  return report.candidates.flatMap((candidate) => [
    [
      `원국후보|${candidate.id}|${POSITIONS.map(({ id, label }) => {
        const pillar = candidate.pillars[id];
        return `${label}=${
          pillar === null && id === 'hour' && report.hourPillar === 'omitted'
            ? '미상(제외)'
            : (pillar?.korean ?? '미정')
        }`;
      }).join('|')}`,
      `자시정책=${candidate.ziHourPolicies.join(',')}`,
      `지원시간=${candidate.supportDurationMilliseconds}ms(확률 아님)`,
    ].join('|'),
    ...candidate.occurrences.map(
      (occurrence, index) =>
        `후보구간|${candidate.id}#${index + 1}|자시정책=${occurrence.ziHourPolicy}|현지=[${occurrence.startLocalDateTimeInclusive},${occurrence.endLocalDateTimeExclusive})|UTC=[${occurrence.instantStartUtc},${occurrence.instantEndExclusiveUtc})|offset=${occurrence.offsetSeconds}s|중복시각해소=${occurrence.disambiguation}|근거=${occurrence.basis}`,
    ),
  ]);
}

function compactFindingLines(reading: PreparedOhMySajuReading): readonly string[] {
  return packResults(reading).flatMap((result) => {
    const allFindings = sortedFindings(result);
    const detailedFindings = allFindings.filter(
      (finding) => !PRESENTED_CORE_RULES.has(finding.ruleId),
    );
    const separatelyPresentedFindingIds = allFindings
      .filter((finding) => PRESENTED_CORE_RULES.has(finding.ruleId))
      .map(({ id }) => id);
    if (allFindings.length === 0 && result.interpretation.unavailableRules.length === 0) return [];
    const findingsByTopic = new Map<InterpretationTopic, InterpretationFinding[]>();
    for (const finding of detailedFindings) {
      const topicFindings = findingsByTopic.get(finding.topic) ?? [];
      topicFindings.push(finding);
      findingsByTopic.set(finding.topic, topicFindings);
    }
    const findingText = [...findingsByTopic].map(
      ([topic, findings]) =>
        `${SAJU_TOPIC_TITLES[topic]}[${findings
          .map(
            (finding) =>
              `${finding.id}=${compactText(finding.statement)}${findingQualifier(finding)}`,
          )
          .join(';')}]`,
    );
    const unavailableText = result.interpretation.unavailableRules.map(
      (rule) => `${rule.ruleId}=자료없음(${rule.missingPillars.map(positionLabel).join('·')} 필요)`,
    );
    const pack = `${result.packRef.id}@${result.packRef.version}`;
    return [
      ...(separatelyPresentedFindingIds.length === 0
        ? []
        : [`Pack 근거ID|${pack}|${separatelyPresentedFindingIds.join(',')}`]),
      ...(findingText.length === 0 && unavailableText.length === 0
        ? []
        : [`Pack 판정|${pack}|${[...findingText, ...unavailableText].join(';')}`]),
    ];
  });
}

function compactComparisonLines(reading: PreparedOhMySajuReading): readonly string[] {
  const comparison = reading.analysis.comparison;
  const profiles = comparison.rows[0]?.profiles ?? [];
  return [
    `학파비교정책|resolution=${comparison.resolution}|다수결=${comparison.majorityVoteApplied}|승자선택=${comparison.winnerSelected}|지원시간확률=${comparison.supportDurationsAreProbabilities}`,
    `학파비교Pack|${profiles
      .map(
        (profile, index) =>
          `${index}=${profile.packRef.id}@${profile.packRef.version}/${profile.profileRef.id}@${profile.profileRef.version}`,
      )
      .join(';')}`,
    ...comparison.rows.map((row) => {
      const profileEvidence = row.profiles
        .map(
          (profile, index) =>
            `${index}:finding=${profile.findingIds.join(',') || '-'},outcome=${
              profile.outcomeKeys.join(',') || '-'
            },unavailable=${profile.unavailableRuleIds.join(',') || '-'}`,
        )
        .join(';');
      return `학파비교|${row.id}|concept=${row.conceptId}|topic=${row.topic}|status=${row.status}|stability=${row.stability}|definitions=${row.definitionIds.join(',') || '-'}|profiles=${profileEvidence}|resolution=${row.resolution}`;
    }),
  ];
}

function compactTimingLines(timing: SajuTimingReport | null): readonly string[] {
  if (timing === null) return [];
  const annual = timing.years
    .map(
      (year) =>
        `${year.sajuYear}=${year.annualPillar.pillar.korean}(${year.annualPillar.tenGods.stem}/${year.annualPillar.tenGods.branch})@[${year.start.localDateTime}±${year.start.uncertaintyMilliseconds}ms,${year.end.localDateTime}±${year.end.uncertaintyMilliseconds}ms)`,
    )
    .join(',');
  const months = timing.years
    .map(
      (year) =>
        `${year.sajuYear}=${year.months
          .map(
            (month) =>
              `${month.sequence}:${month.pillar.korean}(${month.tenGods.stem}/${month.tenGods.branch})@[${month.start.name} ${month.start.localDateTime}±${month.start.uncertaintyMilliseconds}ms,${month.end.name} ${month.end.localDateTime}±${month.end.uncertaintyMilliseconds}ms)`,
          )
          .join(',')}`,
    )
    .join(';');
  const luck =
    timing.luckPillars === null
      ? '미계산(성별 입력 없음)'
      : [
          timing.luckPillars.gender === 'male' ? '남성' : '여성',
          timing.luckPillars.forward ? '순행' : '역행',
          `시작나이=${timing.luckPillars.startAge}세`,
          `절입환산=${timing.luckPillars.startOffset.years}년${timing.luckPillars.startOffset.months}개월${timing.luckPillars.startOffset.days}일`,
          timing.luckPillars.pillars
            .map(
              ({ age, pillar, tenGods, approximateStartDate }) =>
                `${age}세:${pillar.korean}(${tenGods.stem}/${tenGods.branch})@약${approximateStartDate.date}`,
            )
            .join(','),
        ].join('|');
  return [
    `운경계|구간=${timing.audit.intervalSemantics}|대표시각=${timing.audit.representativeInstantPolicy}|각 ±ms는 절기 계산 경계 불확실성`,
    `세운|${annual}`,
    `절월|${months}`,
    `대운(근사)|${luck}`,
  ];
}

function compactWarningLines(reading: PreparedOhMySajuReading): readonly string[] {
  const warnings = reading.analysis.calculation.warnings;
  return warnings.length === 0
    ? []
    : [`주의|${warnings.map(({ code, message }) => `${code}:${compactText(message)}`).join(';')}`];
}

/**
 * Render a line-oriented, low-token deterministic fact block.
 *
 * The renderer adds no personality, event, favorable/unfavorable, strength,
 * pattern, or useful-god conclusion. Pack statements are reproduced with their
 * own stability and coverage labels.
 */
export function renderOhMySajuCompact(reading: PreparedOhMySajuReading): string {
  const elements = elementViews(reading);
  const tenGods = tenGodViews(reading);
  const dayMasters = dayMasterViews(reading);
  const yinYang = yinYangViews(reading);
  const hiddenStems = hiddenStemViews(reading);
  const growthStages = growthStageViews(reading);
  const relationships = relationshipStatements(reading);
  const lines = [
    '오 마이 사주|동일 입력·동일 계산 결과',
    `계산유형|${reading.calculationKind === 'exact' ? '정확한 생시' : '생시 가능성'}`,
    compactBirthLine(reading),
    compactConventionLine(reading),
    ...(compactChronologyLine(reading) === null ? [] : [compactChronologyLine(reading)!]),
    ...(compactPossibilityEvidenceLine(reading) === null
      ? []
      : [compactPossibilityEvidenceLine(reading)!]),
    compactNatalLine(reading),
    ...compactCandidateLines(reading),
    ...(uncertaintyLines(reading).length === 0
      ? []
      : [`불확실성|${uncertaintyLines(reading).join(';')}`]),
    ...(dayMasters.length === 0 ? [] : [`일간|${dayMasters.map(formatDayMaster).join(';')}`]),
    ...(tenGods.length === 0 ? [] : [`십신(지지=본기)|${tenGods.map(formatTenGods).join(';')}`]),
    ...(elements.length === 0
      ? []
      : [`오행(합성가중치;신강·신약 아님)|${elements.map(formatElements).join(';')}`]),
    ...(yinYang.length === 0 ? [] : [`음양|${yinYang.map(formatYinYang).join(';')}`]),
    ...(hiddenStems.length === 0 ? [] : [`지장간|${hiddenStems.map(formatHiddenStems).join(';')}`]),
    ...(growthStages.length === 0
      ? []
      : [
          `십이운성|profile=${[...new Set(growthStages.map(({ profileId }) => profileId))].join(
            ',',
          )}|${growthStages.map(formatGrowthStages).join(';')}`,
        ]),
    `공망|${voidBranches(reading) || '자료없음'}`,
    ...(relationships.length === 0 ? [] : [`관계|${relationships.join(';')}`]),
    ...compactFindingLines(reading),
    ...compactComparisonLines(reading),
    ...compactTimingLines(reading.timing),
    ...compactWarningLines(reading),
    `감사|core=${reading.binding.core.name}@${reading.binding.core.version}/schema-${reading.binding.core.schemaVersion}|packs=${reading.binding.packs
      .map(({ packRef }) => `${packRef.id}@${packRef.version}`)
      .join(',')}|binding=${reading.binding.digest}`,
  ];
  return lines.join('\n');
}

function markdownConventionSection(reading: PreparedOhMySajuReading): readonly string[] {
  if (reading.analysis.calculationKind === 'exact') {
    const report = reading.analysis.calculation;
    const rules = report.audit.rules;
    const correction = report.chronology.solarTimeCorrection;
    return [
      '',
      '## 계산 관법',
      '',
      `- 자시 정책: \`${rules.ziHourPolicy}\``,
      `- 일·시 계산 시계: \`${rules.dayHourClock}\``,
      `- 경도: ${rules.longitudeDegreesEast === null ? '해당 없음' : `${rules.longitudeDegreesEast}°E`}`,
      `- 균시차: \`${rules.equationOfTime ?? '해당 없음'}\``,
      `- 일·시주 기준 시각: \`${report.chronology.dayHourDateTime}\``,
      correction === null
        ? '- 민간시 대비 태양시 보정: 없음.'
        : `- 태양시 보정 상세: 경도 환산 ${correction.longitudeSeconds}초; 균시차 ${correction.equationOfTimeSeconds}초; 시간대가 반영된 민간시 대비 총차 ${correction.totalDifferenceFromCivilSeconds}초.`,
    ];
  }
  const report = reading.analysis.calculation;
  const rules = report.audit.rules;
  return [
    '',
    '## 계산 관법',
    '',
    `- 자시 정책: ${rules.ziHourPolicies.map((policy) => `\`${policy}\``).join(', ')}`,
    `- 일·시 계산 시계: \`${rules.dayHourClock}\``,
    `- 경도: ${rules.longitudeDegreesEast === null ? '해당 없음' : `${rules.longitudeDegreesEast}°E`}`,
    `- 균시차: \`${rules.equationOfTime ?? '해당 없음'}\``,
    `- 일·시주 후보 범위: \`${report.coverage.startLocalDateTimeInclusive}\`부터 \`${report.coverage.endLocalDateTimeExclusive}\`까지 ${report.coverage.intervalSemantics}.`,
    rules.dayHourClock === 'local-apparent-solar'
      ? '- 진태양시 보정은 후보 범위별로 적용되며 단일 보정값이 없습니다.'
      : '- 민간시 대비 태양시 보정: 없음.',
  ];
}

function markdownDayMasterAndYinYangSection(reading: PreparedOhMySajuReading): readonly string[] {
  const dayMasters = dayMasterViews(reading);
  const yinYang = yinYangViews(reading);
  if (dayMasters.length === 0 && yinYang.length === 0) return [];
  return [
    '',
    '## 일간·음양',
    '',
    ...(dayMasters.length === 0
      ? []
      : [
          '| 범위 | 일간 | 음양 | 오행 | 적용 범위 |',
          '| --- | --- | --- | --- | --- |',
          ...dayMasters.map(
            (view) =>
              `| ${markdownText(view.label)} | ${view.stem}(${view.hanja}) | ${view.yinYang} | ${view.element} | ${view.finding === null ? '완전' : findingCoverage(view.finding)} |`,
          ),
          '',
        ]),
    ...(yinYang.length === 0
      ? []
      : [
          '| 범위 | 양 | 음 | 근거 |',
          '| --- | ---: | ---: | --- |',
          ...yinYang.map((view) => {
            const value = (yinOrYang: YinYang): string =>
              `${view.counts[yinOrYang] ?? '미정'} (${view.percentages[yinOrYang] ?? '미정'}%)`;
            return `| ${markdownText(view.label)} | ${value('양')} | ${value('음')} | ${
              view.finding === null ? '보이는 여덟 글자' : findingCoverage(view.finding)
            } |`;
          }),
        ]),
  ];
}

function markdownHiddenStemSection(reading: PreparedOhMySajuReading): readonly string[] {
  const views = hiddenStemViews(reading);
  if (views.length === 0) return [];
  const lines = [
    '',
    '## 지장간',
    '',
    '가중치는 `visible-stems-1-hidden-stems-normalized-v1` 방식으로 합성한 오행 값을 표시합니다. 지장간의 교리상 세력 순위와는 다릅니다.',
  ];
  for (const view of views) {
    lines.push(
      '',
      `### ${markdownText(view.label)}${hiddenStemQualifier(view)}`,
      '',
      '| 기둥 | 지장간(가중치/십신) |',
      '| --- | --- |',
      ...POSITIONS.map(({ id, label }) => {
        const hidden = view.values[id];
        return `| ${label} | ${
          hidden === undefined
            ? '미상(제외)'
            : hidden.map(({ stem, weight, tenGod }) => `${stem}(${weight}/${tenGod})`).join(', ')
        } |`;
      }),
    );
  }
  return lines;
}

function markdownGrowthStageSection(reading: PreparedOhMySajuReading): readonly string[] {
  const views = growthStageViews(reading);
  if (views.length === 0) return [];
  const profileIds = [...new Set(views.map(({ profileId }) => profileId))];
  return [
    '',
    '## 십이운성',
    '',
    ...profileIds.map((profileId) => `- 프로필: \`${profileId}\``),
    '- 일간을 기준으로 계산한 단계만 표시합니다. 강약·길흉은 판정하지 않습니다.',
    '',
    '| 범위 | 일간 | 기둥 | 지지 | 단계 | 적용 범위 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...views.flatMap((view) =>
      POSITIONS.flatMap(({ id, label }) => {
        const value = view.values[id];
        return value === undefined
          ? []
          : [
              `| ${markdownText(view.label)} | ${view.dayStem} | ${label} | ${value.branch} | ${value.stage} | ${findingCoverage(view.finding)} |`,
            ];
      }),
    ),
  ];
}

function markdownNatalRows(reading: PreparedOhMySajuReading): readonly string[] {
  const stableTenGods = tenGodViews(reading).find(
    ({ finding }) => finding === null || finding.stability === 'stable',
  );
  if (reading.analysis.calculationKind === 'exact') {
    const report = reading.analysis.calculation;
    return POSITIONS.map(({ id, label }) => {
      const pillar = report.pillars[id];
      const gods = stableTenGods?.values[id];
      return `| ${label} | ${pillar.stem.korean}(${pillar.stem.hanja}) | ${pillar.branch.korean}(${pillar.branch.hanja}) | ${gods?.stem ?? '미정'} | ${gods?.branch ?? '미정'} |`;
    });
  }
  const report = reading.analysis.calculation;
  return POSITIONS.map(({ id, label }) => {
    const pillar = report.stablePillars[id];
    const gods = stableTenGods?.values[id];
    const cell = pillarCell(pillar, id, report.hourPillar);
    return `| ${label} | ${pillar === null ? cell : `${pillar.stem.korean}(${pillar.stem.hanja})`} | ${
      pillar === null ? cell : `${pillar.branch.korean}(${pillar.branch.hanja})`
    } | ${gods?.stem ?? (cell === '미상(제외)' ? '미정' : '후보별')} | ${
      gods?.branch ?? (cell === '미상(제외)' ? '미정' : '후보별')
    } |`;
  });
}

function markdownCandidateSection(reading: PreparedOhMySajuReading): readonly string[] {
  if (reading.analysis.calculationKind !== 'possibilities') return [];
  const report = reading.analysis.calculation;
  return [
    '',
    '### 원국 후보',
    '',
    '지원 시간은 해당 후보가 성립하는 실제 시각 구간을 모두 더한 값입니다. 확률이 아닙니다.',
    '',
    '| 후보 ID | 년 | 월 | 일 | 시 | 자시 정책 | 지원 시간(ms, 확률 아님) |',
    '| --- | --- | --- | --- | --- | --- | ---: |',
    ...report.candidates.map(
      (candidate) =>
        `| ${markdownText(candidate.id)} | ${candidate.pillars.year.korean} | ${candidate.pillars.month.korean} | ${candidate.pillars.day.korean} | ${
          candidate.pillars.hour?.korean ?? '미상(제외)'
        } | ${candidate.ziHourPolicies.join(', ')} | ${candidate.supportDurationMilliseconds} |`,
    ),
    '',
    '#### 후보 지원 구간',
    '',
    '| 후보·구간 | 자시 정책 | 현지 `[start,end)` | UTC `[start,end)` | 시차 | 중복 시각 해소 | 근거 |',
    '| --- | --- | --- | --- | ---: | --- | --- |',
    ...report.candidates.flatMap((candidate) =>
      candidate.occurrences.map(
        (occurrence, index) =>
          `| ${markdownText(candidate.id)}#${index + 1} | ${occurrence.ziHourPolicy} | [${occurrence.startLocalDateTimeInclusive}, ${occurrence.endLocalDateTimeExclusive}) | [${occurrence.instantStartUtc}, ${occurrence.instantEndExclusiveUtc}) | ${occurrence.offsetSeconds}s | ${occurrence.disambiguation} | ${occurrence.basis} |`,
      ),
    ),
  ];
}

function markdownTenGodCandidateSection(reading: PreparedOhMySajuReading): readonly string[] {
  const views = tenGodViews(reading);
  if (views.length <= 1) return [];
  return [
    '',
    '### 후보별 십신',
    '',
    '| 후보 묶음 | 년 | 월 | 일 | 시 | 범위 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...views.map((view) => {
      const value = (position: SajuPillarName): string => {
        const pair = view.values[position];
        return pair === undefined ? '미정' : `${pair.stem}/${pair.branch}`;
      };
      return `| ${markdownText(view.label)} | ${value('year')} | ${value('month')} | ${value(
        'day',
      )} | ${value('hour')} | ${view.finding === null ? '완전' : findingCoverage(view.finding)} |`;
    }),
  ];
}

function markdownElementSection(reading: PreparedOhMySajuReading): readonly string[] {
  const views = elementViews(reading);
  if (views.length === 0) return [];
  return [
    '',
    '## 오행 분포',
    '',
    '표의 값은 합성 가중치를 나타냅니다. 신강·신약을 판정한 값은 아닙니다.',
    '',
    '| 범위 | 목 | 화 | 토 | 금 | 수 | 적용 범위 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- |',
    ...views.map(
      (view) =>
        `| ${markdownText(view.label)} | ${ELEMENTS.map((element) => {
          const score = view.scores[element];
          const percentage = view.percentages[element];
          return score === undefined || percentage === undefined
            ? '미정'
            : `${score} (${percentage}%)`;
        }).join(' | ')} | ${view.finding === null ? '완전' : findingCoverage(view.finding)} |`,
    ),
  ];
}

function markdownFindingSection(reading: PreparedOhMySajuReading): readonly string[] {
  const rows = packResults(reading).flatMap((result) => {
    const candidateCount = result.interpretation.subject.candidateCount;
    const findings = sortedFindings(result).map(
      (finding) =>
        `| ${markdownText(result.interpretation.profile.displayName)}@${
          result.profileRef.version
        } | ${SAJU_TOPIC_TITLES[finding.topic]} | ${findingCoverage(
          finding,
        )} | ${findingStability(finding, candidateCount)} | ${markdownText(
          finding.statement,
        )} | \`${finding.id}\` |`,
    );
    const unavailable = result.interpretation.unavailableRules.map(
      (rule) =>
        `| ${markdownText(result.interpretation.profile.displayName)}@${
          result.profileRef.version
        } | 자료 없음 | ${rule.missingPillars.map(positionLabel).join('·')} 필요 | 이용 불가 | ${
          rule.ruleId
        } | - |`,
    );
    return [...findings, ...unavailable];
  });
  if (rows.length === 0) return [];
  return [
    '',
    '## 전통 규칙 팩 판정',
    '',
    '아래에는 규칙 팩마다 나온 결과를 따로 적었습니다. 계산 결과와 한데 섞거나, 여러 규칙 팩 가운데 다수 쪽을 정답으로 고르지 않습니다.',
    '',
    '| 규칙 팩 | 주제 | 적용 범위 | 안정성 | 규칙 판정 | 근거 ID |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
  ];
}

function markdownComparisonSection(reading: PreparedOhMySajuReading): readonly string[] {
  const comparison = reading.analysis.comparison;
  return [
    '',
    '## 학파 비교',
    '',
    `학파별 결과는 아직 하나로 합치지 않았습니다. 내부 상태: \`${comparison.resolution}\`. 다수결 적용: ${comparison.majorityVoteApplied ? '예' : '아니요'}, 하나의 학파를 정답으로 선택: ${comparison.winnerSelected ? '예' : '아니요'}, 후보가 성립하는 시간을 확률로 해석: ${comparison.supportDurationsAreProbabilities ? '예' : '아니요'}.`,
    '',
    '| 비교 ID | 개념 | 주제 | 상태 | 안정성 | 정의 ID | 규칙 팩별 근거 | 결론 상태 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...comparison.rows.map((row) => {
      const profiles = row.profiles
        .map(
          (profile) =>
            `${profile.packRef.id}@${profile.packRef.version}/${profile.profileRef.id}@${
              profile.profileRef.version
            }: 근거 ID=${profile.findingIds.join(',') || '-'}, 결과 코드=${
              profile.outcomeKeys.join(',') || '-'
            }, 이용 불가 규칙=${profile.unavailableRuleIds.join(',') || '-'}`,
        )
        .join('; ');
      return `| \`${row.id}\` | \`${row.conceptId}\` | ${SAJU_TOPIC_TITLES[row.topic]} | \`${row.status}\` | \`${row.stability}\` | ${row.definitionIds.map((id) => `\`${id}\``).join(', ') || '-'} | ${markdownText(profiles)} | \`${row.resolution}\` |`;
    }),
  ];
}

function markdownTimingSection(timing: SajuTimingReport | null): readonly string[] {
  if (timing === null) return [];
  const lines = [
    '',
    '## 세운·절월',
    '',
    `표시 범위: 사주년 ${timing.range.fromSajuYear}–${timing.range.throughSajuYear} (${timing.range.yearCount}개). 경계는 입춘·12절의 계산 시각이며 구간은 ${timing.audit.intervalSemantics}입니다. 각 ±ms는 절기 계산의 경계 불확실성입니다.`,
    '',
    '### 세운',
    '',
    '| 사주년 | 간지 | 십신(천간/지지 본기) | 시작(현지, 경계 불확실성) | 종료(현지, 경계 불확실성) |',
    '| ---: | --- | --- | --- | --- |',
    ...timing.years.map(
      (year) =>
        `| ${year.sajuYear} | ${year.annualPillar.pillar.korean}(${year.annualPillar.pillar.hanja}) | ${year.annualPillar.tenGods.stem}/${year.annualPillar.tenGods.branch} | ${year.start.localDateTime} ±${year.start.uncertaintyMilliseconds}ms | ${year.end.localDateTime} ±${year.end.uncertaintyMilliseconds}ms |`,
    ),
    '',
    '### 절월',
    '',
    '| 사주년 | 순번 | 간지 | 십신(천간/지지 본기) | 시작 절기·시각·경계 불확실성 | 종료 절기·시각·경계 불확실성 |',
    '| ---: | ---: | --- | --- | --- | --- |',
    ...timing.years.flatMap((year) =>
      year.months.map(
        (month) =>
          `| ${year.sajuYear} | ${month.sequence} | ${month.pillar.korean}(${month.pillar.hanja}) | ${month.tenGods.stem}/${month.tenGods.branch} | ${month.start.name} ${month.start.localDateTime} ±${month.start.uncertaintyMilliseconds}ms | ${month.end.name} ${month.end.localDateTime} ±${month.end.uncertaintyMilliseconds}ms |`,
      ),
    ),
    '',
    '### 대운(근사)',
    '',
  ];
  if (timing.luckPillars === null) {
    lines.push('성별 입력이 없어 대운 방향과 시작점을 계산하지 않았습니다.');
  } else {
    const luck = timing.luckPillars;
    lines.push(
      `- 입력: ${luck.gender === 'male' ? '남성' : '여성'}`,
      `- 방향: ${luck.forward ? '순행' : '역행'}`,
      `- 시작: ${luck.startAge}세; 절입 간격 환산 ${luck.startOffset.years}년 ${luck.startOffset.months}개월 ${luck.startOffset.days}일`,
      `- 시작일은 \`${luck.pillars[0]?.approximateStartDate.method ?? 'three-days-one-year'}\` 방식의 근사값입니다.`,
      '',
      '| 나이 | 대운 | 십신(천간/지지) | 근사 시작일 |',
      '| ---: | --- | --- | --- |',
      ...luck.pillars.map(
        ({ age, pillar, tenGods, approximateStartDate }) =>
          `| ${age} | ${pillar.korean}(${pillar.hanja}) | ${tenGods.stem}/${tenGods.branch} | 약 ${approximateStartDate.date} |`,
      ),
    );
  }
  if (timing.notes.length > 0) {
    lines.push('', '### 계산 주석', '', ...timing.notes.map((note) => `- ${markdownText(note)}`));
  }
  return lines;
}

function markdownWarnings(reading: PreparedOhMySajuReading): readonly string[] {
  const uncertainty = uncertaintyLines(reading);
  const warnings = reading.analysis.calculation.warnings;
  if (uncertainty.length === 0 && warnings.length === 0) return [];
  return [
    '',
    '## 범위와 불확실성',
    '',
    ...uncertainty.map((line) => `- ${markdownText(line)}.`),
    ...warnings.map(({ code, message }) => `- \`${code}\`: ${markdownText(message)}`),
  ];
}

/** Render a detailed Markdown fact report with explicit Pack and uncertainty boundaries. */
export function renderOhMySajuMarkdown(reading: PreparedOhMySajuReading): string {
  const exact = reading.analysis.calculationKind === 'exact';
  const calculation = reading.analysis.calculation;
  const birthSummary = compactBirthLine(reading).replaceAll('|', ' · ');
  const relationships = relationshipStatements(reading);
  const exactChronology =
    reading.analysis.calculationKind === 'exact' ? reading.analysis.calculation.chronology : null;
  const possibilityInput =
    reading.analysis.calculationKind === 'possibilities'
      ? reading.analysis.calculation.input
      : null;
  const lines = [
    '# 오 마이 사주 계산 보고서',
    '',
    '> 같은 입력에는 늘 같은 계산 결과를 반환하며 해석이나 길흉은 덧붙이지 않습니다. 계산 사실, 관법에 따른 결과, 규칙 팩 판정을 나눠 표시합니다.',
    '',
    '## 입력',
    '',
    `- 계산 유형: ${exact ? '정확한 생시' : '생시 가능성'}`,
    `- ${markdownText(birthSummary)}`,
    ...(exactChronology === null
      ? []
      : [
          `- UTC 순간: \`${exactChronology.instantUtc}\``,
          `- 시간대 시차·약어: ${exactChronology.offsetSeconds}s, \`${exactChronology.timeZoneAbbreviation}\``,
          `- 중복 시각 해소: \`${exactChronology.disambiguation}\``,
          `- 일광 절약 시간: 적용 여부=${
            exactChronology.daylightSaving.isDaylightSavingTime ?? '미확정'
          }, 보정=${
            exactChronology.daylightSaving.offsetSeconds === null
              ? '미확정'
              : `${exactChronology.daylightSaving.offsetSeconds}s`
          }, 표시 방식=\`${exactChronology.daylightSaving.representation}\``,
        ]),
    ...(possibilityInput === null
      ? []
      : [
          `- 기록된 시차: ${
            possibilityInput.expectedOffsetSeconds === null
              ? '없음'
              : `${possibilityInput.expectedOffsetSeconds}s`
          }`,
          `- 시간 근거: 출처=\`${possibilityInput.timeEvidence?.source ?? '없음'}\`, 상충=\`${
            possibilityInput.timeEvidence?.conflict ?? '없음'
          }\` (개인정보가 포함될 수 있는 원문은 표시하지 않음)`,
        ]),
    ...markdownConventionSection(reading),
    '',
    '## 원국',
    '',
    '지지 십신은 각 지지의 지장간 본기를 기준으로 계산합니다.',
    '',
    '| 기둥 | 천간 | 지지 | 십신(천간) | 십신(지지 본기) |',
    '| --- | --- | --- | --- | --- |',
    ...markdownNatalRows(reading),
    ...markdownCandidateSection(reading),
    ...markdownTenGodCandidateSection(reading),
    ...markdownDayMasterAndYinYangSection(reading),
    ...markdownElementSection(reading),
    ...markdownHiddenStemSection(reading),
    ...markdownGrowthStageSection(reading),
    '',
    '## 공망·구조 관계',
    '',
    `- 공망(일주 순 기준): ${markdownText(voidBranches(reading) || '자료 없음')}`,
    ...(relationships.length === 0
      ? []
      : relationships.map((statement) => `- ${markdownText(statement)}`)),
    ...markdownWarnings(reading),
    ...markdownFindingSection(reading),
    ...markdownComparisonSection(reading),
    ...markdownTimingSection(reading.timing),
    '',
    '## 검증 정보',
    '',
    `- 계산 엔진: \`${reading.binding.core.name}@${reading.binding.core.version}\`, schema \`${reading.binding.core.schemaVersion}\`, source \`${reading.binding.core.sourceRevision}\``,
    `- Pack: ${reading.binding.packs
      .map(({ packRef }) => `\`${packRef.id}@${packRef.version}\``)
      .join(', ')}`,
    `- 준비 바인딩: \`${reading.binding.algorithm}:${reading.binding.digest}\``,
    `- 계산 경고 수: ${calculation.warnings.length}`,
  ];
  return lines.join('\n').trimEnd();
}
