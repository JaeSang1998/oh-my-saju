# Changelog

## 0.4.3 — 2026-07-30

- Require a role-complete `presentationDraft` for broad readings, select only
  already-validated atomic Pack paragraphs, require explicit domain/direction/
  situation/behavior/result structure, and render the final four-section Korean
  Markdown deterministically.
- Preserve birth-time uncertainty with local `△`/`◇` claim markers and one shared
  legend near the basis line instead of repeating a full qualifier in each
  selected paragraph.
- Fail broad preparation early when sparse stable-only evidence cannot supply
  the required nine distinct presentation paragraphs.
- Resolve doctrine opt-in separately from scientific, uncertainty, and audit
  metadata requests, so asking for 오행 no longer unlocks defensive boilerplate.

## 0.4.2 — 2026-07-30

- Replace the default broad-reading wall of prose with a compact four-section
  layout built from bullets, a paired strength/cost view, and plain Korean.
- Keep advanced doctrine such as 격국, 조후, 용신, 신살, and unresolved Pack
  candidates behind explicit user opt-in.
- Mark profile limitations and unavailable rules as non-display narrator
  guardrails so internal audit language no longer leaks into ordinary readings.
- Reject overlong narrator paragraphs and unrequested advanced-doctrine prose
  at the local validation boundary, and mark runtime notices audit-only.
- Omit element percentages and ten-god detail from the default view unless the
  user asks for them.

## 0.4.1 — 2026-07-30

- Default Korean-language birth requests to Gregorian dates, `Asia/Seoul`,
  civil time, and no apparent-solar correction unless the user supplies
  contrary evidence; a missing birth time remains an unknown-time reading.
- Make open-ended readings explain the person through concrete personality,
  pressure, work, execution, and relationship patterns.
- Keep generic workflow narration, unresolved-doctrine dumps, and scientific
  validity disclaimers out of ordinary readings while retaining audit metadata.

## 0.4.0 — 2026-07-30

- Expanded `sanming-symbolic-curated` to 1.1.0 with 15 cited, raw
  branch/stem-match rules and explicit variant/qualification metadata.
- Added transparent daily, wedding, and moving election-date ranking with
  exact Jie-month facts, day officers, yellow/black path classification,
  participant relationships, and a separately versioned product score.
- Added independent Tojeong 144-number, I Ching casting, Zi Wei 12-palace and
  14-main-star, and Liu Ren month-general/plate/four-lesson/nine-gate modules.
- Added the closed `run-traditional-system` application command while keeping
  the existing `prepare-reading` and `validate-reading` workflow compatible.
- Every new system returns source/profile versions, explicit conventions,
  reproducible traces, limitations, and `predictiveValidity:
"not-established"`; no unverified modern interpretation corpus is bundled.

## 0.3.0 — 2026-07-30

- Added deterministic Compact and Markdown views for prepared readings without dropping
  uncertainty, Pack identity, timing qualifiers, or audit metadata.
- Upgraded `calculation-baseline` to 1.1.0 with an explicit-profile 12 growth-stage observation
  that does not imply strength, favorability, or events.
- Added `sanming-symbolic-curated` 1.0.0 for a cited year-branch travel-horse match,
  complete-chart absence, or partial observation; it does not claim broad symbolic-star coverage
  or predictive meaning.
- Exposed Korean lunar-month lengths/boundaries and configurable luck-pillar counts with
  day-master-relative stem/branch ten gods through the bundled engine/application surfaces.
- Bundle `saju-engine` 0.9.0 for Node.js 18 and keep the five Pack finding sets isolated.
- Reject calendar Ganzhi claims when the redacted narration task contains no chronology or timing
  evidence.

## 0.2.0 — 2026-07-30

- Add the portable `oh-my-saju` Agent Skill.
- Bundle the independently rebuilt `saju-engine` 0.8.0 runtime for Node.js 18
  or newer.
- Add Agent Plugins 1.0, Codex, and Claude Code manifests.
- Package common structure, Ziping, Ditianshui, and Qiongtong as isolated Tradition Packs.
- Keep Pack comparison unresolved and validate every narrated paragraph against one Pack's
  finding IDs.
- Bind prepared readings to core, Pack rule digests, and reading-runtime versions.
