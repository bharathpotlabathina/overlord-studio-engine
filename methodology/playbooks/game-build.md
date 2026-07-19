# Game Build — Operating Loop (the Game Build Lead's runbook)

The game line's standing loop, from brief to composed release. Run it in
order; skip nothing silently — a skipped stage is named in the build log with
its reason.

## 1. Intake
- Receive the brief (Orchestrator dispatch or Director direct). Confirm the
  line routing: architecture input from Systems · feel brief from Behavioral
  (must carry measurable acceptance criteria — an untestable brief goes back) ·
  art/audio/narrative direction from the Design Director · interaction/flow
  intent from the Experience Designer.
- Run the pre-flight question loop to the zero-new-questions fixed point
  before accepting the dispatch.

## 2. Design (authorship is yours)
- Author mechanics/balance/rules and level intent as spec sections with
  status tags. Nothing builds against `[DRAFT]`.
- Systems reviews architecture; disputes split per the seam table (you are
  senior on mechanics/balance; Systems on architecture).
- Lock sections `[PROVISIONAL]`/`[LOCKED]` before implementation.

## 3. Build
- Test-first for the testable bucket (logic, balance math, state machines,
  netcode): failing test shown before implementation, green after.
- Feel/juice bucket: implement to the feel brief's acceptance criteria;
  playtest evidence replaces unit tests — record it.
- Tunables in ScriptableObjects/config from day one; frame budget checked
  per feature.
- On tracked/cabinet products: consume the published state contract only.

## 4. Playtest gate
- Internal playtest against the feel brief's criteria; record pass/fail per
  criterion with evidence.
- First Playable candidates → hand to the Experience Designer for the
  zero-instruction-play gate (a real human stranger; binding).

## 5. Seam checks before handoff
- Flow findings → Experience Designer (senior). Reward findings → Behavioral
  (senior). Compound → Orchestrator arbitrates. Backend service needs →
  Dev-web (you stay senior on the feature). Device-platform issues →
  Sensing & Projection.

## 6. Compose & gate
- Hand the release candidate to the Release role: QA functional verdict +
  Release deployability + Security certificate — Release aggregates; a red
  from any is a red. Headless server builds are yours to produce, Release's
  to deploy.
- The deploy act is the Studio Director's alone, always.
