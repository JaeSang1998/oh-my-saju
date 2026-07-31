# Input and runtime protocol

The bundled script reads one JSON command from `--input <file>` or stdin and writes one JSON
response to stdout. The full analysis is often tens of kilobytes, so omit `--pretty` for normal
agent execution and use it only for human inspection. Exit code is zero for success, one for a
domain/validation failure, and two for unreadable JSON or CLI options.

## Korean civil-time defaults

For a Korean-language Saju request with an unqualified numbered date, whether the birth time is
supplied or unknown, use `calendar: "gregorian"` and `timeZone: "Asia/Seoul"` when the user gives
no contrary calendar, birthplace, zone, or offset evidence. Use civil time and do not apply a
local apparent solar-time correction. Do not ask a blocking confirmation; state the assumption in
the first line of the answer and proceed. When no birth time is supplied, use
`time: { "kind": "unknown" }` instead of asking merely to complete the field.

Clarify or override the default when the user explicitly says the date is lunar, says they were
born outside Korea, supplies another time zone or UTC offset, requests apparent solar time, or
provides conflicting evidence. For a Korean lunar date, the runtime still requires
`monthKind: "regular" | "leap"`.

## Exact birth time

```json
{
  "command": "prepare-reading",
  "request": {
    "calculation": {
      "kind": "exact",
      "request": {
        "birth": {
          "date": { "calendar": "gregorian", "year": 1997, "month": 4, "day": 21 },
          "time": { "hour": 12, "minute": 18 },
          "timeZone": "Asia/Seoul"
        },
        "rules": { "ziHourPolicy": "civilMidnight" }
      }
    },
    "question": "핵심 구조를 설명해줘.",
    "readingMode": "focused"
  }
}
```

Optional exact-time fields:

- `time.second`, `time.millisecond`;
- `birth.disambiguation: "earlier" | "later"` for a repeated local time;
- `birth.expectedOffsetSeconds` when a record preserves the UTC offset;
- `rules.ziHourPolicy: "civilMidnight" | "ziStart" | "splitZi"`;
- `rules.dayHourClock` for local apparent solar time.

Do not choose a Zi-hour policy merely to obtain a preferred reading. Default policy is part of the
audited result.

## Korean lunar date

```json
{
  "calendar": "korean-lunar",
  "year": 1997,
  "month": 3,
  "day": 15,
  "monthKind": "regular"
}
```

`monthKind` is required and must be `regular` or `leap`. Do not interpret “음력” as Chinese lunar
calendar data; this engine's contract is Korean lunar.

For a calendar-only integration, `getLunarMonthInfo(year, month)` from `saju-engine/calendar`
returns the regular month and, when present, the leap-month day counts and Gregorian first/last
dates. Use that deterministic result to validate a lunar month selection instead of guessing
whether a leap month exists.

## Unknown time

```json
{
  "command": "prepare-reading",
  "request": {
    "calculation": {
      "kind": "possibilities",
      "request": {
        "birth": {
          "date": { "calendar": "gregorian", "year": 1997, "month": 4, "day": 21 },
          "time": { "kind": "unknown", "reason": "asked-unknown" },
          "timeZone": "Asia/Seoul",
          "timeEvidence": { "source": "self-report" }
        }
      }
    },
    "question": "시간 없이 확실한 부분과 달라지는 부분을 나눠줘.",
    "readingMode": "focused",
    "variantPolicy": "include-candidate-dependent"
  }
}
```

Allowed unknown reasons are `unknown`, `asked-unknown`, `not-asked`, `asked-declined`, and
`masked`. Do not put sensitive free text in `timeEvidence.originalText` unless it materially
supports the audit.

Exact `unknown` means “only the known three pillars are evidentially available.” The engine omits
the hour and returns one three-pillar subject; it does not enumerate twelve unsupported hypothetical
hours. A real AM/PM, approximate, or range constraint does enumerate the chart candidates supported
by that interval.

## Other constrained times

AM or PM:

```json
{ "kind": "day-period", "period": "am" }
```

