# Flags Ledger

A flag is a known "needs-rewrite / not-yet" item raised by a sweep, absorption
record, or review — the class that shipped stale docs in v0.1.0–v0.1.2 when a
correctly-raised flag had no carrier. Every such item lands here as a line, and
`tools/checks/flags-check.js` (preflight board) blocks any dist push while an
OPEN line exists.

Grammar — one flag per line, anything else is prose:

```
  OPEN: <what must land before the next dist push>
  RESOLVED YYYY-MM-DD: <what landed>
  WAIVED YYYY-MM-DD (Director): <what was waived>
```
*(examples indented — the gate reads column-0 lines only)*

Only the Director waives. Flags are never deleted — resolve or waive in place
(kills preserved).

---

RESOLVED 2026-07-20: studio-pipeline.md Release-stage rewrite (flagged by the 2026-07-19 reality sweep as "migrate-with-rewrite", shipped as-is in v0.1.0–v0.1.2; ship tail + adopted commands landed in the 2026-07-20 doc currency sweep)
RESOLVED 2026-07-20: postmortem-format.md cited release-sequence.md for the hotfix-postmortem requirement, which that file never carried (QA WARNING, v0.1.3 release pass); citation now points at release-compose.md's hotfix lane — fixed same day, rides the next push
RESOLVED 2026-07-20: release-version.md mandated R-scheme with no product-class carve-out, conflicting with the plugin's manifest-forced semver (Release Engineer finding, v0.1.3 composition); Director ruled plain semver for plugin-class products — carve-out added same day, rides the next push
RESOLVED 2026-07-20: preflight's leak-scan row was a hollow green for its whole life — the scanner was invoked with the repo directory as a FILE argument (no --repo), read nothing, and printed clean on every board ever read; the only real leak gate was the vault pre-push hook. Invocation fixed TDD red→green with stub-scanner wiring tests (preflight-leak.test.js) pinning --repo, red-propagates, and missing-scanner-is-SKIP; discovered while closing the 2026-07-19 history-leak incident, which also taught the vault scanner + push gate to scan the outgoing commit range (diffs + messages), not just the tree, and named push sanitization in the Release Engineer kernel
RESOLVED 2026-07-20: infra-check's RLS static scan false-flagged tables whose RLS is enabled by the dynamic lockdown form (4 false positives on the first product run, all live-disproven 2026-07-20); scan taught the form TDD red→green — a DO block whose dynamic `format('ALTER TABLE …%I… ENABLE ROW LEVEL SECURITY')` runs under FOREACH over a table-name array now counts as enabled, with names harvested only from arrays in that same block so an unrelated array can never silently cover a table. That repo now reports only the M4 pgpass true positive
