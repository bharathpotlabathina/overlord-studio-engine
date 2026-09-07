# Runbook — Operating infra-check

Owner: Release Engineer (the boundary patrol is theirs to run and keep honest).

1. **Configure per product:** `infra-check.json` at the product repo root names
   prodIdentifiers (project refs, DB hosts), envFiles, migrationsDirs, mcpConfigs.
   No config = the tool says so explicitly (cold) — never assume a green that
   wasn't checked.
2. **When it runs:** session-start (hook), pre-push (gate), and at compose + gate
   (steps in those runbooks). Any red is a compose/gate blocker, not a warning.
3. **Where it must run, and from which branch:** the config has to sit on the
   branch the product actually SHIPS from — on a feature branch it patrols
   nothing, and the shipping branch reports cold install (seen 2026-07-27: a
   product's patrol inert on its shipping branch for a week, the config having
   landed on a feature branch). Run it from the MAIN checkout, never a
   worktree: env, mcp and vercel read gitignored files that exist only there, so
   a worktree run silently skips half the groups. The tool now names the groups
   it could not check and calls out a worktree — read that tail, not just the
   count.
4. **The static/live split, honestly:** the RLS group is a STATIC scan of the
   migrations corpus. Before go/no-go, ALSO verify live: run the product's
   RLS-audit query (Security Engineer owns the query; `SELECT tablename FROM
   pg_tables WHERE schemaname='public' AND tablename NOT IN (SELECT tablename
   FROM pg_tables t JOIN pg_class c ON c.relname=t.tablename WHERE
   c.relrowsecurity)` — adapt per product) against STAGING. Prod is never
   queried from a dev context (airgap rule); the provider dashboard is the
   window into prod.
5. **Extending:** a new invariant = a new entry in the product's infra-check.json
   groups + a red→green proof in the engine repo before it counts (Law 4).
