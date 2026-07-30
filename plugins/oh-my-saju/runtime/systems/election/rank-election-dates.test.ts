import { describe, expect, expectTypeOf, test } from 'vitest';
import {
  MAX_ELECTION_DATE_SPAN_DAYS,
  OH_MY_SAJU_ELECTION_RANKING_POLICY_V1,
  rankElectionDates,
  type ElectionRequest,
} from './index';

const PARTICIPANT = {
  id: 'subject-a',
  natalRequest: {
    birth: {
      date: { calendar: 'gregorian' as const, year: 1996, month: 5, day: 27 },
      time: { hour: 6, minute: 50 },
      timeZone: 'Asia/Seoul',
    },
  },
};

function request(patch: Partial<ElectionRequest> = {}): ElectionRequest {
  return {
    kind: 'election',
    eventType: 'daily',
    dateRange: {
      start: { calendar: 'gregorian', year: 2026, month: 1, day: 1 },
      endInclusive: { calendar: 'gregorian', year: 2026, month: 1, day: 3 },
    },
    timeZone: 'Asia/Seoul',
    representativeInstantPolicy: 'local-civil-noon',
    rankingPolicy: {
      id: 'oh-my-saju-election-ranking',
      version: '1.0.0',
    },
    participants: [PARTICIPANT],
    ...patch,
  };
}

