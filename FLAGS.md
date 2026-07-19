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
