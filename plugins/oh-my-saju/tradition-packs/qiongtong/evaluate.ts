import { canonicalJsonStringify } from '../../runtime/internal/canonical-json';
import { getHeavenlyStemElement } from '../../runtime/traditions/domain';
import { getQiongtongClimateCandidates, getQiongtongClimateCellSource } from './qiongtong-table-v1';
import {
  comparison,
  hiddenStemObservations,
  omittedPillars,
  PILLAR_POSITION_LABEL,
  visibleStemObservations,
} from '../../runtime/traditions/rule-helpers';
/** Deterministic lookup helper for the Qiongtong Pack. */
import type {
  DoctrineRuleContext,
  DoctrineRuleMatch,
} from '../../runtime/traditions/rule-evaluator-types';

const QIONGTONG_SOURCE_IDS = [
  'qiongtong-day-stem-month-climate-v1',
  'oh-my-saju-qiongtong-lookup-v1',
] as const;

export function evaluateQiongtongPackRule(context: DoctrineRuleContext): DoctrineRuleMatch {
  const dayStem = context.pillars.day.stem.korean;
  const monthBranch = context.pillars.month.branch.korean;
  const candidates = getQiongtongClimateCandidates(dayStem, monthBranch);
  const cellSource = getQiongtongClimateCellSource(dayStem, monthBranch);
  const candidateElements = candidates.map(getHeavenlyStemElement);
  const visible = visibleStemObservations(context.pillars, { includeDay: true });
  const hidden = hiddenStemObservations(context.pillars);
  const candidateEvidence = candidates.map((stem, index) => {
    const sourceCandidate = cellSource?.candidates.find((candidate) => candidate.stem === stem);
    return {
      stem,
      element: getHeavenlyStemElement(stem),
      transcribedOrder: index + 1,
      priority: sourceCandidate?.priority ?? null,
      function: sourceCandidate?.function ?? {
        tag: null,
        evidence: null,
        status: 'not-source-reviewed',
      },
      conditions: sourceCandidate?.conditions ?? {
        satisfied: [],
        unresolved: ['cell-source-review-pending'],
        status: 'not-source-reviewed',
      },
      visibleLocations: visible
        .filter((observation) => observation.stem === stem)
        .map(({ position }) => ({ position, evidencePath: `pillars.${position}.stem` })),
      hiddenLocations: hidden
        .filter((observation) => observation.stem === stem)
        .map(({ position }) => ({
          position,
          evidencePath: `facts.structure.hiddenStems.${position}`,
        })),
    };
  });
  const source = {
    sourceRuleId:
      cellSource?.sourceRuleId ?? `qiongtong.experimental-table.${dayStem}.${monthBranch}.v1`,
    sourceReferenceId: 'qiongtong-day-stem-month-climate-v1',
    sourceLocator:
      cellSource?.sourceLocator ?? `${dayStem} 일간 ${monthBranch}월 항목(판면 대조 대기)`,
    fixtureId: cellSource?.fixtureId ?? null,
    verification: cellSource?.verification ?? ('experimental-transcription-only' as const),
    functionAndConditionTranscription:
      cellSource === null
        ? 'not-source-reviewed'
        : 'source-explicit-functions-and-unresolved-conditions',
    edition: {
      work: '窮通寶鑑',
      transcriptionUrl:
        'https://zh.wikisource.org/w/index.php?oldid=2294674&title=%E7%A9%B7%E9%80%9A%E5%AE%9D%E9%89%B4',
      revision: 'Wikisource oldid 2294674',
      scanCatalogUrl:
        'https://commons.wikimedia.org/wiki/File:NLC416-12jh004238-48608_%E7%AA%AE%E9%80%9A%E5%AF%B6%E9%91%91%E8%A9%95%E8%A8%BB.pdf',
      scanEdition: '1937 《窮通寶鑑評註》',
      scanChecksumSha256: null,
      scanStatus: 'checksum-pending',
    },
  } as const;
  const omitted = omittedPillars(context.pillars);
  const presenceSummary = candidateEvidence
    .map(({ stem, visibleLocations, hiddenLocations }) => {
      const visibleLabel =
        visibleLocations.length === 0
          ? '천간 없음'
          : `천간 ${visibleLocations
              .map(({ position }) => PILLAR_POSITION_LABEL[position])
              .join('·')}`;
      const hiddenLabel =
        hiddenLocations.length === 0
          ? '지장간 없음'
          : `지장간 ${hiddenLocations
              .map(({ position }) => PILLAR_POSITION_LABEL[position])
              .join('·')}`;
      return `${stem}(${visibleLabel}, ${hiddenLabel})`;
    })
    .join('; ');
  const values = {
    dayMaster: dayStem,
    monthBranch,
    candidateStems: candidates,
    candidateElements,
    candidateEvidence,
    source,
    status:
      cellSource === null
        ? 'experimental-transcription-not-source-reviewed'
        : 'source-checked-candidates-functions-conditions-not-final',
  } as const;
  return {
    key: canonicalJsonStringify(values),
    statement:
      `${dayStem} 일간·${monthBranch}월의 궁통보감 조후 후보가 원국에 나타난 위치는 ${presenceSummary}입니다. ` +
      `${
        cellSource === null
          ? '아직 기준 판면과 대조하지 않은 실험용 전사입니다.'
          : '원문에서 후보의 순서와 기능 표기, 조건을 대조했습니다. 조건 판정은 아직 끝나지 않았습니다.'
      } 후보가 실제로 어디에 있는지는 따로 기록합니다. 이 자료만으로 최종 용신을 정하지 않습니다.`,
    topic: 'useful-god',
    values,
    evidencePaths: ['pillars', 'facts.structure.hiddenStems'],
    sourceReferenceIds: QIONGTONG_SOURCE_IDS,
    comparison: comparison(
      'qiongtong.climate-candidate-stems.v1',
      'useful-god-candidates',
      'qiongtong-climate',
      `${dayStem}:${monthBranch}`,
      candidates.join('|'),
    ),
    ...(omitted.length === 0 ? {} : { coverage: 'partial' as const, omittedPillars: omitted }),
  };
}
