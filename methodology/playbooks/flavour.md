> `{{PLUGIN}}` = the plugin root and `{{VAULT}}` = the vault path, both stated by the command that pointed you here.

`/flavour` manages the active Flavour (the themeable persona layer). Every
`flavour.js` call passes `--vault {{VAULT}}` so the pointer is read and
written in the user's vault, not the plugin dir.

**Safety:** the user-supplied `<name>` / `<old>` / `<new>` are untrusted text.
Always pass them as **single-quoted literals** (`'<name>'`) so shell metacharacters
cannot execute. Never interpolate a raw name into the command line. `flavour.js`
also validates names server-side (rejects `/`, `\`, `..`, and reserved `_` prefixes),
but the quoting is your responsibility at the call site.

- **no arg / `current`** → run `node {{PLUGIN}}/tools/flavour.js current --vault {{VAULT}}` and report.
- **`list`** → `node {{PLUGIN}}/tools/flavour.js list --vault {{VAULT}}`.
- **`use <name>`** → `node {{PLUGIN}}/tools/flavour.js use '<name>' --vault {{VAULT}}`.
- **`off`** → `node {{PLUGIN}}/tools/flavour.js off --vault {{VAULT}}` (neutral).
- **`rename <old> <new>`** → `node {{PLUGIN}}/tools/flavour.js rename '<old>' '<new>' --vault {{VAULT}}`.
- **`new`** → invoke the `flavour-setup` skill (the generative FTUE).

Setting the active Flavour **records your choice**; it takes effect from your
next session (the SessionStart loader reads the pointer). The relationship
register (Sovereign / Council / Crew / Mentor / Straight) is baked into that
Flavour's skins at generation time, so switching Flavours switches register
too. To change register without regenerating the whole theme, edit the
Director-facing register line in each `<role>-skin.md` directly, or run
`new` to redo the funnel.
