> `{{PLUGIN}}` = the plugin root and `{{VAULT}}` = the vault path, both stated by the command that pointed you here.

Vault path: `{{VAULT}}`

Do the following in order:

1. **Locate the newest proposal.** List `_claude/atlas-staging/*.proposed.json` (create the directory if it doesn't exist yet — treat that as "no proposal found"). If none exist, tell the Director there's nothing to review and stop.

2. **Validate the proposal.** Run:
   ```
   node {{PLUGIN}}/tools/atlas-map-check.js validate _claude/atlas-staging/<newest-proposal>.json
   ```
   If this fails (exit 1), show the full report and stop — reject the proposal back to regeneration. The Director never reviews an invalid map.

   Also validate the live map:
   ```
   node {{PLUGIN}}/tools/atlas-map-check.js validate _claude/studio-atlas-map.json
   ```
   If the *live* map fails, that's its own alarm — report it clearly before continuing; it means drift landed through some other path.

3. **Run the deterministic diff.**
   ```
   node {{PLUGIN}}/tools/atlas-map-check.js diff _claude/studio-atlas-map.json _claude/atlas-staging/<newest-proposal>.json
   ```
   Show the full output. You may add one short narrative sentence on top (e.g. "mostly state promotions from a recent tooling wave") — keep it clearly separate from and subordinate to the mechanical diff, which is the authoritative record.

4. **Present for decision, sectioned by type — do not batch-approve any section except (vi):**
   - **(i) State changes** — list each numbered, ask the Director to approve or reject *individually*. Never offer "accept all."
   - **(ii) Added capabilities** — per-item; the proposed state is Atlas's suggestion, the Director confirms or reassigns it on acceptance.
   - **(iii) Removed capabilities** — per-item.
   - **(iv) Rename candidates** — per-pair: is this the same capability renamed, or a genuine remove+add? Ask.
   - **(v) Relationship / flow / pillar-grouping changes** — per-item.
   - **(vi) Metadata-only changes** (confidence rescoring, source-string updates) — this is the only section that may be approved as a block.

5. **Build the merged result** = the current live map + only the changes approved in step 4. Do this by editing a working copy — never modify the live map directly (it's `chmod 444`; you cannot write to it yet, and shouldn't try to before step 7).

6. **Re-validate the merged result:**
   ```
   node {{PLUGIN}}/tools/atlas-map-check.js validate <path-to-merged-working-copy>
   ```
   If this fails, an approved subset is internally inconsistent (e.g. an approved relationship whose source is a capability that was *rejected*). Show the specific conflict, ask the Director to re-decide the affected item(s), and repeat from step 5 until it passes clean.

7. **Land, on one final explicit confirmation.** State clearly: "Sprint map review complete: N changes approved, M rejected. Type 'go' to land it." Wait for that literal confirmation — this mirrors the `/atlas-propose` design's checkpoint and is a distinct, unmistakable stop, not folded into any earlier question. On confirmation:
   ```
   chmod +w _claude/studio-atlas-map.json
   ```
   Write the merged result to `_claude/studio-atlas-map.json`, then:
   ```
   chmod 444 _claude/studio-atlas-map.json
   ```
   Update the map's `meta.corrected` field to log this landing: if it is currently a plain string, first convert it to a JSON array whose sole element is that original string, then append a new element to the array. If it is already an array, just append a new element. The appended element is: `"YYYY-MM-DD — landed via /atlas-map-review, N changes approved / M rejected"` (use today's actual date). Move the proposal file to `_claude/atlas-staging/archive/` (create that directory if needed). The commit itself rides the normal session Stop hook — the pre-commit backstop will validate one final time there.

8. **Confirm to the Director:** what landed, what was rejected, and that the map is locked again.
