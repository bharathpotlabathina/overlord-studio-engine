# Postmortem format (radically slimmed)

One dated paragraph per incident. Near-misses count. Blameless — mechanisms fail,
not people. Filed in the private vault under `_claude/postmortems/` as
`YYYY-MM-DD-<slug>.md`; the format is lint-checked (`postmortem-lint.js`).

Required lines (lint-enforced):

```
# YYYY-MM-DD — <one-line incident name>
What: <what happened, 1-2 sentences>
Why: <root cause, 1-2 sentences>
Fix: <what stopped the bleeding>
Corrective action: <the mechanism change that makes recurrence structural, with its task/wire reference>
Status: filed | open
```

`Status: open` means the corrective action is not yet red→green-proven; the
session-close check flags any postmortem left open. A hotfix without a filed
postmortem is a gap: the hotfix lane in `playbooks/release-compose.md` requires
the postmortem to be filed after the fix ships.
