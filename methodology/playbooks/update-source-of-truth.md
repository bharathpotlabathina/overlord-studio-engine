> `{{PLUGIN}}` = the plugin root and `{{VAULT}}` = the vault path, both stated by the command that pointed you here.

Vault: `{{VAULT}}`

Gate for writing to `sot/` (source-of-truth) files. orchestrator (strategy.md) and systems (all other sot/ docs) only.
Prerequisite: Director has explicitly approved the write in this session.

## Steps

1. State: "Source-of-truth gate opening for: <file>. Director approved. Proceeding."
2. `chmod +w <file>`
3. ⚠️ From here, chmod 444 <file> is mandatory on ANY failure before step 6.
4. Apply the edit to <file>.
   → If edit fails: `chmod 444 <file>`, report failure, stop.
5. `chmod 444 <file>`
6. `git -C {{VAULT}} add <file> && git -C {{VAULT}} commit -m "source-of-truth: <role> lands <topic> — Director approved"`
   → If commit fails: file is already re-locked (step 5 done). Report git error, stop.
7. Verify: `ls -l <file>` — confirm `-r--r--r--`
8. State: "Source-of-truth gate closed. <file> locked."

One file per invocation. No batch writes.

> Cross-platform note: `chmod +w` / `chmod 444` work in git-bash (present on every
> Windows box that has git) and on macOS/Linux. If `chmod` is unavailable, the
> equivalents are Windows `attrib -R` / `attrib +R`, or
> `node -e "require('fs').chmodSync('<file>', 0o444)"` (0o644 to unlock) — the
> same read-only bit the source-of-truth lock relies on.
