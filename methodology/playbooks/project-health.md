> `{{PLUGIN}}` = the plugin root and `{{VAULT}}` = the vault path, both stated by the command that pointed you here.

# Project Health Pulse

Read these files in full:

- every `{{VAULT}}/_claude/memory/project_*.md` file (one per project; read them all)

After reading all files, produce a health report. For each project, extract any items that are:
- Explicitly marked blocked, parked, stalled, or on hold
- Contain the words: "waiting", "gated", "not started", "blocked", "pending", "parked", "paused", "deferred", "TBD", "TODO"
- Contain the emoji ⚠️
- Mentioned as requiring input, approval, or a missing prerequisite before work can continue

Output format — one table per project with surface-level items only (skip items that are already resolved or shipped):

**[Project Name]**
| Status | Item | Note |
|--------|------|------|
| BLOCKED | ... | waiting on X |
| PARKED | ... | gated on Y |
| ⚠️ | ... | needs attention |

After all project tables, add a final section:

## Active Context
State what is currently active from `{{VAULT}}/_claude/HANDOFF.md` — current project, current role, and next action.

If a project has no blocked/parked/stalled items, skip it entirely. Keep notes terse — one line each.
