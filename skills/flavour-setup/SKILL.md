---
name: flavour-setup
description: First-time-user setup that generates a themeable persona layer ("Flavour") for the studio's 9 fixed roles. Use when the user wants to skin, theme, re-flavour, or restyle the roles/agents, asks to "set up a flavour", "change the vibe/theme of the team", pick a genre or universe for the studio personas, or turn the flavour on/off. Runs a short one-question-at-a-time funnel (genre → universe → faction), then generates an original-IP Flavour bundle under _claude/flavours/ and activates it. Do NOT use for changing what the roles *do* (that is the fixed kernels), only how they are dressed.
---

# Flavour Setup

A **Flavour** is the themeable persona layer loaded over the studio's nine
fixed role kernels. It changes only *surface*: each agent's display name, the
Studio Director's honorific, the team mood, and a light diction tint. It never
changes what a role does or how deference works.

Your job here is to run a short, warm first-time-user experience that lands the
user on a Flavour they like, then write it to disk and activate it. Generate;
don't interrogate. Offer options so the user can pick fast, but always leave a
freeform door open.

## Why the guardrails exist (read before generating)

These are not stylistic preferences — the engine depends on them:

- **Reverence is engine-side. Do NOT author it into a Flavour.** The deference
  contract (how agents defer to the Director) lives in
  `personas/_tone-contract.md`. A Flavour only supplies the *honorific word* that
  fills the token. If you write worship/deference lines into a skin, you
  double up on the engine and it reads as parody. Just pick a fitting title.
- **Intensity is LOW — "a smidge".** The theme is a tint, not a costume. Two to
  four light diction cues, a one-line persona, a short tone delta. Clarity and
  the terse-on-code / explain-on-strategy mode-discipline always win over lore.
  An agent should still answer a code question like an engineer, just wearing
  the coat.
- **Original IP only.** If the user names a real franchise (a known game, film,
  or book universe), do not copy its proper nouns. Warmly steer to an *original
  homage* — same feeling, invented names. This keeps the vault free of
  someone else's trademarks.
- **Never emit the reserved private honorific** (the one the private reference
  Flavour uses — an "O-word" ruler title) into a generated Flavour — not in
  `flavour.md`, not in any skin. It is reserved for private vault data and the
  validator rejects it. Pick a different, faction-fitting honorific.

## Paths — plugin tool, vault data

You are running as a plugin skill. Two roots matter:

- `${CLAUDE_PLUGIN_ROOT}` — the installed plugin. The Flavour tool lives at
  `${CLAUDE_PLUGIN_ROOT}/tools/flavour.js`.
- `${user_config.vault_path}` — the user's studio vault. **Flavour data is
  written here**, under `${user_config.vault_path}/_claude/flavours/`. Call this
  path `V` below (`${user_config.vault_path}`, or the env
  `CLAUDE_PLUGIN_OPTION_VAULT_PATH` if the token is unset).

Every `flavour.js` call passes `--vault "$V"` so the tool operates on the user's
vault (it lives inside the plugin, not the vault). This runs the same on macOS,
Linux, and Windows:

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/flavour.js" <verb> --vault "$V"
```

## The funnel — one question at a time

Ask these in order. Wait for each answer before asking the next. Keep each
question to a couple of lines plus the options.

**Q1 — Do you want Flavour?**
"Want to dress the studio team in a theme, or keep it plain professional?"
- If **no** → run `node "${CLAUDE_PLUGIN_ROOT}/tools/flavour.js" off --vault "$V"`
  and stop. Tell them the team stays neutral/professional and it takes effect
  next session.
- If **yes** → continue.

**Q2 — Genre.** Offer a handful of generated genre options and invite their own.
Example seeds: high fantasy, cyberpunk, deep-space sci-fi, mythic/folklore,
noir, post-apocalyptic salvage, steampunk. Let them pick one or describe their
own.

**Q3 — Universe (under the chosen genre).** Generate 3–4 *original* universe
sketches that fit their genre (one line each — the setting's flavour), plus
"describe your own". If they named a real franchise, offer original homages
instead, out loud and without judgment.

**Q4 — Faction (under the chosen universe).** Generate 3–4 factions/orders/crews
that could exist in that universe (one line each), plus a freeform option. The
faction is what the whole team belongs to — it drives the naming and mood.

## Generate the Flavour

Pick a short, filesystem-safe folder `<name>` derived from the faction
(lowercase, hyphens, no spaces, no leading underscore). Then write the bundle
under `"$V/_claude/flavours/<name>/"`:

### `flavour.md`

Front-matter with exactly these fields, then a one-line description:

```markdown
---
name: <display name of the Flavour>
owner: studio
honorific: <the Director's in-Flavour title — fits the faction; not the reserved private honorific>
mood: <one line describing the whole team's tone>
language_cues:
  - <light diction hint 1>
  - <light diction hint 2>
  - <optional hint 3>
  - <optional hint 4>
---

<one line naming the faction/universe this Flavour dresses the team as>
```

`language_cues` are *light* — a couple of words the team might reach for, a
register note. Not a dialect, not a catchphrase mandate. 2–4 of them.

### The 9 role skins

One file per role, **exactly these nine slugs**, no more, no fewer:

`orchestrator systems qa ux visual dev-web hardware mobile behavioral`

Each `<role>-skin.md` is tiny — front-matter `name:` (the agent's in-Flavour
name, fitting the faction) then a one-line persona and a one-line tone delta:

```markdown
---
name: <the agent's Flavour name>
---
<one-line persona: who this agent is in the faction, tied to their real job>
<one-line tone delta: the small way they speak differently — a smidge>
```

Keep each agent's real function legible under the costume. The mapping of slug
to job (so the persona stays true) is:

| slug | real role |
|------|-----------|
| orchestrator | the Director's second; leads the whole studio |
| systems | systems planning / architecture |
| qa | quality assurance, verification |
| ux | UX for devices/cabinets |
| visual | visual direction |
| dev-web | web + application build and deploy |
| hardware | device / OS / firmware infra |
| mobile | mobile apps (Android + iOS), cross-platform-first |
| behavioral | behavioral / motivational lens |

Do not write reverence or expression conventions into any skin — those are the
engine's.

## Activate

After all ten files are written:

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/flavour.js" use <name> --vault "$V"
```

Tell the user it's set and applies **next session**. Offer to rename it later
(`node "${CLAUDE_PLUGIN_ROOT}/tools/flavour.js" rename <old> <new> --vault "$V"`)
if they want a different folder label.

## Self-check before you finish

Confirm all ten files exist, the four required fields (`name owner honorific
mood`) are present in `flavour.md`, all nine role slugs are present, and the
reserved private honorific appears nowhere in the bundle. Inline check against
the generated dir (prints `valid` on success, else the first failure):

```bash
D="$V/_claude/flavours/<name>"
{ for r in orchestrator systems qa ux visual dev-web hardware mobile behavioral; do
    [ -f "$D/$r-skin.md" ] || { echo "missing skin: $r"; exit 1; }
  done
  for k in name owner honorific mood; do
    grep -q "^$k:" "$D/flavour.md" || { echo "missing field: $k"; exit 1; }
  done
  echo valid
} 
