# Threadback — local verification

Verified 22 October 2026, Asia/Singapore.

## Delivered behavior

The workbench supports creating and editing a handoff, reloading it, resuming with confirmed facts and open questions separated, taking an optional five-minute focus step, recording a result and new next action, reviewing earlier context, archiving/restoring, and downloading/restoring a validated backup.

## Direct evidence

- 9 core regression tests passed after the history-context change: `npm test`.
- 8 initial browser cases passed in installed Google Chrome. The affected journey and real-file backup cases passed again after the history-context fix.
- Desktop and narrow-screen inspection at 320, 390, 768 and 1440 CSS pixels found no page horizontal overflow; visible text measured at least 16 px.
- Two additional browser cases passed: timer expiry leaves history unchanged, and a stale tab cannot overwrite a newer save. This brings coverage to 10 distinct browser cases.
- In-app browser manual check: opening the form focused its close control, Tab moved into the first field, and Escape closed it and returned focus to the opening button.
- Syntax check and static build passed: `npm run check`, `npm run build`.
- Browser checks verify a real downloaded backup file; invalid imports leave current data intact. Simulated storage write failures retain the entered form.
- The product uses synthetic, explicitly labelled example data. There is no runtime service, tracking request, or API-key setup.

## Review iteration

Requirements review selected the specific handoff-to-action loop. The opposition review identified loss of previous context when completing a step. History now saves that context and exposes it under “Context at that pause”; independent browser tests verified persistence, visibility, and backup restoration. Positive review inspected actual desktop and mobile layouts and refined the narrow-screen navigation spacing.

The manager, implementation/requirements lead, opposition reviewer, and Positive reviewer accepted the local application within this scope. This records actual independent review, not a promised competition result.

## Reproduce

Start `npm start`; use `npm test` and `npm run test:browser` with development dependencies installed. See `tests/browser.spec.mjs` for the observed operations and `playwright.config.mjs` for the local Chrome setup.

## Evidence boundary

Verification covers local Chrome and responsive browser viewports. Participant hands-on feedback, real phones, public hosting, and formal competition submission are separate from this record. Planning files remain drafts for participant review. Personal learning responses have not been fabricated.

## Demo artifact

`Threadback-final-demo.mp4` is an edited demonstration assembled from recordings of the actual local interface: creating a custom handoff, saving, reloading, resuming, using focus, checking the fictional inventory reference, recording progress, expanding prior context, and exporting a backup. The scenario is fictional practice data. The recording is silent and the interface carries the walkthrough.

Video verified with ffprobe: H.264, 1440×1000, 77.48 seconds. Full ffmpeg decode completed without errors. Six sampled frames were visually inspected.

## Public source

The [public repository](https://github.com/FENGJIA666/threadback) was verified readable without authentication on 22 October 2026. It includes source, planning documents, run instructions, an MIT license, and the downloadable demonstration. YouTube hosting and formal competition submission are not confirmed by this record.
