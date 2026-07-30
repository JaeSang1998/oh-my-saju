# Input and runtime protocol

The bundled script reads one JSON command from `--input <file>` or stdin and writes one JSON
response to stdout. The full analysis is often tens of kilobytes, so omit `--pretty` for normal
agent execution and use it only for human inspection. Exit code is zero for success, one for a
domain/validation failure, and two for unreadable JSON or CLI options.

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
    "question": "핵심 구조를 설명해줘."
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
event prediction. Plugin 0.3 hosts must present it as facts only; they must not derive favorable
periods, opportunities, burdens, advice, or events from it.

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

Allowed section topics are:

`chart-overview`, `day-master`, `five-elements`, `yin-yang`, `ten-gods`, `relationships`,
`void-branches`, `strength`, `pattern`, `useful-god`, `growth-stages`, `luck-cycles`,
`symbolic-stars`, `compatibility`, and `timing`.

The installed symbolic-star scope is deliberately narrow: the
`sanming-symbolic-curated@1.0.0` Pack reports only the cited table's year-branch travel-horse
match. It reports absence only when all four natal branches are known; missing birth time remains
an explicitly partial observation. It does not supply broad 신살 coverage, 길흉, movement,
travel, or event predictions.
