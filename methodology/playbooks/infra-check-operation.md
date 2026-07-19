# Runbook — Operating infra-check

Owner: Release Engineer (the boundary patrol is theirs to run and keep honest).

1. **Configure per product:** `infra-check.json` at the product repo root names
   prodIdentifiers (project refs, DB hosts), envFiles, migrationsDirs, mcpConfigs.
   No config = the tool says so explicitly (cold) — never assume a green that
   wasn't checked.
2. **When it runs:** session-start (hook), pre-push (gate), and at compose + gate
   (steps in those runbooks). Any red is a compose/gate blocker, not a warning.
3. **The static/live split, honestly:** the RLS group is a STATIC scan of the
   migrations corpus. Before go/no-go, ALSO verify live: run the product's
   RLS-audit query (Security Engineer owns the query; `SELECT tablename FROM
   pg_tables WHERE schemaname='public' AND tablename NOT IN (SELECT tablename
   FROM pg_tables t JOIN pg_class c ON c.relname=t.tablename WHERE
   c.relrowsecurity)` — adapt per product) against STAGING. Prod is never
   queried from a dev context (airgap rule); the provider dashboard is the
   window into prod.
4. **Extending:** a new invariant = a new entry in the product's infra-check.json
   groups + a red→green proof in the engine repo before it counts (Law 4).
