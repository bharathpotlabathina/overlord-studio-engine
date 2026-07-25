> `{{PLUGIN}}` = the plugin root and `{{VAULT}}` = the vault path, both stated by the command that pointed you here.

# Retro Integrate — drain the retro log (Orchestrator's authority)

**Only the Orchestrator role runs this.** Analysis and integration of the retro log are the
Orchestrator's alone. Systems may be brought in for systems-/pipeline-heavy learnings; the
Director consults on what lands and **approves every gated change**.

Vault path: `{{VAULT}}`

Do the following in order:

1. **Read the unintegrated learnings.**
   Run: `grep -n -B2 '^- Status: unintegrated' "{{VAULT}}/_claude/retros/retro-log.md"`
   List each with its Learning + Target.

1.5. **Verify prior claims (the loop's closing step — runs BEFORE integrating anything new).**
   Run: `grep -n -A1 '^- Claim:' "{{VAULT}}/_claude/retros/retro-log.md"` and collect every
   Claim that has no `- Verdict:` line yet. For each, check the evidence — the retro entries,
   Signals lines, failure logs, and review findings recorded SINCE the claim was integrated —
   and append one line directly under it in the log:
   - `- Verdict: held (<date>)` — the failure class did not recur; the integration earned its keep.
   - `- Verdict: recurred (<date>, <where>)` — it came back. Flip the parent learning's
     `- Status: integrated` back to `- Status: unintegrated` with a note. A recurred claim
     means the landed rule didn't work — its rule is a candidate for revision or removal, not
     silent accumulation; it goes back through the loop via step 2 below.
   - `- Verdict: unmeasured (<date>)` — no evidence either way yet; leave the Claim open.
   Do this before step 2: verification of past changes outranks adding new ones — that is what
   makes this a closed loop instead of rule accretion. Skipping this step is not an option.

2. **Ponytail-check each proposed addition.** For every learning whose Target is a durable
   change (`kernel:<role>` / `sot-rule` / `pipeline`), ask: does this need to become a rule at
   all? Is it already covered by an existing rule? Can it be one line? A one-off insight →
   downgrade its Target to `just-noted`. Do not let the retro loop grow the studio's rules by
   reflex — that is the classic retro failure.

3. **Integrate by Target:**
   - `memory` → write the learning into the right `{{VAULT}}/_claude/memory/` file (feedback
     or project entry) and add its index line. Memory is free — write directly.
   - `kernel:<role>` / `sot-rule` / `pipeline` → **propose, never write.** Draft the change and
     route it through the gate: `/update-source-of-truth` + Director approval (consult Systems
     first for systems-heavy ones — consultation never substitutes for the gate).
   - `just-noted` → leave as recorded history. No action.

4. **Flip status.** For each learning handled, change its `- Status: unintegrated` to
   `- Status: integrated` in the retro log. Leave anything the Director defers as
   `unintegrated` — it resurfaces at the next session-open nudge. That is the point.

5. **Report:** learnings integrated (target + where landed), changes proposed to the gate
   (awaiting approval), and anything deferred. No judgment automated — the Orchestrator's call
   throughout.
