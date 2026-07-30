# Architecture and execution contract

## The hierarchy

Oh My Saju preserves a one-way dependency graph. `D` denotes a dependency tier, not the core's
separate `L0–L4` evidence classification:

```text
D0  tzdb, astronomical terms, Korean lunar data, independent fixtures
 ↓
D1  saju-engine: deterministic chart, uncertainty, and timing facts
 ↓
D2  Tradition Packs: sources + rules/tables + profile + deterministic helper + provenance
 ↓
D3  Pack runtime: isolated finding sets + unresolved comparison
 ↓
D4  Reading runtime: finding-referenced narration + local claim gate
 ↓
D5  Application protocol: prepare-reading → host drafts → validate-reading
 ↓
D6  Agent Skill workflow
 ↓
D7  Codex, Claude Code, or another host adapter
```

Dependencies point downward only. `saju-engine` does not contain a tradition, a reading service, an
agent protocol, or host metadata. A Pack consumes the public core calculation surface. The Reading
runtime consumes Pack findings but cannot silently add rules. The Agent Skill calls the bundled
application protocol and does not implement calendar or doctrine rules.

Timing is a deterministic core/application branch. Plugin 0.4 may display timing facts, but it
does not turn them into favorable-period, burden, opportunity, or event claims. That would require
a separately versioned timing Tradition Pack and the same finding claim gate.

## Pack, profile, and Agent Skill are different

- **Tradition Pack**: a distributable knowledge unit containing a manifest, locked sources,
  rules/tables, a profile, provenance, fixtures, and optional deterministic helper code.
- **Rule profile**: the Pack-internal selection and parameters used to produce one isolated finding
  set. Finding IDs use the profile ID for stable evidence identity.
- **Agent Skill**: this directory and `SKILL.md`; it teaches a host how to execute the workflow.
- **Plugin**: the installation envelope that carries Packs, runtime, Skill, and host metadata.

A lookup table such as a Qiongtong day-master/month-branch table belongs to its Tradition Pack.
Querying that table can be deterministic without turning its result into a core fact. Installing a
new Agent Skill does not add or mutate Pack rules.

## Trusted calculation boundary

The portable runtime always starts from the raw structured birth request and calls its bundled
public `saju-engine` interface. A caller cannot submit edited pillars or a deserialized calculation
report as trusted evidence.

In-memory report identity is a local implementation guard, not authentication. Persistence or
cross-process publisher authentication would require a signed envelope, not a JavaScript `WeakSet`
or a bare SHA-256 digest.

## Installed Packs and profile identity

The Korean preset currently installs:

- Pack `calculation-baseline@1.1.0`, profile `common-structural@1.1.0`, including the explicitly
  parameterized 12 growth-stage lookup with no automatic strength or favorability meaning;
- Pack `ziping@1.0.0`, profile `ziping-month-command@1.0.0`;
- Pack `ditianshui@1.0.0`, profile `ditianshui-strength-evidence@1.0.0`;
- Pack `qiongtong@1.0.0`, profile `qiongtong-climate@1.0.0`;
- Pack `sanming-symbolic-curated@1.1.0`, profile `sanming-symbolic-curated@1.1.0`, with 15
  separately cited raw symbolic-star rules, explicit blade variants, and no automatic 길흉 or
  event meaning.

Each Pack produces findings from its own source lineage. Narration tasks contain one Pack finding
set only. Never pool raw findings into one provider prompt, average disagreements, or select a
winner by vote.

The comparison layer may expose agreement, disagreement, Pack-only coordinates, unavailable
rules, and candidate-dependent results. Every row remains `reported-unresolved`; these are outputs,
not defects to smooth over.

## Pack trust and future knowledge backends

Plugin 0.4 statically registers built-in Pack code. It never imports executable code from an
arbitrary manifest path, Git repository, or model response. Every Pack's rules artifact digest
covers its declared sources, data, evaluator, and shared deterministic rule runtime.

The Pack manifest is also the stable seam for later knowledge adapters. A future Pack may resolve
the same source/rule identifiers from an ontology or knowledge graph, provided it materializes a
versioned snapshot, declares its query semantics and provenance, and produces the same validated
Pack contract. A mutable graph query is not silently treated as the same Pack version.

## Narration boundary

`prepare-reading` removes raw structured birth data, chronology, original time-evidence wording,
and internal finding values from each provider-neutral narration task. It sends a bounded set of
statements and finding IDs.

The preparation binding covers:

- core name, version, schema, and source revision;
- every Pack ID/version, profile ID/version, contract schema, and rules artifact digest;
- reading runtime, prompt template, output schema, and claim-gate versions;
- the analysis, timing report, and complete narration task set.

`validate-reading` recalculates that contract and then enforces the exact expected Pack/draft set,
plain-text output schema, allowed finding references for every paragraph, uncertainty labels, and
narrator audit metadata. The digest detects mismatch; it is not a secret, signature, or publisher
identity.

The host still sees the user's conversation. This boundary limits a separate narration call; it
does not claim that the host itself never received the birth input.

## Unsupported conclusions

The preset deliberately does not manufacture deterministic final values for:

- final pattern;
- final strength;
- final useful god;
- broad symbolic-star coverage or symbolic stars as outcomes;
- personality, compatibility, or event prediction;
- definitive luck-cycle events.

A model may explain Pack evidence and make a labeled, conditional inference. It must not describe
an unsupported synthesis as a calculated fact, or interpret the separate timing branch until a
versioned timing Pack and claim gate exist.

## Adding another host

A new host adapter may define installation metadata and translate generic actions to host tools.
It must reuse the same `SKILL.md`, bundled runtime, command schema, and validation phase. Host
hooks, UI, subagents, and MCP are optional extensions. They do not belong in the core or a
Tradition Pack.
