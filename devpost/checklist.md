---
doc: checklist
status: draft
---

# Build Checklist

Build mode: fast, selected by the team under delegated local-build authorization. Implementation is authorized through delegated decisions; no learner interview or individual plan approval is claimed. Technical checks below link to direct evidence; participant review is tracked separately. Public repository and video preparation are now authorized; this checklist does not assert that publication or submission has completed.

## Source and Core Evidence

- [x] Source observed: workbench, create/edit dialogs, resume/focus modes, progress history, archive/restore, and backup dialogs exist in `app/src/app.js`.
- [x] Source observed: synthetic repair-café handoff links to local fictional inventory in `app/example.html`.
- [x] Core regression tests passed: `node --test tests/core.test.mjs`, 9 tests, after prior-context preservation was added. Coverage includes required fields, advisory hints, unsafe URLs, immutable progression, retained context, older-backup compatibility, archival, backup round trip, malformed/excessive backups, and text preservation.
- [x] Integrated browser behavior directly verified in Chrome; see `evidence/ACCEPTANCE.md`.

## Slices

- [x] **1. Leave a handoff and return to it after reload**
  Becomes usable: A created handoff appears in the waiting list and survives page reload.
  Why now: Proves the complete form, validation, persistence, and render path.
  PRD ref: `prd.md > The Core Journey` steps 1–3
  Spec ref: `spec.md > Browser controller`, `spec.md > Data Model`
  Build: Source exists for create/edit, validation, serialization, and local storage.
  Verify (mechanical): Start the server; save a custom handoff; reload; inspect matching saved fields. Test blank required input and a failed save.
  Learner check: Try leaving a real handoff and returning to it; feedback is not yet recorded.
  Commit: see local Git history for the implementation save points.

- [x] **2. Return, act, and leave the next handoff**
  Becomes usable: Resume a thread, open a reference, record a result and next action, and retain the previous step.
  Why now: Demonstrates the distinctive handoff loop.
  PRD ref: `prd.md > The Core Journey` steps 4–6
  Spec ref: `spec.md > The Core Journey Through the System`
  Build: Resume/focus and completion paths exist; core progression is unit-tested.
  Verify (mechanical): Complete the synthetic kit-count journey; verify history and latest context after reload; check focus entry/exit.
  Learner check: Judge whether the saved next action is immediately usable; feedback is not yet recorded.
  Commit: see local Git history.

- [x] **3. Keep completed work and recover a separate copy**
  Becomes usable: Archive/restore work and export/import a validated backup with explicit replacement.
  Why now: Completes the persistence lifecycle without accounts.
  PRD ref: `prd.md > Features and Behavior`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Important Failure Modes`
  Build: Archive/restore, export, import validation, recovery, and replacement dialogs exist.
  Verify (mechanical): Export, change a thread, import the saved backup, cancel once, then confirm; verify the result. Reject malformed input without replacing current data.
  Learner check: Try a backup restore and confirm the replacement explanation is understandable; not yet recorded.
  Commit: see local Git history.

## Hands-on Checkpoints

- [ ] Early usable behavior explored by learner.
- [ ] Final kick-the-tires exploration and learner feedback completed.

## Final Review

- [x] Desktop and narrow-screen core journey inspected in a browser.
- [x] Keyboard/dialog interaction and readable text checked.
- [x] Team technical review complete — requirements, opposition, Positive and manager reviews converged after the history-context revision.
- [ ] Participant readiness/feedback recorded.

## Code Tour and App Map

- [ ] Learning activity completed and grounded in actual learner participation.
- [ ] Optional edit and transfer reflection addressed without inventing answers.
- [x] `devpost/app-map.html` generated and included for review; no completed participant tour claimed.

Activity and evidence: Core implementation and automated tests exist. No learner learning activity has been recorded.
Route and stops: Reference-only route: `app/src/app.js` form submission → `app/src/core.js` create/complete → `app/src/app.js` persist/render. This is not a completed code tour.
Edit outcome: No learner edit recorded.
Reflection: No learner reflection recorded.
Activity mode: Pending.

## Revisions

- Progress entries now retain previous confirmed context and uncertainty so advancing work does not discard the prior handoff. Older backups without these optional fields remain readable.
- The form edits one reference while backups retain up to eight; the source preserves additional imported clues on editing.
- The local example became a repair-café inventory journey so the next action has a concrete, inspectable result using synthetic data.
