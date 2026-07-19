# Runbook — Zero-instruction-play gate

Owner: UX role. Commissioned when a First Playable candidate exists
(methodology/interaction-platform.md, milestone 1). Output: PASS or FAIL, in
writing, with the stall point named on any FAIL.

## What the gate tests
First Playable's own definition: one tracked object, one interaction, playable
by a stranger with zero instructions. This gate is that stranger test, run for
real — not inferred, not simulated.

## Setup
- Recruit a genuine human stranger: someone who has never seen this build,
  this project, or a briefing about it. Not a studio member, not someone who
  watched a demo, not a friend who's heard about it secondhand.
- No verbal or written instruction precedes the session. No demo first, no
  "here's how it works." Hand them the build (or point them at the
  cabinet/screen) and step back.
- Personas and simulated agents cannot run this gate. It requires a real human
  who is actually unfamiliar with the build — a simulated "fresh eyes"
  persona has read the brief and cannot be first-contact-blind. If no
  stranger is available, the gate is not run yet — it does not get waived,
  faked, or approximated with a studio member's guess.

## What the observer does
- Records only. Never coaches, hints, gestures toward controls, or answers
  questions mid-session — the moment you intervene, the result is void for
  that session.
- Times from handoff to first meaningful interaction (time-to-first-interaction).
- Notes whether the player discovers the core loop unprompted: do they find
  and repeat the one interaction on their own.
- Notes exactly where they stall, if they stall: what they tried, what they
  expected, what didn't respond.

## Pass / fail
- **PASS** — the player discovers and repeats the core interaction with zero
  prompting, verbal or written, from the observer or the build itself (no
  tutorial text, no forced instruction screen).
- **FAIL** — the player needed ANY instruction, verbal or written, at any
  point, to find or repeat the core interaction. Name the stall point
  precisely: what they were looking at, what they tried, how long before they
  gave up or asked.

## Report format
```
Zero-Instruction-Play Gate — [build/project] [date]
Player profile: [stranger, no prior exposure — confirm]
Time-to-first-interaction: [seconds/minutes]
Core loop discovered unprompted: [yes/no]
Result: PASS / FAIL
Stall point (if FAIL): [exact moment + what was tried + what was expected]
Notes: [anything observed worth carrying into the next candidate]
```

## Re-test
A FAIL is a verdict on this candidate, not the whole build. Fix the named
stall point, then re-run with a NEW stranger — the same person retesting has
already been instructed by the first pass and cannot give a clean result.
