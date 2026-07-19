# Studio Documentation Protocol
**Spec:** `docs/superpowers/specs/2026-06-28-doc-protocol-design.md`
**Applies to:** new projects only. Existing projects migrate on Director trigger.

---

## Folder structure

```
Projects/<project-name>/
├── sot/                            ← chmod 444. Director-approved writes only.
│   ├── <name>-strategy.md          ← mandatory
│   ├── <name>-spec.md              ← mandatory
│   ├── <name>-qa.md                ← additive
│   ├── <name>-gdd.md               ← additive (LBE, Game; Platform if engagement grows)
│   ├── <name>-visual.md            ← additive (any project with designed UI)
│   └── <name>-hardware.md          ← additive (if hardware layer)
├── sessions/                       ← always writable. All ephemeral docs.
│   └── archive/                    ← stale session docs move here
├── calibration/                    ← additive (hardware layer only)
├── open-tasks.md                   ← dynamic bug/task tracking. Not source-of-truth.
├── wiki/                           ← NOT BUILT — the compiled-wiki layer went Graveyard 2026-07-15 (builds the class of derived view that lies); kept in the tree diagram as a tombstone, kills preserved
└── <name>-board.md                 ← backlog + parking lot
```

## Doc set

Every project starts with: `strategy` + `spec` + `board` + `open-tasks`. Everything else additive.

## Source-of-truth gate

All sot/ writes require **explicit Director approval**.

```
sessions/ output → Director approves → orchestrator or systems lands → chmod 444 re-applied
```

- Sessions → sot/strategy: orchestrator lands it
- Sessions → sot/spec, qa, gdd, visual, hardware: systems lands it
- Git is the changelog. No in-file history.

## sessions/ naming convention

```
sessions/<role>-<topic>-<YYYY-MM-DD>.md
```

Examples: `sessions/systems-wave3-plan-2026-06-28.md`, `sessions/qa-qa-report-2026-07-01.md`

Active doc: `sessions/` root. Complete/superseded: move to `sessions/archive/`. Build reports archive. Scratch notes delete.

## Key boundary rules

1. Business rule: one sentence in strategy (Locked Decisions), enforceable form in spec (Business Rules). Spec wins on divergence.
2. Numbers: spec is authoritative. GDD references spec; never defines numbers.
3. Integrations: logical contract → spec. Protocol-at-the-pin → hardware.
4. Bugs: dynamic → open-tasks.md. Verified persistent regressions → qa.md Known Issues.
5. board.md is never cited as authority.
6. Git is the changelog. `git log -- sot/<filename>` is the audit trail.

## sot/ doc standard sections

| Doc | Sections |
|---|---|
| strategy | Vision · Goals & Success Criteria · Stakeholder & Audience Context · Current Phase/Milestone · Locked Decisions · Scope Boundaries |
| spec | Implementation Map · Entity Model (built ✅ / pending ⏳) · State Machines · Business Rules · Formulas & Thresholds · Integrations & Interfaces · Migration History |
| qa | Test Cases · Acceptance Criteria · Known Issues & Regressions |
| gdd | Experience Pitch · Core Loops · Reward & Progression · Monetisation · Surface & Session Profile (one block per surface) |
| visual | Visual Direction · Design Tokens · Icon Direction · Component Notes |
| hardware | Bill of Materials (versioned) · Wiring & Assembly · Calibration · Integration Protocols |
| board | Backlog · Parking Lot |

## Studio pipeline connections

| Project doc | Studio connection |
|---|---|
| `<name>-board.md` | Studio concerns → moved to `_claude/backlog.md` |
| `sot/<name>-strategy.md` | MEMORY.md: `[Project Strategy](path) — one-line status + phase` |
| `sot/<name>-spec.md` | MEMORY.md: `[Project Spec](path) — one-line technical status` |
| `wiki/<name>-digest.md` | ~~MEMORY.md: `[Project Digest](path) — compiled synthesis`~~ (Graveyard 2026-07-15 with the wiki layer — no digests are produced; row kept as tombstone) |
| Open sessions/ brief | Named in `_claude/HANDOFF.md` |
