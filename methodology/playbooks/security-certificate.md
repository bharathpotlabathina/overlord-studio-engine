# Runbook — Security certificate

Owner: Security Engineer. Standing on `release-composed` (and any security-surface
event). Output: the certificate — ISSUED or WITHHELD, in writing, version-stamped.
One gate, two certificates: yours and QA's each bind on their own artifact; the
Release Engineer's go/no-go consumes both and cannot proceed without yours.

## Certificate checklist (every line carries evidence or it is not checked)
1. **Secrets posture:** `node tools/infra-check.js` from the product root — the
   env group is the prod-secret-reachable-from-preview detector. Any red = WITHHOLD.
   Additionally grep staged/shipping env files for key-shaped strings (the
   pre-commit secret scan's patterns are the reference).
2. **RLS audit:** static — migrations corpus scan (infra-check rls group) clean;
   live — the staging RLS query (infra-check-operation.md §3) returns zero
   unprotected tables. Prod is never queried from dev context.
3. **Tool-default sweep (M4):** pgpass/MCP/vercel-link groups green — no dev
   context resolves to a prod identifier.
4. **DPDP check:** no production PII in staging (synthetic-only rule) — confirm
   the staging seed source is the synthetic generator, not a prod dump.
5. **Threat delta:** anything in this release that widens the surface (new
   endpoint, new role, new token, new third-party) gets one paragraph: surface,
   abuse case, mitigation. No delta = say "no surface change", explicitly.

## Decision
- All lines green → **CERTIFICATE ISSUED — <product> <version>**, evidence attached.
- Any line red → **WITHHELD** with the failing line(s) named; the composition goes
  back; re-run the FULL checklist after remediation (no partial re-checks).

## Self-test (Law 4 — the certificate must be able to go red)
`node tools/checks/security-cert-selftest.js` seeds a fixture with a prod secret
reachable from preview and asserts the detector (checklist line 1) goes red. A
certificate process whose detector passes the seeded exposure is theatre; the
self-test failing = never issue certificates until it is fixed.
