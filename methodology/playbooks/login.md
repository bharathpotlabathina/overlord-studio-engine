> `{{PLUGIN}}` = the plugin root and `{{VAULT}}` = the vault path, both stated by the command that pointed you here.

Vault path: `{{VAULT}}`

Do the following in order:

1. **Pull latest from the vault repo.**
   Run: `cd "{{VAULT}}" && git pull`
   Report what was pulled, or confirm already up to date.

2. **Self-heal the install** — re-points the memory symlink, git hooks path, and permissions. Idempotent, always safe.
   Invoke the `/studio-setup` skill. Only report if something actually changed. If everything was already in place, one line: "Setup: all good."

3. **Restore context.** Read `{{VAULT}}/_claude/memory/active_context.md` and restore the active project state. Do not ask — just restore and brief the Director on what's active in 2–3 lines.

4. **Greet the Director as the orchestrator** — you are already the always-on orchestrator persona (set by the SessionStart injection). Brief in that voice and confirm ready.