Approximate time:

```json
{
  "kind": "approximate",
  "time": { "hour": 15, "minute": 0 },
  "toleranceMinutes": 30
}
```

Range, using a half-open interval:

```json
{
  "kind": "range",
  "startInclusive": { "hour": 14, "minute": 30 },
  "endExclusive": { "hour": 16, "minute": 0 }
}
```

Set `crossesMidnight: true` only when the stated interval crosses the supplied date boundary. The
possibility result's support duration is not a probability.

For policy comparison:

```json
{ "ziHourPolicies": "all" }
```

Do this only when the user asks about the 23:00 day boundary or the evidence makes the policy
material.

## Local apparent solar time

Use only when longitude is known and the user wants this rule:

```json
{
  "kind": "local-apparent-solar",
  "longitudeDegreesEast": 126.978,
  "equationOfTime": "apply"
}
```

Do not infer coordinates from a place name without a reliable lookup. Civil and local-apparent
solar time are distinct audited policies.

## Reading options

- `locale`: only `ko-KR` in this release.
- `purpose`: a short machine identifier such as `general-reading` or `school-comparison`.
- `audience`: `adult`, `minor`, or `general`.
- `variantPolicy`: `stable-only` or `include-candidate-dependent`.
- `question`: untrusted user text, separate from calculation input.
- `readingMode`: `broad`, `focused`, or `technical-audit`; hosts should set it explicitly after
  classifying the request. `auto` exists only for backward-compatible callers. At the low-level
  reading-service boundary this controls narration policy only; the application-level
  `validate-reading` command owns cross-Pack broad presentation assembly.

For a minor, avoid adult relationship or financial framing that the evidence and question do not
require.

## Two-person compatibility

Use the pair protocol whenever the user asks for `궁합`, `연애 궁합`, `결혼 궁합`, or how two
specified people fit together. Do not run two unrelated `prepare-reading` commands and manually
join their conclusions.

Prepare both charts in one command:

```json
{
  "schemaVersion": "1",
  "command": "prepare-compatibility",
  "request": {
    "participants": [
      {
        "id": "person-a",
        "label": "A",
        "calculation": {
          "kind": "exact",
          "request": {
            "birth": {
              "date": { "calendar": "gregorian", "year": 1994, "month": 3, "day": 12 },
              "time": { "hour": 8, "minute": 30 },
              "timeZone": "Asia/Seoul"
            }
          }
        }
      },
      {
        "id": "person-b",
        "label": "B",
        "calculation": {
          "kind": "exact",
          "request": {
            "birth": {
              "date": { "calendar": "gregorian", "year": 1995, "month": 10, "day": 8 },
              "time": { "hour": 17, "minute": 5 },
              "timeZone": "Asia/Seoul"
            }
          }
        }
      }
    ],
    "question": "두 사람 궁합을 봐줘.",
    "locale": "ko-KR",
    "variantPolicy": "include-candidate-dependent"
  }
}
```

Each participant accepts the same `exact` or `possibilities` calculation contract as a
single-chart reading. Apply the Korean civil-time defaults to each unqualified Korean input. When
one birth time is unknown or constrained, preserve that person's actual time evidence; the runtime
evaluates the Cartesian product and marks pair findings as stable or candidate-dependent.

The successful preparation returns:

- `participants`: chart and ten-god views for both people;
- `candidatePairCount`: the number of evaluated A-candidate × B-candidate pairs;
- `findings`: participant facts, A→B and B→A day-master ten gods, shared stems or branches, and
  cross-chart stem combinations and branch combination/clash/punishment/break/harm matches;
- `narrationTask`: pair-only evidence, instructions, and the required output schema;
- `binding.digest`: the two-person preparation binding.

Write one pair draft using only `narrationTask.evidence.findings`. Every paragraph names its chart
basis first and then translates that basis into a two-person interaction:

