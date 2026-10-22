const TEXT_LIMITS = { title: 120, goal: 2000, confirmed: 2000, uncertain: 2000, next: 2000 };
const MAX_HANDOFFS = 200;
const MAX_HISTORY = 500;
const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function safeUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function validateHandoff(input) {
  const errors = {};
  if (!isRecord(input)) return { valid: false, errors: { title: 'Enter a handoff.' } };
  for (const [field, max] of Object.entries(TEXT_LIMITS)) {
    const value = input[field];
    if (field === 'uncertain' && value === undefined) continue;
    if (typeof value !== 'string' || (field !== 'uncertain' && !value.trim())) errors[field] = `Add ${field === 'next' ? 'a next step' : field === 'confirmed' ? 'what you know so far' : `a ${field}`}.`;
    else if (value.length > max) errors[field] = `Keep this within ${max} characters.`;
  }
  if (input.clues !== undefined) {
    if (!Array.isArray(input.clues) || input.clues.length > 8) errors.clues = 'Add no more than 8 clues.';
    else if (input.clues.some(clue => !isRecord(clue) || typeof clue.label !== 'string' || !clue.label.trim() || clue.label.length > 120 || !safeUrl(clue.url))) errors.clues = 'Give each clue a name and a valid http or https link.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function assessNextStep(text) {
  const value = typeof text === 'string' ? text.trim() : '';
  // This deliberately modest wording check is a suggestion, never a saving gate.
  const vague = /^(continue|finish|work|resume|keep going|carry on|do it|继续|完成|接着做)[.!。！\s]*$/i;
  if (!value || vague.test(value)) return { ready: false, message: 'Try naming the first action and what you will act on.' };
  return { ready: true, message: 'A next step is written. Check that future you can act on it.' };
}

function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('Use a valid timestamp.');
  return value;
}

function fields(input) {
  const result = validateHandoff(input);
  if (!result.valid) throw new Error(Object.values(result.errors)[0]);
  return {
    ...Object.fromEntries(Object.keys(TEXT_LIMITS).map(key => [key, (input[key] ?? '').trim()])),
    clues: (input.clues ?? []).map(clue => ({ label: clue.label.trim(), url: safeUrl(clue.url) })),
  };
}

export function createHandoff(input, now = new Date().toISOString()) {
  return { id: crypto.randomUUID(), ...fields(input), createdAt: timestamp(now), updatedAt: now, status: 'parked', history: [] };
}

function restoreHandoff(input) {
  if (!isRecord(input) || typeof input.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.id)) throw new Error('A handoff has an invalid identifier.');
  if (!['parked', 'archived'].includes(input.status)) throw new Error('A handoff has an invalid status.');
  if (!Array.isArray(input.history) || input.history.length > MAX_HISTORY) throw new Error('A handoff has invalid or excessive history.');
  const history = input.history.map(entry => {
    if (!isRecord(entry) || typeof entry.completed !== 'string' || !entry.completed.trim() || entry.completed.length > 2000 || typeof entry.confirmed !== 'string' || !entry.confirmed.trim() || entry.confirmed.length > 2000) throw new Error('A history entry is invalid.');
    const prior = {};
    for (const field of ['previousConfirmed', 'previousUncertain']) {
      if (Object.hasOwn(entry, field)) {
        if (typeof entry[field] !== 'string' || entry[field].length > 2000) throw new Error('Previous handoff context is invalid.');
        prior[field] = entry[field].trim();
      }
    }
    return { completed: entry.completed.trim(), confirmed: entry.confirmed.trim(), at: timestamp(entry.at), ...prior };
  });
  return { id: input.id, ...fields(input), createdAt: timestamp(input.createdAt), updatedAt: timestamp(input.updatedAt), status: input.status, history };
}

export function completeStep(handoff, update, now = new Date().toISOString()) {
  const original = restoreHandoff(handoff);
  if (original.status === 'archived') throw new Error('This thread is archived.');
  if (original.history.length >= MAX_HISTORY) throw new Error('This thread has reached 500 steps. Start a new thread to continue.');
  if (!isRecord(update)) throw new Error('Add the result and next step.');
  const updated = fields({ ...original, confirmed: update.confirmed, next: update.next, uncertain: update.uncertain ?? original.uncertain });
  return { ...original, ...updated, updatedAt: timestamp(now), status: 'parked', history: [...original.history, { completed: original.next, confirmed: updated.confirmed, at: now, previousConfirmed: original.confirmed, previousUncertain: original.uncertain }] };
}

export function archiveHandoff(handoff, now = new Date().toISOString()) {
  return { ...restoreHandoff(handoff), status: 'archived', updatedAt: timestamp(now) };
}

export function parseBackup(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error('Choose a backup smaller than 2 MB.');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.handoffs) || data.handoffs.length > MAX_HANDOFFS) throw new Error('Choose a version 1 Threadback backup with at most 200 threads.');
  const handoffs = data.handoffs.map(restoreHandoff);
  if (new Set(handoffs.map(item => item.id)).size !== handoffs.length) throw new Error('The backup contains duplicate thread identifiers.');
  return { version: 1, handoffs };
}

export function serializeBackup(handoffs) {
  const text = JSON.stringify({ version: 1, handoffs }, null, 2);
  return JSON.stringify(parseBackup(text), null, 2);
}
