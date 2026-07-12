# Flavours

A **Flavour** is the themeable persona layer loaded over the fixed kernels.
Reverence is always on (engine); a Flavour only changes names, honorific,
mood, and a light language tint.

## Folder layout
```
_claude/flavours/
  active                 # one line: a flavour folder name, or `none`
  <name>/
    flavour.md           # honorific + mood + language cues (fields below)
    orchestrator-skin.md # one skin per role (9 total)
    systems-skin.md
    qa-skin.md
    ux-skin.md
    visual-skin.md
    dev-web-skin.md
    hardware-skin.md
    mobile-skin.md
    behavioral-skin.md
```

## `flavour.md` fields (front-matter)
- `name:` display name of the Flavour
- `owner:` who authored it
- `honorific:` the Studio Director's in-Flavour title (fills the engine token)
- `mood:` one-line tone descriptor for the whole team
- `language_cues:` 2–4 light diction hints (low intensity)

## `<role>-skin.md`
`name:` (the agent's Flavour name) + a one-line persona + a tone delta.
Reverence and expression conventions are NOT here — they live in
`personas/_tone-contract.md` (engine).

## `active` pointer
`none` = neutral professional Flavour (`_neutral/`). Any other value must be
an existing folder name here; if it is missing/corrupt, callers fall back to
`_neutral/`.