```json
{
  "schemaVersion": "1",
  "kind": "compatibility",
  "summary": {
    "text": "[두 명식 근거]. [두 사람이 어떻게 맞물리는지 보여 주는 짧은 총평].",
    "findingIds": ["actual-finding-id", "another-actual-finding-id"],
    "structure": {
      "basis": "[text 안에 그대로 있는 두 명식 근거]",
      "interpretation": "[text 안에서 basis 뒤에 있는 짧은 궁합 총평]"
    }
  },
  "connection": {
    "text": "[연결 근거]. [서로 끌리거나 보완되는 실제 방식].",
    "findingIds": ["actual-connection-or-directional-finding-id"],
    "structure": {
      "basis": "[text 안의 연결 근거]",
      "interpretation": "[text 안의 연결 해석]"
    }
  },
  "interaction": {
    "text": "[A→B와 B→A 십신 근거]. [한 사람의 반응에 다른 사람이 이어서 보이는 반응].",
    "findingIds": ["actual-a-to-b-id", "actual-b-to-a-id"],
    "structure": {
      "basis": "[text 안의 양방향 근거]",
      "interpretation": "[text 안에서 두 사람이 주고받는 방식]"
    }
  },
  "friction": {
    "text": "[교차 긴장 또는 방향 차이 근거]. [언제 부딪히기 시작하고 다툼이 어떻게 되풀이되는지].",
    "findingIds": ["actual-tension-finding-id"],
    "structure": {
      "basis": "[text 안의 마찰 근거]",
      "interpretation": "[text 안의 갈등 해석]"
    }
  },
  "durability": {
    "text": "[연결 근거와 갈등 근거]. [다툰 뒤 오해를 풀고 오래 지내는 구체적인 방식].",
    "findingIds": ["actual-connection-or-directional-finding-id", "actual-tension-finding-id"],
    "structure": {
      "basis": "[text 안의 장기 관계 근거]",
      "interpretation": "[text 안의 오래 지내기 위한 구체적인 습관]"
    }
  }
}
```

`summary` gives the answer in the first quarter of the report. `connection`, `interaction`, and
`friction` use different evidence sets and all discuss the pair rather than one person in
isolation. When a cross-chart tension finding exists, `friction` and `durability` cite it.
`interaction` always cites both day-master directions.
If a date-crossing or policy range changes either day master, the runtime supplies one
`day-master-ten-god-range` finding per direction. Name every listed candidate and keep that
sentence conditional; never select the first candidate as though it were exact.

Validate against the identical request:

```json
{
  "schemaVersion": "1",
  "command": "validate-compatibility",
  "request": {},
  "preparedDigest": "copy-result.binding.digest-from-prepare",
  "narrator": {
    "id": "agent-host",
    "requestedModel": "host-unknown"
  },
  "draft": {}
}
```

Replace both `{}` objects with the identical compatibility request and completed draft. On success,
show `result.presentation.markdown` exactly. It already renders both charts, both day-master
directions, the overall reading, the connecting mechanism, interaction loop, friction, and
long-term condition. Do not append a score, a separate disclaimer, or a generic checklist.

## Timing options

For exact-time calculations only, the command may include:

```json
{
  "timing": {
    "fromYear": 2026,
    "throughYear": 2028,
    "gender": "female",
    "luckPillarCount": 6
  }
}
```

- years must satisfy `1800 <= fromYear <= throughYear <= 2299`;
- the range may contain at most 21 Saju years;
- `gender` is optional and only selects the traditional direction used for ten-year luck pillars;
- omit `gender` when that layer is not needed;
- `luckPillarCount` is optional, requires `gender`, accepts 1–120, and defaults to 10;
- the same `timing` object must appear in `prepare-reading` and `validate-reading`.

Each year is exact Lichun to next Lichun and contains 12 half-open Jie-to-Jie months. Each boundary
includes UTC, caller-zone local time, and declared source uncertainty. The representative pillar
is calculated after the boundary's declared uncertainty. Optional luck-pillar start dates are
explicitly approximate under `three-days-one-year`; they are not exact event boundaries. Every
returned luck pillar includes day-master-relative stem and branch ten gods, and
`luckPillarCount` controls only how many decade pillars are projected.

