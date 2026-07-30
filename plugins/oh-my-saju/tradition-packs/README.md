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

- `calculation-baseline@1.1.0`: calculation-derived structure plus an explicitly parameterized
  12 growth-stage table; the stage is not an automatic strength or favorability judgment;
- `ziping@1.0.0`, `ditianshui@1.0.0`, and `qiongtong@1.0.0`: isolated classical doctrine
  candidates/evidence;
- `sanming-symbolic-curated@1.1.0`: 15 cited triad, season-corner, and day-stem raw
  symbolic-star rules, including two separately identified blade variants; complete-chart
  absence and partial observation remain distinct, with no automatic 길흉 or event claim.

`knowledge.providerContract` is intentionally backend-neutral. The current `static-files` adapter
is itself an immutable, versioned, content-addressed snapshot with an explicit provenance and query
contract. The manifest also declares the future `ontology-snapshot` and
`knowledge-graph-snapshot` adapters, while `ontology.materialization` remains `not-built`. Either
future adapter must materialize the same snapshot contract before evaluation. Runtime import of
arbitrary remote Pack code is outside version 1's trust model.
