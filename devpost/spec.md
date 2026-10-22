---
doc: spec
status: draft
---

# Threadback — Technical Spec

## Decision Provenance

Technical plan prepared by the project team under delegated decisions. Current delivery is a locally verified application.

## How This Works, In Plain Language

A small local server delivers static files. The browser renders handoffs and saves them in its own storage. A separate core module validates notes, advances steps, and checks backups. No application backend or remote service processes handoff content.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`.

Form input goes to `validateHandoff` and `createHandoff`, then `persist` serializes and writes the new list before showing success. Startup reads the same storage key through `parseBackup`. Resume and focus modes change the visible sheet. `completeStep` returns a new handoff with a history entry; persistence precedes the success view. Backup import validates first and writes only after explicit replacement confirmation.

## Stack

- Node.js 22 or later for local serving, tests, and copying the static build; no runtime package dependencies. [Node documentation](https://nodejs.org/docs/latest-v22.x/api/).
- Native browser ES modules, HTML, CSS, `localStorage`, `crypto.randomUUID`, `dialog`, Blob downloads, and File reading. [Web platform documentation](https://developer.mozilla.org/en-US/docs/Web).
- Team-selected stack reduces setup and keeps data operations separately testable.

## Where It Runs and How Someone Tries It

From the repository root, run `npm start` and open `http://127.0.0.1:4177`. Set `PORT` to use another port; a different origin has separate browser storage. Use HTTP serving rather than opening the HTML file directly. Run `npm test` for tests, `npm run check` for syntax, and `npm run build` to copy `app/` into `dist/`.

The server binds to `127.0.0.1`. A compatible modern browser is required. No API key is required. A public repository and public demonstration video are being prepared for the event. Their public availability and formal submission must be verified separately.

## Look and Feel

Carry `prd.md > Look and Feel` into `app/styles.css`: calm off-white/green surfaces, orange accents, visible hierarchy, and spacious controls. Native CSS and local assets avoid remote font/image requirements. Visual and responsive verification is recorded in `evidence/ACCEPTANCE.md`.

## Components

### Browser controller

`app/src/app.js` owns rendering, dialogs, focus state, storage, import/export confirmation, and feedback. User strings inserted into markup are escaped; external clue URLs pass `safeUrl`. PRD refs: `Features and Behavior`, `States and Boundaries`.

### Pure data operations

`app/src/core.js` exports `createHandoff`, `validateHandoff`, `assessNextStep`, `completeStep`, `archiveHandoff`, `parseBackup`, `serializeBackup`, and `safeUrl`. Data operations return new objects. Backup restoration constructs explicit fields rather than copying arbitrary input properties.

### Local delivery

`scripts/server.mjs` serves only the `app/` directory with MIME types, a content security policy, and no-store responses. `scripts/build.mjs` replaces `dist/` with a copy of `app/`. The example inventory is a local HTML page.

## Data Model

Storage key: `threadback.v1`. Stored/backup envelope: `{version: 1, handoffs: [...]}`.

Each handoff has `id`, `title`, `goal`, `confirmed`, `uncertain`, `next`, `clues: [{label,url}]`, `createdAt`, `updatedAt`, `status: 'parked' | 'archived'`, and `history: [{completed,confirmed,at,previousConfirmed?,previousUncertain?}]`. Advancing a step saves the prior confirmed context and uncertainty in its history entry before replacing the current fields. Backups from the earlier shape remain valid without those two optional fields; when present they must be strings of at most 2000 characters. Timestamps are date-parseable strings with an ISO-style prefix. History is appended oldest-to-newest by the core operation.

Text limits: title 120; goal/confirmed/uncertain/next 2000 each; clue label 120 and URL 2048. Maximum 8 clues, 500 history entries, 200 handoffs, and 2 MB serialized backup. Required note strings must be nonempty after trimming. URLs must be absolute HTTP/HTTPS without credentials or control characters. Duplicate handoff identifiers fail backup validation.

Selection, view mode, and countdown are in memory. Backups are plain JSON, not encrypted. Local browser data may be cleared independently of the app; downloaded copies provide a separate recovery route.

## File Structure

```text
app/
  index.html       Workbench shell
  styles.css       Local visual styles
  mark.svg         Local mark
  example.html     Synthetic workshop inventory
  src/app.js       Browser controller
  src/core.js      Validation and handoff operations
tests/core.test.mjs Core regression tests
scripts/server.mjs Local static server
scripts/build.mjs  Static output copy
devpost/           Planning and verification records
```

## External Services and Dependencies

No runtime API, database, authentication, analytics, or paid service. Opening a user-supplied clue deliberately navigates to its destination. Development documentation links are references, not runtime requests.

## Important Failure Modes

- Storage read failure or invalid existing data: preserve recovery access, block ordinary writes, allow explicit replacement.
- Storage write failure: retain the form and report failure before changing in-memory saved state.
- Invalid/oversized backup: reject before replacement; valid backups still need confirmation.
- Concurrent-tab edits: storage event blocks ordinary stale-tab saving and requests reload.

## What Was Simplified and Why

One browser origin avoids an account/synchronization system. The focus timer is a session aid rather than a time-tracking record. The action hint is a transparent wording heuristic rather than an interpretation service.

## Decisions and Open Issues

Automated core tests and browser checks are recorded in `evidence/ACCEPTANCE.md`. The UI edits one clue while the data format accepts eight; this preserves imported references without adding a multi-link editor to the current scope.
