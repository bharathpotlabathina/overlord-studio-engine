> `{{PLUGIN}}` = the plugin root and `{{VAULT}}` = the vault path, both stated by the command that pointed you here.

Vault path: `{{VAULT}}`

Do the following in order:

1. **Run updater agent** — sync internal docs that drifted this session.
   Dispatch a subagent with this exact prompt:
   ```
   You are the Studio Updater. Your only job is to sync internal documentation that drifted during this session.

   Scope: ONLY these paths — `_claude/` and `Projects/*/docs/`. Touch nothing else.
   NEVER touch `Projects/*/sot/`. Source-of-truth files require the /update-source-of-truth gate and Director approval — the updater has no authority here.

   Steps:
   1. Read `git diff HEAD~1 --name-only` and `{{VAULT}}/_claude/HANDOFF.md` to understand what happened this session.
   2. Run `git -C "{{VAULT}}" diff HEAD~1 --name-only` to see what changed.
   3. For each changed file, check if any `_claude/` memory file or `Projects/*/docs/` reference doc contains stale facts about it (wrong status, old schema, old command, wrong path).
   4. Patch stale lines in-place. One sentence max per patch. Do not rewrite sections.
   5. If something needs a Director decision to update correctly, REPORT it as a `⚠️ [filename]: [what needs deciding]` line in your return text. Do not write it to a file — step 2 owns the card, and two writers to one file is how it drifts. Do not guess.
   6. Report: files patched (list) + flags raised (list). Nothing else.
   ```
   If no files changed or scope is unclear, skip and note it.

2. **Write session handoff card.**
   Write `_claude/HANDOFF.md` in the vault root (`{{VAULT}}/_claude/HANDOFF.md`). **Re-read the
   current file FIRST — it may have changed since session start (parallel sessions on one vault
   are normal; a card written from a stale snapshot silently resurrects finished work).** Then:

   - **Prepend your card at the top.** If the file holds a card from a DIFFERENT session, keep
     it below yours, intact — never delete, merge, or rewrite another session's card, and never
     copy its pending items into your own card (their card already says it; a copy goes stale).
   - **Keep at most the 2 most recent cards**; drop older ones (history belongs in
     `_claude/session-log.md`).
   - A card whose items YOUR session resolved may be annotated in place (strikethrough + "done")
     — that is correcting stale state, not rewriting their card.

   Card format:

   ```markdown
   # Session Handoff — <YYYY-MM-DD> (<short session slug>)

   ## Summary
   <One paragraph: what was worked on and what state it's in.>

   ## Active at close
   - **Project:** <project name>
   - **Role:** <role name, or "none">

   ## Next actions
   - <bullet>
   - <bullet>

   ## Pending Director decisions
   - <bullet, or "None">
   ```

   This is the restore card and the state of record. Keep it a card stack, not a log: at most
   two cards, newest on top. A second card below yours means a parallel session closed recently —
   whoever resumes reads both.

3. **Update active context.**
   - If any new preferences, decisions, or project facts were established, write them to the appropriate memory file and update MEMORY.md.

4. **Append session-log entry.**
   Append exactly one line to the bottom of `{{VAULT}}/_claude/session-log.md`, in the file's exact format:
   ```
   YYYY-MM-DD · [project or "studio"] · [role or "none"] · [one-line outcome]
   ```
   Newest entries at bottom. The summary is fresh from steps 2–3 — write it here so it rides the commit in step 7. There is no hook or script behind this file; this step *is* the mechanism. Skip it and the log silently stops (as it did between 2026-06-23 and 2026-07-07).

5. **Session checklist** — verify, do not answer from memory:
   - [ ] **Restore card accurate:** Read `_claude/HANDOFF.md`. Confirm it reflects the session outcome.
   - [ ] **Memory files current:** New rules, feedback, or project facts captured where appropriate.
   - [ ] **Session-log appended:** Confirm one line for this session was added to `session-log.md` (step 4).
   - [ ] **No unresolved open items:** Anything raised but not resolved is noted in `_claude/HANDOFF.md`.
   - [ ] **Vault clean:** Run `git -C "{{VAULT}}" status`. Stage and commit anything outstanding.
   - [ ] **Other repos clean:** If `_claude/repos.local` exists, run `git -C "<repo>" status --short` for each listed repo (skip the vault — already checked above). Report any repo with uncommitted changes.

   If this session touched a plan or spec document (SPEC, GDD, BRIEF, OPEN-TASKS, etc.), also verify:
   - [ ] **Decisions landed:** Grep affected docs for stale pre-decision text.
   - [ ] **Open items / risk tables current:** Read Open Items and Risks sections; confirm resolved items marked.

6. **Atlas staging sweep.** If `_claude/atlas-staging/*.proposed.json` exists, run the `/atlas-map-review` flow with the Director — per-item confirms and the literal "go", as always. If the Director declines the sweep, the proposal stays staged for next session (durable, never auto-dropped). Staging flips during the session is `node {{PLUGIN}}/tools/atlas-map-check.js propose-flip <CAP-id> <state> ...` at each phase gate — one offer, no nagging.

7. **Commit and push vault changes.**
   Note: always push — auto-commits may have happened during the session without a push.
   Run: `cd "{{VAULT}}" && git add . && (git diff --cached --quiet || git commit -m "Session close - [one-line description of what happened]") && git push`
   Use a meaningful commit message, not a generic placeholder.

8. **studio phase status.**
   Run: `node "{{PLUGIN}}/tools/atlas-map-check.js" phases "{{VAULT}}/_claude/studio-atlas-map.json"`
   Output the result verbatim under the heading `studio:`. One line per phase, straight from the script — the map is the only status source of truth. No prose, no re-deriving from the backlog.

9. **Confirm to the Director:** what was committed, what was saved to memory, and the status of other repos in `_claude/repos.local` (clean, or which have uncommitted changes). Include one line: skills fired this session (tail the invocation log since session start) vs the non-negotiable expected set — report only, no judgment automated. Sign off cleanly.
