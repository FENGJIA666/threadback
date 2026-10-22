---
doc: prd
status: draft
---

# Threadback — Product Requirements

A local handoff workbench for a person returning to interrupted work. Source: `scope.md > The Unique Kernel` and `scope.md > Who It's For`.

## Decision Provenance

Implementation requirements prepared by the project team under delegated decisions. Draft status tracks pending participant review.

## The Core Journey

1. Arrive at an empty workbench and create a handoff, or load the clearly labelled synthetic repair-café example.
2. Enter a title, goal, confirmed context, next action, optional uncertainty, and an optional reference link.
3. Save and see the handoff in the waiting list. Reload and recover the saved handoff.
4. Choose “Pick up this thread” to review the context and next action together.
5. Open a reference if useful and optionally start a five-minute focus timer. The timer does not certify that work occurred.
6. Record the actual result and next action. The result becomes current confirmed context; the previous action remains in history.
7. Archive completed work, restore it when needed, and export a backup for a separate copy.

Success is a persisted handoff advancing to its next action with the completed action and result retained. Source: `scope.md > The Core Loop`.

## Screens and Layout

The single workbench has a thread list with waiting/archived filters and a main handoff sheet. The sheet shows the goal, prominent next action, confirmed context, uncertainty, references, and expandable history. Creation, editing, recording progress, and backup operations use modal dialogs. A separate local example page holds the synthetic workshop inventory.

## Look and Feel

Team-selected visual direction: off-white surfaces, green primary actions, orange accents, large headings, and comfortable spacing. The thread illustration represents pausing and returning. Interface copy is short and action-oriented. User direction calls for readable text and natural confident language; viewport and keyboard verification is recorded in `evidence/ACCEPTANCE.md`.

## Features and Behavior

- **Handoffs:** require title, goal, confirmed context, and next action. Uncertainty and clues are optional. Editing preserves history.
- **Next-action hint:** a deliberately small wording heuristic suggests a concrete action for empty or generic wording; it does not block otherwise valid saves.
- **Progress:** requires a result and a next action. It records the previous action and new result with a timestamp.
- **References:** the form edits the first reference; additional valid references imported in a backup are retained. Links open separately.
- **Focus:** a five-minute countdown is optional and session-only. Reaching zero prompts reflection without automatically completing work.
- **Archive:** moves a thread between waiting and archived views; restoration keeps its history.
- **Backup:** export all threads; validate an imported file before showing its thread count and asking whether to replace existing data. Import replaces rather than merges.

## States and Boundaries

- **First use:** an empty workbench with create and example actions.
- **Persistence:** saved handoffs and history remain in this browser origin. Selection, resume/focus state, and timer do not survive reload.
- **Invalid input:** field feedback keeps the form open.
- **Save failure:** a failure message keeps the entered form content; it must not claim success.
- **Unreadable stored data:** ordinary saving is blocked; recovery download, explicit reset, and valid backup restore are available.
- **Another tab changes storage:** show a reload instruction and block ordinary saves from the stale tab.
- **Capacity:** at most 200 threads, 500 history entries per thread, 8 clues per thread, and 2 MB serialized backup.
- **Example:** all workshop names, bookings, volunteers, and inventory are fictional practice data.

## Product Decisions

The team selected a local-first implementation to keep the core loop independent of accounts or paid services. Explicit confirmed/uncertain fields preserve the user's distinction rather than infer certainty.

## What We're Building

The complete local journey above, persistent handoffs, safe reference links, versioned backups, readable responsive views, and direct tests of the data operations.

## Deferred From the POC

Synchronization, collaboration, automated capture, and notifications require additional account/access behavior and are deferred.

## Non-Goals

The app does not infer whether claims are true, measure time saved, certify completed work, or provide background monitoring.

## Open Questions

Participant review and any personal learning reflection remain separate from the recorded technical verification.
