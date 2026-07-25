Plugin root: `${CLAUDE_PLUGIN_ROOT}` · Vault path: `${user_config.vault_path}`.

List what this studio can do, in three short sections, one line per item:
1. **Commands** — every `.md` file in `${CLAUDE_PLUGIN_ROOT}/commands/` (name minus extension,
   plus its first-line purpose; read only the first ~3 lines of each).
2. **Skills** — every directory in `${CLAUDE_PLUGIN_ROOT}/skills/` (name + the `description:`
   line from its SKILL.md frontmatter).
3. **Tools** — from `${CLAUDE_PLUGIN_ROOT}/tools/registry.json`, each mechanism's name + one-line
   purpose (registry entries carry these).
No other output. This is a directory listing, not a tutorial — keep it to one screen.
