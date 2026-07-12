# Wiki Entry Schema

Per-document. One source doc → one wiki entry. Never merge multiple docs into one entry.

**When to generate:** When source documents arrive for a project — before any role starts work.
**Where wiki files live:** `Projects/<project>/wiki/` (markdown). Source docs in `Projects/<project>/raw/`.
**Naming:** wiki file matches source doc name. `PROJECT-BRIEF.pdf` → `wiki/PROJECT-BRIEF.md`.

---

## Entry Format

```markdown
# [Source filename]

**Type:** [Project brief / Pitch deck / Spec / Proposal / Meeting notes / Contract / etc.]
**Date:** [Date on the document, or date received if undated]
**Author:** [Who wrote it — and in what capacity: client, Director, third party]
**Provenance:** [One line: what kind of authority this document carries. E.g. "Client-authored — treat as committed intent." or "Director synthesis — high authority, internal perspective."]

---

## Purpose
[1–2 sentences: what this doc is for and what decisions it was written to support.]

---

## Key Facts
[Verbatim or near-verbatim extracts. Never paraphrase when the original is precise. Number each fact.
Include: specific figures, dates, names, constraints, decisions, requirements, stated preferences.]

1.
2.
3.

---

## Conflicts / Gaps
[Anything in this doc that contradicts another known doc. Anything left unresolved or ambiguous.
If none: write "None identified."]

---

## Stale Check
[Date this entry was generated. Flag any facts that are time-sensitive and may have changed.]
Generated: [date]
Time-sensitive: [list any facts that decay — e.g. "open items list — verify against current state before next session"]
```

---

## Rules

- **Key Facts section uses verbatim extracts wherever possible.** If you summarise, mark it as a summary.
- **Never interpret.** Capture what the doc says, not what it means. Interpretation happens in sessions.
- **Conflicts section is mandatory.** If no conflicts are found, say so explicitly — "None identified."
- **Stale check is mandatory.** Some facts are point-in-time (open items, commit hashes, status). Flag them.
- **Do not duplicate BIBLE/SPEC content.** If the vault already has a BIBLE or SPEC, the wiki entry points to them rather than re-extracting what they cover.

*Maintained by orchestrator. Updated 2026-06-21.*
