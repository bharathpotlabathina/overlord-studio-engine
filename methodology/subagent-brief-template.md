# Subagent Brief Template (dispatch contract)

Subagents start cold — no session context, no memory, no prior work. Every brief is
self-contained and carries the **4-part contract** below plus the pre-flight
questions section. `template-lint.js` enforces the structure; a brief missing a
required section does not dispatch.

**Hard worker ceiling: 5 concurrent workers per dispatch wave.** More workers than
that is a decomposition smell, not a throughput win.

**Decompose by owned resource, not by problem type.** One file / repo / namespace /
artifact = one owner. Two workers who can touch the same resource is how the
four-branches-claiming-017 class of collision happens; the resource boundary IS the
task boundary.

---

## Required sections (lint-enforced)

### ## Objective
Who the agent is (one line of judgment lens), what situation it is walking into
(2–4 lines: project, what was just done, why this matters now), and exactly what to
do — specific checks listed explicitly, not "review X". For research: the literal
search targets, not the topic.

### ## Output format
Exactly what to return: structure (table / bullets / severity labels), length limit,
and what "done" looks like. E.g. findings as **[BLOCKER]/[WARNING]/[MINOR]**, end
with HOLD or CLEAR verdict; "under 300 words; if you can't find it, say so rather
than guessing."

### ## Tool guidance
Exact paths to read (never make the agent guess), which tools to use or avoid,
model expectations if relevant. Read-only vs write authority stated explicitly.

### ## Explicit boundaries
What the agent must NOT do. Prevents the common failure modes: "report only, do not
fix" · "do not guess — a source you can't find is reported as not found" · "never
claim repo state from memory — verify against files" · "touch only the files named
above."

### ## Questions / answers / defaults
The Non-Blocking Law's pre-flight record. The dispatcher runs the iterated
interrogation loop BEFORE launch: analyze → surface every question (important AND
trivial) → collect rulings + authorized defaults → re-analyze with answers folded
in → repeat to the zero-new-questions fixed point. This section records the final
Q/A/default list and the round count:

```
Rounds: N
Q: <question>  A: <ruling or authorized default>
...
```

An unasked question at launch is a prep failure. **`Rounds:` > 3 is the standing
performance benchmark tripwire** — the lint auto-files a retro-log entry naming the
scoping failure (the run was under-scoped: split it, don't launch it).

---

## Quick patterns

**QA:** objective = "find what breaks, not what works"; boundaries = "do not
summarise what you checked — only report findings."

**Research:** objective carries the literal queries; output = numbered findings +
sources; boundaries = "no guessing; absence is a finding."

**Build:** objective = feature spec with edge cases ("add Y to file Z so that W");
tool guidance = exact files + test command; boundaries = "one writer per file;
tests must pass before reporting DONE."
