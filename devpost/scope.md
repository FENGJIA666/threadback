---
doc: scope
status: draft
---

# Threadback

A browser workbench for leaving a concrete handoff to yourself before a task is interrupted.

## Decision Provenance

Implementation plan prepared by the project team under delegated decisions, using the official scope template. Draft status tracks pending participant review.

## The Unique Kernel

A return-to-work handoff separates what is confirmed, what still needs checking, and one next action. Completing that action creates the next handoff while retaining the action and result in history.

## Who It's For

The design target is a person returning to a small planning or implementation task after an interruption. They need to recover their reasoning and locate the first useful action.

## The Core Loop

Leave a named goal, confirmed context, open question, next action, and optional reference. Return to the saved handoff, review it, open the reference, and take the next action. Record the result and next action. Archive the thread when its work is complete.

## Inspiration & Identity

The team's proposed direction is a calm paper-like workbench with spacious typography, forest green, warm orange accents, and a looping thread illustration. User direction: natural confident wording, readable text, and no unnecessary technology branding. No external visual reference was adopted.

## Why This Matters to the Learner

The objective is a coherent, useful, distinctive application with an immediately understandable demonstration.

## What "Working" Looks Like

A person saves a handoff, reloads the page, returns to the same context, opens its reference, records a real result, and sees the next action plus the previous action in history. A backup can be exported and explicitly restored.

The bundled repair-café example is synthetic. Its inventory provides a concrete action: find the complete-kit count, return, and record it.

## The POC Boundary

One browser, local storage, handoff creation/editing, waiting/archived views, a resume view, optional five-minute focus timer, progress history, and versioned backup import/export. Verification is recorded in `evidence/ACCEPTANCE.md`.

## Later

Cross-device synchronization and a browser extension could support a later version after the local handoff loop is evaluated.

## Explicitly Cut

- Accounts and shared workspaces: not needed to demonstrate a personal handoff.
- Automatic screen/email monitoring: would require access and broaden the product beyond intentional notes.
- Generated advice and paid services: the current loop works with explicit user input and deterministic checks.
- Productivity statistics: no measured effectiveness study exists.
