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
spot, work, and relationships; money is optional. The thesis quotes exact ordered `basis` and
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
        "basis": "자월의 임수 일간에 월주와 일주의 임자가 겹쳐",
        "portrait": "자기 동력을 어디로 흘려보내느냐가 삶의 중심이 되는 명식입니다"
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
          "basis": "임수는 자월에서 계절적으로 왕하고 비겁 근거가 반복됩니다",
          "interpretation": "힘이 모자라기보다 강한 자기 동력을 어디로 흘릴지가 중요합니다"
        }
      },
      {
        "paragraph": {
          "packRef": { "id": "calculation-baseline", "version": "1.1.0" },
          "source": { "kind": "section", "topic": "chart-overview", "paragraphIndex": 0 }
        },
        "structure": {
          "role": "core",
          "basis": "월주와 일주가 모두 임자로 중첩됩니다",
          "interpretation": "같은 기둥의 반복이 자기 기준을 명식의 중심축으로 만듭니다"
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
          "basis": "자월의 임수가 계절 힘을 받고 비겁 근거가 거듭됩니다",
          "interpretation": "자기 기준이 선 뒤에는 긴 호흡으로 밀고 가는 힘이 있습니다"
        }
      },
      "blindSpot": {
        "paragraph": {
          "packRef": { "id": "ditianshui", "version": "1.0.0" },
          "source": { "kind": "section", "topic": "strength", "paragraphIndex": 1 }
        },
        "structure": {
          "role": "blind-spot",
          "basis": "자월의 임수와 비겁 근거가 겹치는 힘이 과해지면",
          "interpretation": "외부의 제동을 간섭으로 받아들여 방향 수정이 늦어질 수 있습니다"
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
          "basis": "시주의 상관·편재는 표현과 현실 결과로 이어지는 통로입니다",
          "interpretation": "문제를 정의하고 결과물을 만드는 역할에서 이 축이 잘 살아납니다"
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
          "basis": "월주와 일주의 비견·겁재는 가까운 관계에서도 자기 판단권을 지킵니다",
          "interpretation": "서로의 독립 영역이 분명할 때 편하고 통제로 느끼면 힘겨루기가 생깁니다"
        }
      }
    ]
  }
}
```

`money` has the same one-or-two-item array shape with `role: "money"` and is optional. Default
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
        "process": "상황을 넓게 살핀 뒤 자기 기준으로 방향을 잡는",
        "identity": "사람입니다"
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
          "situation": "낯선 문제가 생기면",
          "behavior": "핵심 변수를 찾고",
          "result": "빠뜨림을 줄입니다"
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
          "situation": "마감과 기준이 선명하면",
          "behavior": "판단을 밀고 나가고",
          "result": "실행이 분명해집니다"
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
          "situation": "의견이 다를 때",
          "behavior": "논리를 정리해 설명하고",
          "result": "결론을 분명히 합니다"
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
          "situation": "정보가 많을수록",
          "behavior": "연결점을 찾아 정리하는",
          "result": "힘이 살아납니다"
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
          "situation": "정답 기준이 없으면",
          "behavior": "비교를 계속해",
          "result": "마무리가 늦어집니다"
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
          "situation": "제출물이 정해진 과제에서는",
          "behavior": "자료를 구조화해",
          "result": "완성도를 높입니다"
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
          "situation": "가까운 사이에서도",
          "behavior": "과정과 결론을 나누어 말하면",
          "result": "오해가 줄어듭니다"
        }
      }
    ],
    "conclusion": {
      "paragraph": {
        "packRef": { "id": "pack-d", "version": "actual-version" },
        "source": { "kind": "summary" }
      },
      "structure": {
        "condition": "기준과 마감에 연결할 때",
        "payoff": "강점이 안정적으로 살아납니다"
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
