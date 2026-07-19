# Runbook — Go / No-Go gate

Owner: Release Engineer (certifies). The Studio Director alone authorises — the
LAUNCH act is his, attended, always (certify ≠ authorise; no unattended deploy,
ever; the machine holds zero deploy capability, UNBREAKABLE).

Checklist — every line must hold, each with evidence attached:
1. Composition record complete (inventory, removals, couplings all owner-named).
2. QA quality pass: verdict CLEAR (standing wire on release-composed).
3. **Security certificate ISSUED** by the Security Engineer (their veto binds on
   this artifact; no certificate = no gate, no exceptions).
4. `infra-check`: all invariants hold on the release machine (env, RLS, dupes,
   tool-defaults). Free-tier fit stated: "this release stays within free tier Y/N"
   (the spend decision is the Director's, the surfacing is ours).
5. Migrations: ledger clean, expand/contract shape clean.
6. **Rollback exercised on staging** for THIS release (transcript attached).
7. Release notes drafted and version-stamped.
8. Ship-or-Remove sweep recorded (human-judgment check, itemized).
Result: **certified-awaiting-authorization**. Hand the Director the one-page
summary (version, what ships, risk, rollback readiness). If he is unavailable,
the release PARKS here — the fleet moves on; nothing deploys unattended.
