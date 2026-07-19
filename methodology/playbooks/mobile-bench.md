# Runbook — Mobile-role, benched

Owner: Mobile-role. Trigger: none standing — this runbook is reference for the
role's current state, ratified 2026-07-19 (zero retirements stands; a benched
role is a file, not a moving part).

## What "benched" means operationally
- The kernel (`personas/mobile-kernel.md`) stays current and lint-conforming —
  it is rebuilt to the latest `KERNEL-CONTRACT.md` alongside every other role,
  same as an active role. Benched is not neglected.
- `standing-events: []` — no event fires this role automatically. It does not
  wake up on its own for any studio event.
- Dispatch happens only on an explicit mobile build commissioned by the
  Orchestrator or the Studio Director. Absent that commission, the role does
  nothing.

## Revisit trigger
The food-app collaboration's v3 becoming a real mobile build. That is the
named condition — not a calendar date, not a general "mobile might matter
again" feeling. Until v3 concretely calls for a mobile client, the bench
status holds.

## Un-bench procedure
1. The Studio Director rules the role active (a mobile build is real and
   commissioned — not speculative).
2. `standing-events` in `personas/mobile-kernel.md` frontmatter is updated to
   name the event(s) that should fire it, and `## Event Wiring` is rewritten
   to match — an empty array with prose claiming otherwise is a lint-shaped
   lie.
3. Once active, the role's build work runs under the discipline in
   `methodology/playbooks/build-lane.md` — that file is the build-lane
   contract every active build role inherits; reference it by this path
   regardless of whether it exists yet in this checkout.

Un-benching is not a kernel rewrite. The identity, chain of command, and
behavioural rules in `mobile-kernel.md` already hold — only the frontmatter,
`## Event Wiring`, and the live build-lane discipline change.
