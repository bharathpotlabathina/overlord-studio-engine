# Engine Push — the maintainer's push ritual

**When:** any push to the engine repo itself (not client projects, not the vault).

**Why this exists:** a plain `git push` leaves the maintainer's own installed copy of
the engine a version behind the public repo — the marketplace clone and the plugin
cache only move when explicitly updated (2026-07-19 incident: the first engine-native
session opened on wiring one commit behind the fix that was already on GitHub).
The one event that creates that gap is the push, so the update rides the push.

**The ritual — one command instead of `git push`:**

```
node tools/push.js
```

What it does, in order:

1. `git push` — the pre-push hook still runs preflight; nothing is gated less.
2. On push success: refreshes the marketplace clone and updates the installed
   plugin (`claude plugin marketplace update` + `claude plugin update`).
3. Loud on every non-green outcome: a failed self-update after a successful push
   exits 1 and says so — that state is exactly what the doctor's
   `install-staleness` gauge stays red on until fixed. A box without the
   `claude` CLI gets an explicit skip line, never silence.

**The backstop:** the doctor prints an `install-staleness` line every run —
installed plugin version vs the marketplace clone's manifest, two local file
reads, no network. If a refresh ever lands without the install following, the
next session opens red with the fix command named. Extra arguments pass through
to `git push` (e.g. `node tools/push.js --tags`).

**Restart applies it:** the running session keeps its already-loaded hooks; the
updated engine wires in at the next session open.
