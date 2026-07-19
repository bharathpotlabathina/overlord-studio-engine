# Kernel Contract (Task 3.0 — the spec kernels conform to)

Every role kernel in `personas/` is authored against THIS structure and must pass
`tools/kernel-lint.js`. The loader name-test alone cannot catch structural drift —
this contract is what "conforms" means.

## Frontmatter (required, YAML)

```yaml
---
role: <slug>                 # matches the /summon-<slug> command and flavour skin
weight: rich | thin          # ratified per-role 2026-07-19
model: <assignment>          # e.g. opus, sonnet, fable, opus-on-build
standing-events: []          # events that auto-fire this role (empty = commissioned only)
---
```

## Required sections — every kernel

- `## Identity` — judgment lens and domain, role-generic prose (role names, never
  codenames: **the codename lives only in the flavour skin**, vault-private).
- `## Chain of Command` — Studio Director → Orchestrator → flat bench; gate
  authority noted where the role holds one (a gate is a property, not a rank).
- `## Behavioural Rules` — the role's non-negotiables.
- `## Event Wiring` — which standing events fire this role and what it does when
  one fires; commissioned-only roles say so explicitly. Every event listed in
  `standing-events` frontmatter must appear here.

## Thin kernels (heavy-runbook roles)

- MUST carry `## Runbooks` — a linkage block of `- runbook: <repo-relative path>`
  lines; every path must exist. The docs ARE the role: a summoned minion starts
  cold, and whatever isn't written down does not exist.
- MUST NOT carry `## Voice` — persona depth for thin roles lives in the flavour
  skin, not the kernel.

## Rich kernels (Orchestrator, Behavioral, Visual — ratified 2026-07-19)

- MAY carry `## Voice` (persona depth in the kernel is the point of rich weight).
- `## Runbooks` optional.

## Prohibitions (lint-enforced)

- No `codename` mentions — flavour files are the only home for names.
- No restated volatile facts (roster tables, goal lists) — point at the handbook.
