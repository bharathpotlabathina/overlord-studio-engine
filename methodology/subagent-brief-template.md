# Subagent Brief Template

Subagents start cold — no session context, no memory, no prior work. Every brief must be self-contained.
Use the block structure below. Omit blocks that don't apply. Never omit Context or Task.

---

## Brief Structure

### 1. Identity (2–3 lines)
Who the agent is and what their judgment lens is. Sets the tone and filters what the agent pays attention to.

> You are qa, QA engineer. You do not test to confirm things work — you test to find how they break.

> You are a research agent. Your job is to find specific, verifiable facts — not summaries of general knowledge.

---

### 2. Context (essential — never skip)
What situation this agent is walking into. Include:
- What the project/product is (one sentence)
- What was just done or decided (what the agent needs to know to make good judgment calls)
- Why this task matters right now

Keep it tight. The agent needs enough to reason, not a full history.

---

### 3. Task (specific, not general)
Exactly what to do. If there are multiple checks, list them explicitly.

Bad: "Review the SKILL.md changes."
Good: "Check these 5 things in SKILL.md: (1) role list has exactly 3 identities per option, (2) vocabulary table has 3 columns matching role names exactly, (3)..."

For research tasks — give the specific search targets, not the topic:
Bad: "Research Graphify."
Good: "Search for 'Graphify Claude Code skill', 'safishamsi graphify github', and 'Graphify knowledge graph'. Report: what it does, core mechanic, data model, and how it compares to Atlas [brief Atlas description]."

---

### 4. Files / Resources (if applicable)
Exact paths to read. Don't make the agent guess.

> Read: `{{VAULT}}/<path>/SKILL.md`
> Read lines 88–100 only of: `{{VAULT}}/<path>/template.html`

---

### 5. Output Format (always specify)
Tell the agent exactly what to return. Include:
- Structure (table, bullets, prose, severity labels)
- Length limit if relevant
- What a "done" response looks like

> Report findings as **[BLOCKER]**, **[WARNING]**, or **[MINOR]**. End with a ship verdict: HOLD or CLEAR TO TEST.

> Under 300 words. If you can't find it, say so clearly rather than guessing.

> Return: what it is, core mechanic, key design decisions, comparison to Atlas. Under 400 words.

---

### 6. Constraints (optional but useful for QA and research)
What the agent should NOT do. Prevents common failure modes.

- "Do not summarise what you checked — only report what you found wrong."
- "Do not guess. If a source is not findable, say so."
- "Do not fix — report only. Stay in your lane."
- "Do not make claims about repo state from memory — verify against files."

---

## Quick Templates by Type

### QA / qa
```
You are qa, QA engineer. Find what breaks — not what works.

**Context:** [What was built, what changed, why it matters now]

**Review:**
- [Specific thing 1 — include exact strings/paths to check]
- [Specific thing 2]
- [Cross-check: does X in file A match Y in file B]

**Files:** [Exact paths]

**Output:** List findings as [BLOCKER] / [WARNING] / [MINOR]. PASS if nothing found.
End with verdict: HOLD or CLEAR TO TEST.
Do not summarise what you checked — only report findings.
```

### Research
```
Research [topic] in the context of [why it matters to us].

Search for: [specific queries, not just the topic name]

Report:
1. What is it / what does it do?
2. Core mechanic
3. [Specific comparison or angle relevant to our work]
4. What we can absorb

Under [N] words. If you can't find it, say so rather than guessing.
Sources: include links.
```

### Build / dev-web subagent
```
You are dev-web, full-stack web developer. Build to production, not demo.

**Context:** [Project, stack, what exists, what needs to exist]

**Task:** [Specific feature/fix — not "implement X" but "add Y to file Z so that W happens"]

**Spec:**
- [Requirement 1]
- [Requirement 2 with edge cases]

**Files to read first:** [Exact paths — the agent must read these before writing anything]

**Done looks like:** [Testable success criteria — not "it works" but "calling X returns Y"]

**Do not:** [Scope limits — what's out of bounds for this task]
```

---

*Maintained by orchestrator. Updated 2026-06-21.*
*Lives at `_claude/subagent-brief-template.md`. Reference before spawning any subagent.*
