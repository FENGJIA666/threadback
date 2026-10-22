import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandoff, validateHandoff, assessNextStep, completeStep, archiveHandoff, parseBackup, serializeBackup, safeUrl } from '../app/src/core.js';

const now = '2026-10-22T13:00:00.000Z';
const later = '2026-10-22T14:00:00.000Z';
const input = () => ({ title: 'Submission form', goal: 'Make date entry reliable', confirmed: 'Empty dates show an error', uncertain: 'Timezone boundary', next: 'Open the date test and add a midnight case', clues: [{ label: 'Date reference', url: 'https://example.com/date' }] });
const backup = handoffs => JSON.stringify({ version: 1, handoffs });

test('create validates required fields and copies clues without mutating input', () => {
  const source = input();
  const item = createHandoff(source, now);
  assert.equal(item.status, 'parked');
  assert.equal(item.createdAt, now);
  assert.deepEqual(item.history, []);
  item.clues[0].label = 'Changed';
  assert.equal(source.clues[0].label, 'Date reference');
  for (const field of ['title', 'goal', 'confirmed', 'next']) assert.equal(validateHandoff({ ...source, [field]: ' ' }).valid, false);
  assert.equal(validateHandoff({ ...source, title: 'x'.repeat(121) }).valid, false);
  assert.equal(validateHandoff({ ...source, clues: [], uncertain: undefined }).valid, true);
});

test('next-step wording is advisory and does not block saving', () => {
  assert.equal(assessNextStep('Continue.').ready, false);
  assert.equal(assessNextStep('继续').ready, false);
  assert.equal(assessNextStep('Run tests').ready, true);
  assert.equal(validateHandoff({ ...input(), next: 'Continue' }).valid, true);
});

test('URL validation rejects script, data, relative, credential and control-character URLs', () => {
  for (const url of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', '//example.com', '/local', 'file:///etc/passwd', 'https://user:secret@example.com', 'https:\n//example.com']) assert.equal(safeUrl(url), null, url);
  assert.equal(safeUrl(' https://example.com '), 'https://example.com/');
  assert.equal(validateHandoff({ ...input(), clues: [{ label: 'Bad', url: 'javascript:alert(1)' }] }).valid, false);
});

test('complete step preserves the previous action and records result immutably', () => {
  const original = createHandoff(input(), now);
  const snapshot = structuredClone(original);
  const next = completeStep(original, { confirmed: 'Midnight case passes', next: 'Open the form and try a blank date', uncertain: '' }, later);
  assert.deepEqual(original, snapshot);
  assert.deepEqual(next.history, [{ completed: original.next, confirmed: 'Midnight case passes', at: later, previousConfirmed: original.confirmed, previousUncertain: original.uncertain }]);
  assert.equal(next.next, 'Open the form and try a blank date');
  assert.equal(next.updatedAt, later);
  assert.equal(next.createdAt, now);
  next.clues[0].label = 'Changed';
  assert.equal(original.clues[0].label, 'Date reference');
  assert.throws(() => completeStep(original, { confirmed: '', next: 'Continue' }, later));
  const constrained = completeStep(original, { confirmed: 'Done', next: 'Run checks', title: 'Injected title', id: 'injected' }, later);
  assert.equal(constrained.title, original.title);
  assert.equal(constrained.id, original.id);
  assert.equal(constrained.uncertain, original.uncertain);
});

test('history preserves prior context through backup and accepts legacy history', () => {
  const original = createHandoff(input(), now);
  const advanced = completeStep(original, { confirmed: 'Boundary checked', next: 'Run the whole suite', uncertain: '' }, later);
  const restored = parseBackup(serializeBackup([advanced])).handoffs[0];
  assert.equal(restored.history[0].previousConfirmed, original.confirmed);
  assert.equal(restored.history[0].previousUncertain, original.uncertain);
  const legacy = { ...original, history: [{ completed: 'Earlier action', confirmed: 'Earlier result', at: now }] };
  assert.deepEqual(parseBackup(backup([legacy])).handoffs[0].history, legacy.history);
  for (const value of [null, {}, 'x'.repeat(2001)]) {
    for (const field of ['previousConfirmed', 'previousUncertain']) {
      assert.throws(() => parseBackup(backup([{ ...original, history: [{ ...legacy.history[0], [field]: value }] }])));
    }
  }
});

test('archive is immutable and archived threads cannot advance', () => {
  const original = createHandoff(input(), now);
  const archived = archiveHandoff(original, later);
  assert.equal(original.status, 'parked');
  assert.equal(archived.status, 'archived');
  assert.throws(() => completeStep(archived, { confirmed: 'Done', next: 'Continue' }, later));
});

test('backup round trip preserves valid data and strips unrecognized structure', () => {
  const item = createHandoff(input(), now);
  assert.deepEqual(parseBackup(serializeBackup([item])), { version: 1, handoffs: [item] });
  const hostile = JSON.parse(backup([item]));
  hostile.__proto__ = { polluted: true };
  hostile.handoffs[0].unknown = { evil: true };
  const restored = parseBackup(JSON.stringify(hostile));
  assert.equal(Object.hasOwn(restored.handoffs[0], 'unknown'), false);
  assert.equal({}.polluted, undefined);
});

test('backup rejects malformed, excessive and unsafe data before import', () => {
  const item = createHandoff(input(), now);
  for (const text of ['not JSON', 'null', '[]', '{"version":2,"handoffs":[]}', backup([item, item]), backup([{ ...item, history: {} }]), backup([{ ...item, history: Array(501).fill({ completed: 'a', confirmed: 'b', at: now }) }]), backup([{ ...item, clues: [{ label: 'Bad', url: 'javascript:alert(1)' }] }]), backup([{ ...item, createdAt: 'yesterday' }]), backup(Array.from({ length: 201 }, (_, i) => ({ ...item, id: `thread-${i}` }))), ' '.repeat(2 * 1024 * 1024 + 1)]) assert.throws(() => parseBackup(text));
});

test('HTML-like notes remain plain strings for the DOM renderer to display safely', () => {
  const item = createHandoff({ ...input(), title: '<img src=x onerror=alert(1)>' }, now);
  assert.equal(parseBackup(serializeBackup([item])).handoffs[0].title, '<img src=x onerror=alert(1)>');
});
