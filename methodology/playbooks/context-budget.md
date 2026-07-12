> `{{PLUGIN}}` = the plugin root and `{{VAULT}}` = the vault path, both stated by the command that pointed you here.

# /context-budget — Vault Context Budget Audit

Measure the per-turn token cost of the Director vault's always-loaded `.claude/` setup.

## Steps

1. **Identify always-loaded files** — these are injected into every session automatically:
   - `~/.claude/CLAUDE.md` (global user CLAUDE.md, which @-imports vault CLAUDE.md)
   - `{{VAULT}}/CLAUDE.md` (vault root CLAUDE.md)
   - `{{VAULT}}/_claude/memory/active_context.md` (@-imported by vault CLAUDE.md)
   - `~/.claude/projects/<vault-project-dir>/memory/MEMORY.md` (auto-memory, always injected)

2. **Read each always-loaded file** and count approximate tokens using: `token_count ≈ char_count / 4`. Report raw numbers only — never as percentages.

3. **List scoped/invoked-only files** — do NOT read these, just list them with estimated size if known:
   - Skills in `~/.claude/commands/` — invoked only
   - Skills in `{{VAULT}}/roles/` — invoked only
   - Per-project CLAUDE.md files (e.g. inside `Projects/`) — scoped to that project directory

4. **Output a table**:

   | File | Type | ~Tokens |
   |------|------|---------|
   | (path) | always / scoped / invoked | (number) |

5. **Sum the always-loaded total** and print it clearly:

   `Always-loaded total: ~XXXX tokens`

   If the total exceeds **8000 tokens**, print a warning:
   `⚠ WARNING: Always-loaded context exceeds 8000 tokens. Consider trimming MEMORY.md or active_context.md.`

   If under 8000, confirm: `OK: Within budget.`

## Notes
- Use `chars / 4` for all estimates — precision is not required, ballpark is fine.
- Do not read role files or skill files — list them as invoked-only with size unknown unless already in context.
- Token counts in raw numbers only (vault rule).