Timing output is deterministic calendar activation data. It is not itself a Tradition Pack finding or an
event prediction. Plugin 0.4 hosts must present it as facts only; they must not derive favorable
periods, opportunities, burdens, advice, or events from it.

## Traditional-system command

Election, Tojeong, I Ching, Zi Wei, and Liu Ren use a single-phase command:

```json
{
  "schemaVersion": "1",
  "command": "run-traditional-system",
  "request": {}
}
```

The request is a discriminated union. Never substitute one system when `kind` is unsupported, and
never omit an explicit policy by guessing a default.

### Election

```json
{
  "kind": "election",
  "eventType": "daily",
  "dateRange": {
    "start": { "calendar": "gregorian", "year": 2026, "month": 5, "day": 1 },
    "endInclusive": { "calendar": "gregorian", "year": 2026, "month": 5, "day": 7 }
  },
  "timeZone": "Asia/Seoul",
  "representativeInstantPolicy": "local-civil-noon",
  "rankingPolicy": {
    "id": "oh-my-saju-election-ranking",
    "version": "1.0.0"
  },
  "participants": [
    {
      "id": "subject-a",
      "natalRequest": {
        "birth": {
          "date": { "calendar": "gregorian", "year": 1996, "month": 5, "day": 27 },
          "time": { "hour": 6, "minute": 50 },
          "timeZone": "Asia/Seoul"
        }
      }
    }
  ]
}
```

`daily` requires one participant. `wedding` requires exactly two symmetric participants.
`moving` accepts one through eight participants and additionally requires
`principalParticipantId`; only that principal is a v1 score participant, while other residents
remain visible context. Optional `scheduleConstraints.unavailableDates` keeps unavailable dates
visible but sorts them after available dates. V1 requires every natal request to use the election
time zone. The 0–100 `ranking.score` is a versioned sorting policy, not probability.

### Tojeong 144

```json
{
  "kind": "tojeong-144",
  "sajuRequest": {
    "birth": {
      "date": {
        "calendar": "korean-lunar",
        "year": 1993,
        "month": 3,
        "day": 8,
        "monthKind": "regular"
      },
      "time": { "hour": 12, "minute": 0 },
      "timeZone": "Asia/Seoul"
    }
  },
  "targetYear": 2023,
  "conventions": {
    "profileId": "tojeong-number-144",
    "profileVersion": "1.0.0",
    "countingAge": "target-year-minus-normalized-lunar-birth-year-plus-one",
    "targetDate": "same-regular-korean-lunar-month-and-day",
    "yearBoundary": "explicit-target-year",
    "monthGanzhi": "target-lunar-month-number"
  }
}
```

This profile rejects a leap-month birth and a lunar day 30 that does not exist in the target
regular month. It does not truncate, roll, or choose a leap-month convention silently. The result
contains the three residues, code, calendar facts, number-table digest, and formulas; its
`interpretations` array is intentionally empty.

### I Ching

Manual lines are ordered bottom-to-top:

```json
{
  "kind": "iching",
  "method": "manual-lines",
  "lines": [9, 7, 7, 7, 7, 7],
  "trigramArrangement": {
    "id": "shuogua-houtian",
    "version": "1.0.0"
  }
}
```

For three coins, replace `method` with `three-coins` and supply `casts`, an array of six
three-face arrays whose values are `back` or `inscribedFace`. For yarrow, use `method: "yarrow"`
and supply six `traces`; each has exactly three `{ "left": number, "right": number }` changes.
The runtime validates every stalk remainder. It never generates random evidence.
`trigramArrangement` is optional and explicit: select `shaoyong-xiantian@1.0.0` or
`shuogua-houtian@1.0.0` to attach the corresponding directional metadata. Omitting it assumes
neither arrangement, and the Houtian profile deliberately does not mix in Luoshu numbers.

### Zi Wei

