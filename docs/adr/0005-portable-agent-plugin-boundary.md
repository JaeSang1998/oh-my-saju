# ADR 0005: Add a portable agent boundary and thin host plugins

- Status: Accepted
- Date: 2026-07-29

## Context

The engine already separates audited chronology and chart facts, package-owned interpretation
profiles, unresolved school comparison, and finding-grounded model prose. Users also want the
same capability installable in Codex, Claude Code, and other Agent Skills hosts.

Agent Skills standardizes instruction bundles but not installation, shell permissions, marketplace
policy, or host UI. Agent Plugins 1.0 now defines a portable `plugin.json` plus `skills/` package,
but it is a Working Draft and Claude Code does not yet document native support. Codex and Claude
also have different manifest and marketplace paths.

Putting host commands in the calculation engine would invert dependencies. Reimplementing pillars
or doctrine in `SKILL.md` would make results model-dependent. Letting an installed plugin import
`../../src` would work in the monorepo but fail after marketplace caching.

The codebase also uses the public term `SajuInterpretationSkill` for a package-owned doctrine
profile. That is not the same object as an Agent Skill.

## Decision

Use the following one-way delivery hierarchy. `D` denotes dependency tiers and is deliberately
distinct from the domain's `L0–L4` evidence levels:

```text
D0 birth evidence and reference data
 ↓
D1 deterministic calendar, chronology, and chart facts
 ├─ D2T deterministic timing facts ────────────────────────────┐
 └─ D2P package-owned interpretation profiles                 │
      ↓                                                       │
    D3 unresolved profile comparison                          │
      ↓                                                       │
    D4 finding-referenced narration + local profile claim gate ┤
                                                              ↓
D5 portable Agent Skill and bundled runtime
 ↓
D6 Codex, Claude Code, and other host adapters
```

1. Keep `saju-engine` and its existing subpaths as the domain source of truth.
2. Add `saju-engine/agent` as a provider-neutral application seam with two commands:
   - `prepare-reading` calculates the Korean preset and emits one redacted narration task per
     profile plus a deterministic content binding;
   - `validate-reading` recalculates from the same raw request and passes host drafts through the
     existing claim gate only when the preparation binding matches.
3. Make the JSON command envelope the shared CLI and future transport contract. Expected domain
   failures are returned as structured data.
4. Bundle the application seam into
   `plugins/oh-my-saju/skills/oh-my-saju/scripts/oh-my-saju.mjs`. The artifact requires Node.js 18
   but no repository checkout, npm installation, network, provider SDK, or host-specific runtime.
5. Keep one canonical `skills/oh-my-saju/SKILL.md` inside the self-contained plugin artifact.
   Codex and Claude point to this same directory; they do not maintain copied skill bodies.
6. Use the Agent Plugins 1.0 root `plugin.json` as the portable package manifest. Retain
   `.codex-plugin/plugin.json` and `.claude-plugin/plugin.json` as thin host
   overlay/fallback manifests, with separate repository marketplace files.
7. Ship the first version without MCP, hooks, background agents, or an always-on bootstrap. A
   future MCP server may carry the same JSON contract but may not own calculation or doctrine
   rules.
8. In architecture prose, call the engine object an **interpretation profile** and reserve
   **Agent Skill** for the portable `SKILL.md`. Keep current TypeScript names for compatibility;
   consider a deprecated alias in a future major release.
9. Preserve per-profile narration isolation. A host may present validated profile prose coherently,
   but it may not pool raw findings, hide disagreements, or promote model synthesis to a
   deterministic result.
10. Keep timing as a sibling deterministic-fact branch, not an input to interpretation profiles.
    Version 0.1 may display timing boundaries, pillars, ten gods, and approximate-luck qualifiers,
    but must not turn them into event or favorability claims. A later release needs versioned timing
    findings and claim-gated narration before making those interpretations.

## Consequences

- A Git-cached plugin runs without paths outside its own directory.
- Codex, Claude, and a generic Agent Skills host share calculation and validation behavior even
  when their UI and invocation syntax differ.
- Host-generated prose remains flexible, while fabricated finding IDs and uncertainty violations
  fail locally.
- The core remains independently usable as a library and does not depend on plugin formats.
- Agent Plugins adoption can expand without removing the Claude adapter prematurely.
- The checked-in bundled script is generated code and must be rebuilt and smoke-tested when
  `src/agent/**` or a transitive domain dependency changes.
- Plugin and engine versions may evolve independently; the release manifest records both.

## Alternatives rejected

### Put Claude and Codex instructions in separate skills

This creates behavioral and version drift in the source of the workflow. Only host metadata and
tool translation should differ.

### Ask each model to calculate Saju from prose instructions

This discards the calendar, time-zone, uncertainty, source, fixture, and authenticity invariants.

### Make MCP mandatory in the first release

The local deterministic runtime already supplies the required portability without operating a
server, choosing authentication, or sending birth data over a network.

### Expose arbitrary third-party doctrine code through the plugin

That would bypass package-owned rule IDs, source lineage, fixture digests, and comparison
coordinates. New doctrine belongs in a reviewed engine profile, not executable skill content.

### Trust a serialized calculation report during validation

The engine deliberately authenticates in-process reports. Recalculation from the raw request
preserves that boundary and prevents edited JSON from claiming engine provenance.
