# Windows smoke test — ~20 minutes

A macOS/Linux session **cannot** certify Windows. Everything in the engine is
written cross-platform (Node runtime, `process.platform` branches, junctions for
memory links), and the macOS/Linux behaviour is verified — but the final Windows
sign-off needs a real Windows box. Run this on a Windows machine and note any ❌.

Prereqs: Windows 10/11, [Node](https://nodejs.org) (Claude Code bundles it), Git
for Windows (provides git-bash + `chmod` for the interactive playbooks). No admin
rights needed — the memory link uses a directory **junction**, not a symlink.

## Setup path

1. **Install the plugin** in Claude Code:
   ```
   /plugin marketplace add <repo-url-or-path>
   /plugin install overlord-studio-engine@overlord-studio-engine
   ```
   Set `vault_path` when prompted (e.g. `C:\Users\<you>\Documents\studio-vault`).
   - ✅ Plugin installs, no error.

2. **Run setup** (this is the whole cross-platform surface):
   ```
   node "%CLAUDE_PLUGIN_ROOT%\tools\studio-setup.js" all "C:\Users\<you>\Documents\studio-vault"
   ```
   (or run `/studio-setup` and let the skill drive it.)
   - ✅ Prints `scaffolded vault at ...`, then `symlink created: ...` for the
     memory junction (×2 — vault dir and parent), then `OK: <repo> -> ...\tools`.
   - ✅ **Memory junction resolves.** In the vault, confirm the scaffold made
     `_claude\memory\MEMORY.md`, then check the linked location exists and reads
     through:
     ```
     dir "%USERPROFILE%\.claude\projects"
     ```
     One entry's `memory` should be a `<JUNCTION>` pointing into the vault. Open
     `MEMORY.md` through it — same file.  ← **key Windows-specific item**

3. **Map validates cold:**
   ```
   node "%CLAUDE_PLUGIN_ROOT%\tools\atlas-map-check.js" validate "C:\...\studio-vault\_claude\studio-atlas-map.json"
   ```
   - ✅ Prints `PASS — 0 errors ...`, exit 0.

## Flavour path

4. ```
   node "%CLAUDE_PLUGIN_ROOT%\tools\flavour.js" resolve --vault "C:\...\studio-vault"
   ```
   - ✅ Prints a path ending in `_neutral` (or your Flavour if you ran the FTUE).
5. `node ...\flavour.js off --vault "..."` then `current` → prints `none`.
   - ✅ Pointer writes and reads back.

## Hook path (the install-time breakage this port fixes)

6. **Open a fresh Claude Code session in the vault.** The SessionStart hooks fire:
   - ✅ The studio rules + active-context + persona block appear in context
     (the orchestrator greets you). If bash-less Windows had broken the old
     `"shell":"bash"` hooks, this is where it would have failed — it should now
     just work (exec-form `node`).
   - ✅ No hook errors in the Claude Code output.

7. **Commit with the map staged** (exercises the git pre-commit hook):
   ```
   cd C:\...\studio-vault
   git add _claude\studio-atlas-map.json
   git commit -m "smoke: map commit"
   ```
   - ✅ Commit succeeds (map is valid). Break the map (invalid JSON), `git add`,
     commit again → ✅ **blocked** with a validation error. Restore it.

8. **Deploy-guard** (PreToolUse): ask Claude to run a `git push ... production`
   with no ack file → ✅ blocked with the sign-off message.

## Known unverifiable-from-macOS item

- **Hook placeholder substitution in exec form.** `hooks.json` passes
  `${CLAUDE_PLUGIN_OPTION_VAULT_PATH}` as an exec-form `arg`. This is confirmed
  working in the old shell-form hooks on macOS; if a session hook reports an
  empty/`undefined` vault path on Windows, that token isn't substituting into
  exec-form args on this platform — the fix is to switch those two hook entries
  to shell form (`"command": "node \"...\" \"${CLAUDE_PLUGIN_OPTION_VAULT_PATH}\""`),
  which every Windows shell (Git Bash / PowerShell) runs identically since Claude
  Code pre-substitutes the placeholder. Flag it here if seen.

Record ✅/❌ per item. Any ❌ is a real finding, not a nit.