```json
{
  "kind": "ziwei",
  "subject": {
    "birth": {
      "date": {
        "calendar": "korean-lunar",
        "year": 2000,
        "month": 1,
        "day": 1,
        "monthKind": "regular"
      },
      "time": { "hour": 0, "minute": 30 },
      "timeZone": "Asia/Seoul"
    },
    "rules": {
      "ziHourPolicy": "civilMidnight",
      "dayHourClock": { "kind": "civil" }
    }
  },
  "profile": {
    "id": "ziwei-quanshu-core",
    "version": "1.0.0",
    "leapMonthPolicy": "whole-leap-as-next-month",
    "birthYearBoundary": "lunar-new-year"
  }
}
```

The v1 report stops at the life/body palaces, 12 palace stems, five-element bureau, and 14 main
stars. It does not imply auxiliary stars, transformations, periods, dignity, or event readings.

### Liu Ren

```json
{
  "kind": "liuren",
  "subject": {
    "birth": {
      "date": { "calendar": "gregorian", "year": 2026, "month": 5, "day": 1 },
      "time": { "hour": 12, "minute": 0 },
      "timeZone": "Asia/Seoul"
    },
    "rules": {
      "ziHourPolicy": "civilMidnight",
      "dayHourClock": { "kind": "civil" }
    }
  },
  "profile": {
    "id": "liuren-quanshu-nine-gates",
    "version": "1.0.0",
    "monthGeneralBoundary": "middle-qi-instant-inclusive",
    "shehaiTieBreak": "depth-then-season-position-then-day-side"
  }
}
```

`subject` is the explicit question instant, expressed with the same exact request contract as the
Saju core. Zi Wei and Liu Ren both require explicit `subject.rules.ziHourPolicy` and
`subject.rules.dayHourClock`; the runtime never supplies those convention choices by default.
Their audit trace records only normalized chronology facts, not the caller's arbitrary prose. The
Liu Ren result contains the astronomical middle-Qi month general, heaven/earth plate, four
lessons, rule path, Shehai evidence where applicable, and three transmissions. Heavenly generals
and judgment text are outside v1.

## Success envelope

```json
{
  "schemaVersion": "1",
  "ok": true,
  "command": "prepare-reading",
  "result": {
    "schemaVersion": "1",
    "calculationKind": "exact",
    "analysis": {},
    "timing": null,
    "narrationTasks": []
  }
}
```

Do not manually compact or rewrite `analysis`; it contains evidence, warnings, versions, finding
stability, coverage, and source references that simplistic projections often discard. Source
integrations may call `renderOhMySajuCompact(prepared)` or `renderOhMySajuMarkdown(prepared)` from
the application API for deterministic display, while retaining the full prepared JSON for draft
validation.

## Failure envelope

```json
{
  "schemaVersion": "1",
  "ok": false,
  "command": "prepare-reading",
  "error": {
    "name": "SajuError",
    "code": "INVALID_DATE",
    "message": "..."
  }
}
```

Expected failures are data. Preserve `code`, `message`, `path`, and `details` when reporting a
technical audit. Do not expose stack traces or replace failure with an internet chart.

## Draft validation

Use the identical original `request`. Draft entries must match exactly tasks where
`requiresDraft` is true. Copy the prepare response's `result.binding.digest` to the validation
command's `preparedDigest`; this binds the drafts to the recalculated analysis, timing data,
question, core build, Pack rule digests, reading runtime, and task contracts. It detects mismatch
but is not a secret or signature. Each entry has:

```json
{
  "packRef": { "id": "calculation-baseline", "version": "1.1.0" },
  "output": {
    "summary": { "text": "...", "findingIds": ["..."] },
    "sections": []
  },
  "metadata": {
    "actualModel": "optional-safe-id",
    "providerRequestId": "optional-safe-id",
    "finishReason": "optional-safe-id"
  }
}
```

Omit metadata you do not have. Never fabricate provider request IDs.

The `narrator` envelope still needs safe `id` and `requestedModel` strings. Use
`requestedModel: "host-unknown"` when a generic host does not expose the model identity; this
records an explicit unknown rather than claiming a model you cannot verify.