describe('rankElectionDates', () => {
  test('명시한 민간일 범위를 달력 사실·원전 일치와 분리된 완전한 제품 점수 추적으로 정렬한다', () => {
    const input = request();
    const first = rankElectionDates(input);
    const second = rankElectionDates(input);

    expect(first).toEqual(second);
    expectTypeOf(first.kind).toEqualTypeOf<'election'>();
    expect(first).toMatchObject({
      schemaVersion: '1',
      kind: 'election',
      value: {
        eventType: 'daily',
        dateRange: {
          timeZone: 'Asia/Seoul',
          spanDays: 3,
        },
      },
      audit: {
        implementation: 'oh-my-saju-independent',
        predictiveValidity: 'not-established',
        implicitAdjustments: [],
      },
    });
    expect(first.audit.limitations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'election-move-in-direction-excluded-v1',
        }),
      ]),
    );
    expect(JSON.stringify(first.audit.limitations)).not.toMatch(/six-virtue/u);
    expect(first.value.candidates).toHaveLength(3);
    for (const candidate of first.value.candidates) {
      expect(candidate.calendarFacts).toMatchObject({
        representative: {
          policy: 'local-civil-noon',
          timeZone: 'Asia/Seoul',
        },
        dayOfficer: {
          index: expect.any(Number),
          hanja: expect.any(String),
        },
        yellowBlackPath: {
          deityIndex: expect.any(Number),
          classification: expect.stringMatching(/^(yellow-path|black-path)$/u),
        },
      });
      expect(candidate.classicalMatches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            profileId: 'nam-byeong-gil-electional',
            profileVersion: '1.0.0',
            ruleId: 'election.day-officer',
          }),
          expect.objectContaining({
            profileId: 'nam-byeong-gil-electional',
            profileVersion: '1.0.0',
            ruleId: 'election.yellow-black-path',
          }),
        ]),
      );
      const contributionTotal = candidate.ranking.contributions.reduce(
        (sum, contribution) => sum + contribution.amount,
        0,
      );
      const expectedUnclamped = candidate.ranking.base + contributionTotal;

      expect(candidate.ranking).toMatchObject({
        policyId: OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.id,
        policyVersion: OH_MY_SAJU_ELECTION_RANKING_POLICY_V1.version,
        base: 50,
        unclampedScore: expectedUnclamped,
        score: Math.max(0, Math.min(100, expectedUnclamped)),
        clamp: {
          minimum: 0,
          maximum: 100,
          applied: expectedUnclamped < 0 || expectedUnclamped > 100,
        },
        meaning: expect.stringContaining('확률'),
        tieBreak: {
          scheduleConstraintSatisfied: true,
          negativeClassicalMatchCount: expect.any(Number),
          score: Math.max(0, Math.min(100, expectedUnclamped)),
          dateAscending: expect.any(String),
        },
      });
      expect(candidate.ranking.meaning).toContain('아님');
      expect(candidate.ranking.score).toBeGreaterThanOrEqual(0);
      expect(candidate.ranking.score).toBeLessThanOrEqual(100);
    }
    expect(first.value.candidates.map(({ rank }) => rank)).toEqual([1, 2, 3]);
    expect(Object.isFrozen(first)).toBe(true);
  });

  test('최대 민간일 범위와 정확한 참가자 요청을 입력 경계에서 검증한다', () => {
    expect(MAX_ELECTION_DATE_SPAN_DAYS).toBe(366);
    expect(() =>
      rankElectionDates(
        request({
          dateRange: {
            start: { calendar: 'gregorian', year: 2026, month: 1, day: 1 },
            endInclusive: { calendar: 'gregorian', year: 2027, month: 1, day: 2 },
          },
        }),
      ),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_SYSTEM_INPUT',
        path: ['dateRange'],
        details: { spanDays: 367, maximumSpanDays: 366 },
      }),
    );

    expect(() =>
      rankElectionDates(
        request({
          participants: [
            {
              id: 'unknown-time',
              natalRequest: {
                birth: {
                  date: { calendar: 'gregorian', year: 1996, month: 5, day: 27 },
                  time: { kind: 'unknown' },
                  timeZone: 'Asia/Seoul',
                },
              } as never,
            },
          ],
        }),
      ),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_SYSTEM_INPUT',
        path: ['participants', 0, 'natalRequest', 'birth', 'time'],
      }),
    );
  });

  test('월파와 참가자 연지 합·충·해·형을 원전 일치와 제품 기여로 각각 추적한다', () => {
    const result = rankElectionDates(
      request({
        dateRange: {
          start: { calendar: 'gregorian', year: 2026, month: 1, day: 1 },
          endInclusive: { calendar: 'gregorian', year: 2026, month: 1, day: 24 },
        },
      }),
    );
    const contributions = result.value.candidates.flatMap(({ ranking }) => ranking.contributions);
    const amountsByRule = new Map(
      contributions.map(({ policyRuleId, amount }) => [policyRuleId, amount]),
    );

    expect(amountsByRule.get('month-break')).toBe(-16);
    expect(amountsByRule.get('participant-year-branch-combination')).toBe(0);
    expect(amountsByRule.get('participant-year-branch-clash')).toBe(-10);
    expect(amountsByRule.get('participant-year-branch-harm')).toBe(-6);
    expect(amountsByRule.get('participant-year-branch-punishment')).toBe(-4);
    expect(
      contributions
        .filter(({ classicalMatchIds }) => classicalMatchIds.length > 0)
        .every(({ classicalMatchIds }, candidateIndex) => {
          const allMatchIds = new Set(
            result.value.candidates.flatMap(({ classicalMatches }) =>
              classicalMatches.map(({ id }) => id),
            ),
          );
          return (
            candidateIndex >= 0 && classicalMatchIds.every((matchId) => allMatchIds.has(matchId))
          );
        }),
    ).toBe(true);
    expect(
      JSON.stringify({
        candidates: result.value.candidates,
        policies: result.audit.policies,
      }),
    ).not.toMatch(/six-virtue|luckProbability|successProbability/u);
    expect(result.audit.trace.unverifiedSixVirtueTablesUsed).toBe(false);
    expect(result.audit.trace.scoreIsProbability).toBe(false);
  });

  test('혼례 두 당사자는 대칭 점수 주체이고 이사는 대표 거주자만 점수에 반영한다', () => {
    const partner = {
      id: 'subject-b',
      natalRequest: {
        birth: {
          date: { calendar: 'gregorian' as const, year: 1998, month: 3, day: 14 },
          time: { hour: 15, minute: 20 },
          timeZone: 'Asia/Seoul',
        },
      },
    };
    const shortRange = {
      start: { calendar: 'gregorian' as const, year: 2026, month: 1, day: 1 },
      endInclusive: { calendar: 'gregorian' as const, year: 2026, month: 1, day: 12 },
    };
    const wedding = rankElectionDates(
      request({
        eventType: 'wedding',
        dateRange: shortRange,
        participants: [PARTICIPANT, partner],
      }),
    );
    expect(wedding.value.participants).toEqual([
      { id: 'subject-a', scoringRole: 'core' },
      { id: 'subject-b', scoringRole: 'core' },
    ]);
    expect(
      new Set(
        wedding.value.candidates.flatMap(({ ranking }) =>
          ranking.contributions.flatMap(({ participantId }) =>
            participantId === undefined ? [] : [participantId],
          ),
        ),
      ),
    ).toEqual(new Set(['subject-a', 'subject-b']));

    const moving = rankElectionDates(
      request({
        eventType: 'moving',
        dateRange: shortRange,
        participants: [PARTICIPANT, partner],
        principalParticipantId: 'subject-a',
      }),
    );
    expect(moving.value.participants).toEqual([
      { id: 'subject-a', scoringRole: 'core' },
      { id: 'subject-b', scoringRole: 'context-only' },
    ]);
    expect(
      moving.value.candidates
        .flatMap(({ ranking }) => ranking.contributions)
        .every(({ participantId }) => participantId !== 'subject-b'),
    ).toBe(true);
    expect(
      moving.value.candidates
        .flatMap(({ classicalMatches }) => classicalMatches)
        .some(({ participantId }) => participantId === 'subject-b'),
    ).toBe(true);

    expect(() =>
      rankElectionDates(
        request({
          eventType: 'wedding',
          participants: [PARTICIPANT],
        }),
      ),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_SYSTEM_INPUT',
        path: ['participants'],
      }),
    );
  });

  test('일정 제약·음수 원전 일치 수·점수·날짜 순서의 네 동점 기준을 결정론적으로 적용한다', () => {
    const unavailable = { calendar: 'gregorian' as const, year: 2026, month: 1, day: 1 };
    const result = rankElectionDates(
      request({
        dateRange: {
          start: unavailable,
          endInclusive: { calendar: 'gregorian', year: 2026, month: 1, day: 12 },
        },
        scheduleConstraints: { unavailableDates: [unavailable] },
      }),
    );
    const ties = result.value.candidates.map(({ ranking }) => ranking.tieBreak);
    const compare = (left: (typeof ties)[number], right: (typeof ties)[number]): number => {
      if (left.scheduleConstraintSatisfied !== right.scheduleConstraintSatisfied) {
        return left.scheduleConstraintSatisfied ? -1 : 1;
      }
      if (left.negativeClassicalMatchCount !== right.negativeClassicalMatchCount) {
        return left.negativeClassicalMatchCount - right.negativeClassicalMatchCount;
      }
      if (left.score !== right.score) return right.score - left.score;
      return left.dateAscending.localeCompare(right.dateAscending);
    };

    for (let index = 1; index < ties.length; index += 1) {
      expect(compare(ties[index - 1]!, ties[index]!)).toBeLessThanOrEqual(0);
    }
    expect(ties.at(-1)).toMatchObject({
      scheduleConstraintSatisfied: false,
      dateAscending: '2026-01-01',
    });
    expect(result.audit.trace.sortOrder).toEqual([
      'schedule-constraint-satisfied-desc',
      'negative-classical-match-count-asc',
      'score-desc',
      'date-asc',
    ]);
  });
});
