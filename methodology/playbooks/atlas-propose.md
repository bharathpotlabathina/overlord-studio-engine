> `{{PLUGIN}}` = the plugin root and `{{VAULT}}` = the vault path, both stated by the command that pointed you here.

Vault path: `{{VAULT}}`

/atlas-propose — Atlas-driven work-item intake. The head proposes; the Director decides. All paths below are relative to the vault path above. Do the following in order:

0. **Validate the map.** Run:
   ```
   node {{PLUGIN}}/tools/atlas-map-check.js validate _claude/studio-atlas-map.json
   ```
   On any non-zero exit: show the full output and STOP — a broken or unreadable graph produces no proposals, not wrong ones. Corrections route through /atlas-map-review, never through this command.

1. **Check for an in-progress sprint first.** Read `.superpowers/sdd/progress.md` (file missing = nothing in progress). Collect entries matching the prefix pattern `CAP-0NN Task M:`. For each capability id found, locate its sprint plan: the file under `docs/superpowers/plans/sprints/` whose header block contains `**Capability:** CAP-0NN`. Count `### Task` headings in that plan vs. that capability's completed ledger entries. If completed < total, the sprint is in progress — offer:

   > "Sprint for CAP-0NN in progress (X of Y tasks). Resume, or check for something new?"

   On "resume": invoke the superpowers:subagent-driven-development skill continuing at the next incomplete task — no re-brainstorm, no re-plan. On "something new": continue to step 2.

2. **Bucket the backlog.** Read `_claude/studio-atlas-map.json`. Take every capability whose state is not `Live` and not `Graveyard` (Graveyard caps are tombstones — never list them; their `replaced_by` successor, if any, is the live item). Split them exhaustively — every such capability lands in exactly one group, keyed on `Requires` edges only, never on the capability's own state label:
   - **Dependency-driven:** has ≥1 `Requires` edge AND every `Requires` target is `Live`. (Discussed, Designed, Ready, Built, Gated, or Blocked all qualify — the rule is about the edges.)
   - **Unconstrained:** zero `Requires` edges.
   - **Still-blocked:** has ≥1 `Requires` edge with at least one non-`Live` target.

   Present dependency-driven first (these are actually unblocked — say which satisfied `Requires` unblocked each), then unconstrained (label each "unconstrained — your call", never imply newly unblocked), then still-blocked last (informational only, labeled "blocked on [the non-Live target(s)]", NOT offered as a pick). One line per capability: id, name, own state, phase/track tags if present.

   The Director picks one capability from the offered groups (dependency-driven or unconstrained), or declines. Decline = stop cleanly, no state touched.

3. **Handoff to the pipeline.** On a pick, invoke the superpowers:brainstorming skill in this session with the capability's id, name, description, purpose, current state, tags, and dependency status as context. Brainstorming's own gates (design approval, spec self-review, user spec review) all still apply — this command weakens none of them. When writing-plans follows, file the plan as a sprint: `docs/superpowers/plans/sprints/YYYY-MM-DD-<capability-slug>.md`, with `**Capability:** CAP-0NN` as the first line after the title — that line is what step 1 greps for on a future resume.

4. **Execution checkpoint.** Before subagent-driven-development dispatches a single implementer subagent, stop distinctly and unmistakably:

   > "Sprint plan ready: N tasks for CAP-0NN. Type 'go' to start execution."

   Nothing dispatches before that literal confirmation. This is not folded into any earlier question.

5. **Execution.** subagent-driven-development runs as normal, logging to `.superpowers/sdd/progress.md` with the `CAP-0NN Task M:` prefix — exactly what step 1 reads next time. When the sprint's final task passes review, say so and offer to stage the capability's state flip (`node {{PLUGIN}}/tools/atlas-map-check.js propose-flip <CAP-id> <state> ...`, swept at /logout via /atlas-map-review) — one offer, no nagging; nothing lands without the Director's per-transition confirmation (the backlog loop).

Out of scope (locked): writing any state change back to the map. When a sprint completes, say so — the state flip routes through /atlas-map-review.