When the caller explicitly sets `request.readingMode` to `broad`, the same `validate-reading`
command must also contain `presentationDraft`. (`auto` remains backward-compatible and does not
add this protocol requirement.) New hosts submit schema 2 `default-profile`. It selects seven or
more distinct validated paragraphs for the thesis, two central mechanisms, strength and blind
spot, work, and relationships. When the displayed ten-god row has at least two `정재`/`편재`
placements, a distinct money paragraph is required as an eighth selection. The thesis quotes exact ordered `basis` and
`portrait` spans. Every other selection declares its `role` and quotes exact ordered `basis` and
`interpretation` spans. The strength/blind-spot pair must share finding support within one Pack.
The runtime resolves only prose that already passed the Pack claim gate and rejects specialist
topic laundering in the default profile. It also requires distinct finding support for the two
central mechanisms and checks that work, relationships, and optional money prose actually matches
its declared section rather than trusting the `role` label alone.

Some broad preparations still expose a required isolated draft for a Pack whose findings are all
outside the default-profile topic allowlist. Do not invent a personality claim from those findings
and do not repeat the hidden doctrine term. Submit one neutral finding-backed sentence such as
`이 근거는 기본 성향 프로필의 해석 문장으로 선택하지 않습니다.` for that Pack, then leave
the paragraph out of schema 2 `presentationDraft`. It is validation-only protocol filler and is
not rendered.

For broad presentation it replaces repeated uncertainty prose with a local `△` marker for
candidate-dependent results, a local `◇` marker for partial results, or `△◇` when both apply, then
defines the markers that appear in one legend near the basis line. The final deterministic answer
is returned at `result.presentation.markdown`. Ordinary hosts should show that Markdown as-is and
must not append `reading.notice` or another free-form synthesis.

Preparation fails early with policy `insufficient-broad-presentation-capacity` when the selected
evidence policy cannot provide seven distinct allowed paragraphs. For an open reading, use
`variantPolicy: "include-candidate-dependent"` and retain the renderer's local uncertainty markers;
otherwise switch to a narrower `focused` request. Do not wait until validation to fabricate or
reuse prose, and do not silently override a user-requested stable-only policy.

### Broad presentation draft

Use this schema 2 shape for new broad readings:

