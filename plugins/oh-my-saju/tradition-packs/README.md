# Tradition Packs

A Tradition Pack is a versioned knowledge artifact, not an Agent Skill and not part of
`saju-engine`.

Each Pack owns:

- `tradition-pack.json`: identity, knowledge adapter, runtime entry points, output isolation;
- `sources.json` + `sources.ts`: authoritative source ledger and its typed runtime adapter;
- `rules.json` and optional tables: deterministic rule data;
- `profile.ts`: the finding profile carried by the Pack;
- optional deterministic helper modules;
- `provenance.json` + `provenance.ts`: source/rule trace contract and typed artifact declaration;
- `fixtures.json`: fixture-set IDs and the exact fixture files covered by their digest;
- `artifacts.json`: derived content digests (excluded from its own digest to avoid recursion).

The dependency direction is:

```text
saju-engine public facts → Tradition Pack → reading runtime → application protocol → Agent Skill
```

Pack outputs are isolated finding sets. Comparison may report agreement or disagreement, but it
does not vote, rank, or flatten findings into one verdict.

The built-in catalog contains:

- `calculation-baseline@1.2.0`: calculation-derived structure, the solar-term position of the
  birth instant, plus an explicitly parameterized 12 growth-stage table; the stage is not an
  automatic strength or favorability judgment;
- `ziping@1.2.0`: month-command hidden stems, the 월률분야 governing day, unranked pattern
  candidates, plus a Pack-local pattern decision (lu/blade/peer month branches leave the inner
  eight patterns) and success-defeat judgement with its own relief-god and breaking-factor
  tables; the relief god is this Pack's useful god, never the plugin's final one, and an absent
  relief god is reported as a fall back to strength balancing;
- `qiongtong@1.2.0`: the transcribed climate-candidate table, a modern 한난조습 index, a
  transparency-and-root condition check per candidate, and a Pack-local first-priority climate
  candidate that is explicitly not the plugin's final useful god;
- `ditianshui@1.2.0`: seasonal state, a damage-adjusted rooting ledger (clash 0.5, punishment 0.8,
  multiplied), a Pack-local 100-point position-weighted strength verdict, and the 종격·화격·일행득기격
  conditions; the score profile and thresholds are this Pack's own and differ by school, and no
  fortune or event meaning is attached;
- `sanming-symbolic-curated@1.2.0`: 17 raw symbolic-star rules — cited triad, season-corner, and
  day-stem tables, two separately identified blade variants, and the 원진/귀문 pair tables that are
  deliberately kept apart because they agree on only four of six pairs; complete-chart absence and
  partial observation remain distinct, with no automatic 길흉 or event claim;
- `xingchong-resolution@1.0.0`: Pack-local 방합·삼합·육합·천간합 tables, the four-condition
  transform test, and a bounded two-pass 탐합망충/충해합 resolution order; formation, suppression,
  and distance coefficients only, never a fortune claim.

`knowledge.providerContract` is intentionally backend-neutral. The current `static-files` adapter
is itself an immutable, versioned, content-addressed snapshot with an explicit provenance and query
contract. The manifest also declares the future `ontology-snapshot` and
`knowledge-graph-snapshot` adapters, while `ontology.materialization` remains `not-built`. Either
future adapter must materialize the same snapshot contract before evaluation. Runtime import of
arbitrary remote Pack code is outside version 1's trust model.

## Korean statement formatting

Statements are Korean sentences with Pack values interpolated into them, so the 조사 (particle)
after every interpolated stem, branch, element, name, or score has to be chosen at run time.
Packs must not hard-code a particle after an interpolation. The shared helpers in
`runtime/traditions/rule-helpers.ts` (`withTopicParticle`, `withSubjectParticle`,
`withObjectParticle`, `withComitativeParticle`, `withAdverbialParticle`, `withCopulaClause`) own
that choice. Particle selection is Korean text formatting, not doctrine, so it lives in the shared
runtime rather than in any single Pack.

Two conventions are fixed there because style guides disagree:

- **A parenthetical is skipped whole.** `화격(목)` agrees with `격` and
  `관살(연간 경 투출, 지지 뿌리 없음)` agrees with `살`, following the rule that bracketed text is
  supplementary and is not read aloud. Quotation marks are skipped but their contents are not.
- **A trailing digit is read in Sino-Korean** (0 영 · 1 일 · 2 이 · 3 삼 · 4 사 · 5 오 · 6 육 ·
  7 칠 · 8 팔 · 9 구), the last digit of a decimal deciding. ㄹ takes the short adverbial `로`
  (일로 · 칠로 · 팔로), every other 받침 takes `으로`.

`rule-helpers.test.ts` pins both conventions.