```json
{
  "presentationDraft": {
    "schemaVersion": "2",
    "kind": "default-profile",
    "thesis": {
      "paragraph": {
        "packRef": { "id": "calculation-baseline", "version": "1.1.0" },
        "source": { "kind": "summary" }
      },
      "structure": {
        "basis": "[선택한 summary에서 그대로 복사한 명식 중심 근거]",
        "portrait": "[같은 summary에서 basis 뒤에 있는 기억하기 쉬운 인물상]"
      }
    },
    "core": [
      {
        "paragraph": {
          "packRef": { "id": "ditianshui", "version": "1.0.0" },
          "source": { "kind": "summary" }
        },
        "structure": {
          "role": "core",
          "basis": "[첫 번째 중심 작용의 실제 계절·자리·반복 근거]",
          "interpretation": "[그 근거가 실제 행동에서 드러나는 모습]"
        }
      },
      {
        "paragraph": {
          "packRef": { "id": "calculation-baseline", "version": "1.1.0" },
          "source": { "kind": "section", "topic": "chart-overview", "paragraphIndex": 0 }
        },
        "structure": {
          "role": "core",
          "basis": "[첫 번째와 다른 finding을 쓰는 두 번째 배치·십신 근거]",
          "interpretation": "[첫 번째 설명과 겹치지 않는 또 다른 행동 특성]"
        }
      }
    ],
    "temperament": {
      "strength": {
        "paragraph": {
          "packRef": { "id": "ditianshui", "version": "1.0.0" },
          "source": { "kind": "section", "topic": "strength", "paragraphIndex": 0 }
        },
        "structure": {
          "role": "strength",
          "basis": "[강점과 맹점이 공유하는 실제 명식 근거]",
          "interpretation": "[강점이 드러나는 구체적인 상황과 행동]"
        }
      },
      "blindSpot": {
        "paragraph": {
          "packRef": { "id": "ditianshui", "version": "1.0.0" },
          "source": { "kind": "section", "topic": "strength", "paragraphIndex": 1 }
        },
        "structure": {
          "role": "blind-spot",
          "basis": "[강점과 같은 finding을 쓰는 실제 명식 근거]",
          "interpretation": "[같은 성향이 문제가 되기 시작하는 상황·반응·그 결과]"
        }
      }
    },
    "work": [
      {
        "paragraph": {
          "packRef": { "id": "calculation-baseline", "version": "1.1.0" },
          "source": { "kind": "section", "topic": "ten-gods", "paragraphIndex": 0 }
        },
        "structure": {
          "role": "work",
          "basis": "[일·공부와 직접 연결되는 실제 배치·십신 근거]",
          "interpretation": "[맞는 과업 방식과 그 방식이 실패하는 조건]"
        }
      }
    ],
    "money": [
      {
        "paragraph": {
          "packRef": { "id": "calculation-baseline", "version": "1.1.0" },
          "source": { "kind": "section", "topic": "ten-gods", "paragraphIndex": 2 }
        },
        "structure": {
          "role": "money",
          "basis": "[돈·자원과 직접 연결되는 실제 재성 배치 근거]",
          "interpretation": "[돈을 다루는 별도의 습관과 그 때문에 생길 수 있는 문제]"
        }
      }
    ],
    "relationships": [
      {
        "paragraph": {
          "packRef": { "id": "calculation-baseline", "version": "1.1.0" },
          "source": { "kind": "section", "topic": "ten-gods", "paragraphIndex": 1 }
        },
        "structure": {
          "role": "relationships",
          "basis": "[관계와 직접 연결되는 실제 배치·십신 근거]",
          "interpretation": "[가까운 관계에서의 반응과 오해가 생기는 구체적 조건]"
        }
      }
    ]
  }
}
```

`money` has the same one-or-two-item array shape with `role: "money"`. It is required when the
displayed ten-god row contains at least two `정재`/`편재` placements and otherwise optional. Default
profile selections may use only `chart-overview`, `day-master`, `five-elements`, `ten-gods`,
`relationships`, and `strength` findings. The two `core` selections, together with the thesis,
must combine day-master or seasonal-strength evidence with another chart placement, relation, or
ten-god axis. Every quoted span must appear exactly and in order in the selected paragraph.

### Legacy broad presentation draft (schema 1)

Use this complete shape as a sibling of `drafts` in `validate-reading`. Replace every example Pack
reference and source with an exact, distinct paragraph from the submitted drafts:

```json
{
  "presentationDraft": {
    "schemaVersion": "1",
    "kind": "broad-reading",
    "portrait": {
      "paragraph": {
        "packRef": { "id": "calculation-baseline", "version": "1.1.0" },
        "source": { "kind": "summary" }
      },
      "structure": {
        "process": "[선택 문단에서 그대로 복사한 행동 과정]",
        "identity": "[같은 문단에서 뒤따르는 인물상]"
      }
    },
    "atAGlance": {
      "disposition": {
        "paragraph": {
          "packRef": { "id": "calculation-baseline", "version": "1.1.0" },
          "source": { "kind": "section", "topic": "relationships", "paragraphIndex": 0 }
        },
        "structure": {
          "domain": "disposition",
          "direction": "descriptive",
          "situation": "[성향이 드러나는 실제 상황]",
          "behavior": "[그 상황에서의 반응]",
          "result": "[확인 가능한 결과]"
        }
      },
      "execution": {
        "paragraph": {
          "packRef": { "id": "pack-a", "version": "actual-version" },
          "source": { "kind": "summary" }
        },
        "structure": {
          "domain": "execution",
          "direction": "descriptive",
          "situation": "[실행 방식이 드러나는 실제 상황]",
          "behavior": "[그 상황에서의 행동]",
          "result": "[실제로 달라지는 점]"
        }
      },
      "relationships": {
        "paragraph": {
          "packRef": { "id": "calculation-baseline", "version": "1.1.0" },
          "source": { "kind": "section", "topic": "relationships", "paragraphIndex": 1 }
        },
        "structure": {
          "domain": "relationships",
          "direction": "descriptive",
          "situation": "[관계 반응이 드러나는 실제 상황]",
          "behavior": "[상대에게 보이는 반응]",
          "result": "[관계에서 생기는 결과]"
        }
      }
    },
    "doubleEdge": {
      "strength": {
        "paragraph": {
          "packRef": { "id": "calculation-baseline", "version": "1.1.0" },
          "source": { "kind": "section", "topic": "chart-overview", "paragraphIndex": 0 }
        },
        "structure": {
          "domain": "disposition",
          "direction": "benefit",
          "situation": "[강점이 실제로 필요한 상황]",
          "behavior": "[해당 강점의 행동]",
          "result": "[강점이 만드는 결과]"
        }
      },
      "friction": {
        "paragraph": {
          "packRef": { "id": "calculation-baseline", "version": "1.1.0" },
          "source": { "kind": "section", "topic": "chart-overview", "paragraphIndex": 1 }
        },
        "structure": {
          "domain": "disposition",
          "direction": "cost",
          "situation": "[같은 작용이 과해지는 상황]",
          "behavior": "[과해졌을 때의 반응]",
          "result": "[그 반응 때문에 생기는 문제]"
        }
      }
    },
    "workStudy": [
      {
        "paragraph": {
          "packRef": { "id": "pack-b", "version": "actual-version" },
          "source": { "kind": "summary" }
        },
        "structure": {
          "domain": "work-study",
          "direction": "descriptive",
          "situation": "[일·공부 방식이 드러나는 상황]",
          "behavior": "[그 상황에서의 작업 방식]",
          "result": "[업무나 학습의 결과]"
        }
      }
    ],
    "relationships": [
      {
        "paragraph": {
          "packRef": { "id": "pack-c", "version": "actual-version" },
          "source": { "kind": "summary" }
        },
        "structure": {
          "domain": "relationships",
          "direction": "descriptive",
          "situation": "[가까운 관계의 실제 상황]",
          "behavior": "[두 사람이 주고받는 방식]",
          "result": "[두 사람 사이의 결과]"
        }
      }
    ],
    "conclusion": {
      "paragraph": {
        "packRef": { "id": "pack-d", "version": "actual-version" },
        "source": { "kind": "summary" }
      },
      "structure": {
        "condition": "[앞선 해석을 묶는 실제 조건]",
        "payoff": "[그 조건에서 달라지는 결과]"
      }
    }
  }
}
```

For lived-pattern structures, `domain` is one of `disposition`, `execution`, `relationships`, or
`work-study`. The three `atAGlance` entries use their namesake domains, every `workStudy` entry uses
`work-study`, and every `relationships` entry uses `relationships`. The two `doubleEdge` entries
name the same domain: `strength.direction` is `benefit` and `friction.direction` is `cost`.
Other lived-pattern slots use `descriptive`; their exact situation/behavior/result spans still
carry the observable outcome. Uncertainty markers are renderer-owned output and are never supplied
inside `presentationDraft`.

Allowed section topics are:

`chart-overview`, `day-master`, `five-elements`, `yin-yang`, `ten-gods`, `relationships`,
`void-branches`, `strength`, `pattern`, `useful-god`, `growth-stages`, `luck-cycles`,
`symbolic-stars`, `compatibility`, and `timing`.

The installed `sanming-symbolic-curated@1.1.0` Pack reports 15 cited raw branch/stem matches:
travel horse, general star, canopy, Xianchi, robbery, lost spirit, disaster, six misfortune,
lonely/widow, heavenly noble, Lu, literary star, and two blade variants. It reports absence only
when all four natal branches are known; missing birth time remains an explicitly partial
observation. Xianchi qualification and blade-school differences remain visible metadata. None of
these raw matches supplies automatic 길흉, movement, travel, or event predictions.
