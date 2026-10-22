import { createHandoff, validateHandoff, assessNextStep, completeStep, archiveHandoff, parseBackup, serializeBackup, safeUrl } from './core.js';

const KEY = 'threadback.v1';
const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let handoffs = [], selectedId = null, filter = 'parked', storageIssue = '', rawStored = '';
let mode = 'overview', focusDeadline = null, timerHandle = null, toastHandle = null;
const dialog = $('#dialog');
try {
  rawStored = localStorage.getItem(KEY) || '';
  if (rawStored) handoffs = parseBackup(rawStored).handoffs;
} catch { storageIssue = 'Your saved data could not be loaded. Open Back up & restore to keep a copy and restore a valid backup.'; }
selectedId = handoffs.find(h => h.status === 'parked')?.id || null;

function persist(next, {replace = false} = {}) {
  if (storageIssue && !replace) { toast('Resolve the storage issue in Back up & restore before saving.', true); return false; }
  let data;
  try { data = serializeBackup(next); } catch (e) { toast(e.message, true); return false; }
  try {
    localStorage.setItem(KEY, data);
    handoffs = next; rawStored = data; storageIssue = '';
    return true;
  } catch { toast('Could not save in this browser. Your changes are still in the form. Free some browser storage and try again.', true); return false; }
}
function toast(message, error = false) {
  clearTimeout(toastHandle);
  const el = $('#toast'); el.textContent = message; el.classList.toggle('is-error', error); el.hidden = false;
  if (error && dialog.open) {
    let alert = $('#dialog-error', dialog);
    if (!alert) { alert = document.createElement('p'); alert.id = 'dialog-error'; alert.className = 'storage-alert'; alert.setAttribute('role','alert'); $('.modal-body',dialog)?.prepend(alert); }
    alert.textContent = message;
    alert.scrollIntoView({block:'nearest'});
  }
  toastHandle = setTimeout(() => { el.hidden = true; }, error ? 10000 : 4500);
}
function date(value) { return new Date(value).toLocaleDateString('en', { month:'short', day:'numeric' }); }
function current() { return handoffs.find(h => h.id === selectedId); }
function stopFocus() { clearInterval(timerHandle); timerHandle = null; focusDeadline = null; }
function pick(id) { stopFocus(); selectedId = id; mode = 'overview'; render(); }
function render() {
  const list = handoffs.filter(h => h.status === filter).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  if (!list.some(h => h.id === selectedId)) selectedId = list[0]?.id || null;
  for (const type of ['parked','archived']) {
    $(`#count-${type}`).textContent = handoffs.filter(h => h.status === type).length;
    $(`#filter-${type}`).classList.toggle('active', type === filter);
    $(`#filter-${type}`).setAttribute('aria-pressed', String(type === filter));
  }
  $('#thread-list').innerHTML = list.length ? list.map(h => `<button class="thread-item ${h.id === selectedId ? 'active' : ''}" data-select="${esc(h.id)}" ${h.id === selectedId ? 'aria-current="true"' : ''}><span class="thread-title">${esc(h.title)}</span><span class="thread-meta">${h.status === 'archived' ? 'Archived' : 'Ready to return'} <span>· ${date(h.updatedAt)}</span></span></button>`).join('') : `<p class="list-empty">${filter === 'parked' ? 'Your next chapter starts here.' : 'Finished threads will live here.'}</p>`;
  const h = current();
  $('#workspace').innerHTML = (storageIssue ? `<div class="storage-alert" role="alert">${esc(storageIssue)}</div>` : '') + (h ? detail(h) : welcome());
  if (mode === 'focus') updateTimer();
}
function welcome() {
  if (filter === 'archived') return `<section class="empty-state"><span class="eyebrow">ALL IN GOOD TIME</span><h1>Room for finished work.</h1><p class="lead">Archive a thread when its work is done. Every handoff stays here for you to revisit.</p><button class="button button-primary" data-action="waiting">Back to waiting threads</button></section>`;
  return `<section class="hero"><div class="eyebrow">LESS RECONSTRUCTING. MORE DOING.</div><h1>Your next step,<br>waiting for you.</h1><p class="lead">Leave a clear handoff. Come back with a place to start.</p></section>
  <section class="overview-grid"><div class="overview-copy"><span class="sheet-index">01 / LEAVE YOURSELF A THREAD</span><h2>Pause the work.<br>Keep the momentum.</h2><p>Keep what you know, what you’re checking, and your next move together.</p><button class="button button-primary" data-action="new">Leave your first handoff <span aria-hidden="true">↗</span></button><button class="button button-quiet" data-action="example">Try the repair café example →</button></div>
  <div class="thread-illustration" aria-label="A handoff connects what you know to your next step"><div class="illustration-label">A NOTE TO YOUR FUTURE SELF</div><svg viewBox="0 0 420 230" role="img" aria-label="A thread connects pause and return"><path d="M45 65H260C350 65 365 180 250 180H125C65 180 65 115 125 115H350" fill="none" stroke="#d8ded4" stroke-width="14" stroke-linecap="round"/><path d="M45 65H260C350 65 365 180 250 180H125C65 180 65 115 125 115H350" fill="none" stroke="#245b47" stroke-width="3" stroke-dasharray="7 7"/><circle cx="45" cy="65" r="16" fill="#245b47"/><circle cx="350" cy="115" r="20" fill="#d77a43"/><path d="m344 108 8 7-8 7" stroke="#fff" stroke-width="3" fill="none"/></svg><div class="illustration-points"><span>Where you paused</span><strong>Where you begin</strong></div><p>One good handoff makes room for the next good idea.</p></div></section>
  <div class="welcome-footer"><span>01 &nbsp; Leave a handoff</span><span>02 &nbsp; Find your next move</span><span>03 &nbsp; Move the work forward</span></div>`;
}
function context(h) {
  return `<div class="context-grid"><section class="context-section confirmed"><h3><span aria-hidden="true">✓</span> What you know</h3><p>${esc(h.confirmed)}</p></section><section class="context-section uncertain"><h3><span aria-hidden="true">◇</span> Still to check</h3><p>${esc(h.uncertain || 'Nothing left open in this handoff.')}</p></section></div>`;
}
function clues(h) {
  return h.clues.length ? `<section class="clues"><h3>Keep these close</h3>${h.clues.map(c => `<a class="clue-link" href="${esc(safeUrl(c.url) || '#')}" target="_blank" rel="noopener noreferrer"><span>${esc(c.label || new URL(c.url).hostname)}</span><span aria-hidden="true">↗</span></a>`).join('')}</section>` : '';
}
function history(h) {
  return `<details class="history"><summary>Earlier handoffs <span>${h.history.length}</span></summary>${h.history.length ? [...h.history].reverse().map((e,i) => `<article class="history-item"><span class="sheet-index">${String(h.history.length-i).padStart(2,'0')} / ${date(e.at)}</span><h3>${esc(e.completed)}</h3><p>${esc(e.confirmed)}</p>${e.previousConfirmed !== undefined ? `<details class="history-context"><summary>Context at that pause</summary><h4>What you knew</h4><p>${esc(e.previousConfirmed)}</p><h4>What was still open</h4><p>${esc(e.previousUncertain || 'No open question recorded.')}</p></details>` : ''}</article>`).join('') : '<p>Your first completed step will appear here.</p>'}</details>`;
}
function detail(h) {
  return `<section class="hero compact"><div class="eyebrow">${h.status === 'archived' ? 'A THREAD WELL KEPT' : 'PICK UP WHERE YOU LEFT OFF'}</div><h1>${mode === 'resume' ? 'A little context.<br>A clear way in.' : mode === 'focus' ? 'One move.<br>Your full attention.' : 'Welcome back.'}</h1><p class="lead">${mode === 'focus' ? 'Everything you need is right here.' : 'You already did the thinking. Here’s where to begin.'}</p></section>
  <article class="handoff-sheet"><div class="sheet-top"><span class="sheet-index">HANDOFF / ${date(h.updatedAt)}</span><div class="toolbar">${h.title.includes('Example') ? '<span class="example-badge">Example project</span>' : ''}<button class="button button-quiet" data-action="edit">Edit handoff</button><button class="button button-quiet" data-action="archive">${h.status === 'archived' ? 'Restore' : 'Archive'}</button></div></div><h2 class="sheet-title">${esc(h.title)}</h2><p class="sheet-meta">${esc(h.goal)}</p>
  ${mode === 'resume' ? `<div class="resume-banner"><span class="eyebrow">YOUR WAY BACK IN</span><p>Read the handoff once, then take the next step.</p></div>${context(h)}` : ''}
  <section class="next-panel"><div class="next-label"><span aria-hidden="true">↳</span> ${h.status === 'archived' ? 'Last next step' : 'Start here'}</div><h3 class="next-action">${esc(h.next)}</h3>
  <div class="next-controls">${h.status === 'archived' ? '<span>This thread is safely archived.</span>' : mode === 'focus' ? `<div class="focus-timer"><span class="timer-time" id="timer" role="timer" aria-label="Five minute focus timer">05:00</span><span id="timer-label">A small start is enough.</span></div><button class="button button-primary" data-action="complete">Done — what’s next? <span aria-hidden="true">→</span></button><button class="button button-quiet" data-action="stop-focus">Leave focus</button>` : mode === 'resume' ? '<button class="button button-primary" data-action="focus">Start a 5-minute move →</button><button class="button button-secondary" data-action="complete">Already done? Record progress</button>' : '<button class="button button-primary" data-action="resume">Pick up this thread <span aria-hidden="true">→</span></button><button class="button button-quiet" data-action="complete">I’ve done this step</button>'}</div></section>
  ${mode !== 'resume' ? context(h) : ''}${clues(h)}${history(h)}</article><p class="workspace-note">Your handoffs stay in this browser. Export a backup to keep another copy.</p>`;
}
function openModal(title, body) {
  dialog.innerHTML = `<div class="modal-header"><h2 id="dialog-title">${title}</h2><button type="button" class="icon-button" id="close-dialog" aria-label="Close dialog">×</button></div>${body}`;
  $('#close-dialog').addEventListener('click', () => dialog.close());
  if (!dialog.open) dialog.showModal();
}
const field = (name,label,value='',options={}) => `<div class="field"><label for="${name}">${label}${options.optional ? ' <span class="optional">(optional)</span>' : ''}</label>${options.area ? `<textarea class="textarea" id="${name}" name="${name}" rows="${options.rows || 2}" maxlength="${options.max || 2000}" ${options.required?'required':''} placeholder="${esc(options.placeholder || '')}">${esc(value)}</textarea>` : `<input class="input" id="${name}" name="${name}" maxlength="${options.max || 120}" value="${esc(value)}" ${options.required?'required':''} placeholder="${esc(options.placeholder || '')}">`}<p class="error" id="${name}-error" hidden></p></div>`;
function formModal(edit = false) {
  const h = edit ? current() : null;
  openModal(h ? 'Keep the handoff current.' : 'Leave yourself a way back.', `<form id="handoff-form" novalidate><div class="modal-body"><p class="form-intro">A few clear lines now. A much easier start later.</p>
  ${field('title','Give this thread a name',h?.title,{required:true,placeholder:'Plan the neighbourhood repair café'})}
  ${field('goal','What are you working toward?',h?.goal,{area:true,required:true,placeholder:'A Saturday workshop with enough supplies for everyone.'})}
  <div class="field-row">${field('confirmed','What do you know for sure?',h?.confirmed,{area:true,required:true,rows:3,placeholder:'The community room is booked for Saturday.'})}${field('uncertain','What still needs checking?',h?.uncertain,{area:true,optional:true,rows:3,placeholder:'How many complete repair kits do we have?'})}</div>
  ${field('next','What’s the very next move?',h?.next,{area:true,required:true,placeholder:'Count complete repair kits in the supplies list.'})}<p class="hint" id="next-hint">Name an action and where to start. “Count the kits in the supplies list” beats “keep planning”.</p>
  <section class="link-fields"><h3>Keep a useful link nearby</h3><p class="hint">Optional. Add a document, page, or reference.</p><div class="field-row">${field('clue-label','Link name',h?.clues[0]?.label,{placeholder:'Workshop supplies'})}${field('clue-url','Link address',h?.clues[0]?.url,{max:2048,placeholder:'https://…'})}</div></section>
  </div><div class="modal-footer"><button type="button" class="button button-secondary" id="cancel-form">Cancel</button><button type="submit" class="button button-primary">Save my place →</button></div></form>`);
  $('#cancel-form').onclick = () => dialog.close();
  $('#next').addEventListener('input', () => { $('#next-hint').textContent = assessNextStep($('#next').value).message; });
  $('#handoff-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const url = data['clue-url'].trim();
    const clueLabel = data['clue-label'].trim();
    if (url && !safeUrl(url)) return fieldError('clue-url','Use a complete http:// or https:// address.');
    if (clueLabel && !url) return fieldError('clue-url','Add the address for this link, or clear its name.');
    data.clues = [...(url ? [{label:clueLabel || new URL(url).hostname,url}] : []), ...(h?.clues.slice(1) || [])];
    const result = validateHandoff(data);
    if (!result.valid) { Object.entries(result.errors).forEach(([name,message]) => fieldError(name,message,false)); const first = Object.keys(result.errors)[0]; $(`#${first}`)?.focus(); return; }
    const nextHandoff = h ? {...h, title:data.title.trim(),goal:data.goal.trim(),confirmed:data.confirmed.trim(),uncertain:data.uncertain.trim(),next:data.next.trim(),clues:data.clues,updatedAt:new Date().toISOString()} : createHandoff(data);
    if (!persist(h ? handoffs.map(x => x.id === h.id ? nextHandoff : x) : [nextHandoff,...handoffs])) return;
    stopFocus(); selectedId = nextHandoff.id; filter = nextHandoff.status; mode = 'overview'; dialog.close(); render(); toast('Your place is saved.');
  });
}
function fieldError(name,message,focus = true) {
  const el = $(`#${name}-error`); if (!el) { toast(message,true); return; }
  el.hidden = false; el.textContent = message;
  const input = $(`#${name}`); input?.setAttribute('aria-invalid','true'); input?.setAttribute('aria-describedby',`${name}-error`);
  input?.addEventListener('input', () => { el.hidden = true; input.removeAttribute('aria-invalid'); }, {once:true});
  if (focus) input?.focus();
}
function completeModal() {
  const h = current();
  openModal('That’s a step forward.', `<form id="complete-form" novalidate><div class="modal-body"><div class="completed-preview"><span class="eyebrow">THE STEP YOU TOOK</span><p>${esc(h.next)}</p></div>${field('confirmed','What did you confirm?', '',{area:true,required:true,placeholder:'Write the result you can now rely on.'})}${field('next','Leave your next move', '',{area:true,required:true,placeholder:'One specific action for your next session.'})}${field('uncertain','Anything still to check?',h.uncertain,{area:true,optional:true})}<p class="hint">This result becomes “What you know”. The previous step stays in your history.</p></div><div class="modal-footer"><button type="button" class="button button-secondary" id="cancel-form">Keep working</button><button class="button button-primary" type="submit">Save progress →</button></div></form>`);
  $('#cancel-form').onclick = () => dialog.close();
  $('#complete-form').onsubmit = event => {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget));
    if (!data.confirmed.trim()) return fieldError('confirmed','Add the result of your completed step.');
    if (!data.next.trim()) return fieldError('next','Leave one next move so you can pick this up again.');
    try {
      const next = completeStep(h,data);
      if (!persist(handoffs.map(x => x.id === h.id ? next : x))) return;
      stopFocus(); mode = 'overview'; dialog.close(); render(); toast('Progress saved. Your next move is ready.');
    } catch(e) { toast(e.message,true); }
  };
}
function updateTimer() {
  const el = $('#timer'); if (!el || !focusDeadline) return;
  const remaining = Math.max(0,Math.ceil((focusDeadline-Date.now())/1000));
  el.textContent = `${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
  if (!remaining) { clearInterval(timerHandle); timerHandle = null; $('#timer-label').textContent = 'A good start. Record your progress when you’re ready.'; }
}
function download(text, filename) {
  const blob = new Blob([text],{type:'application/json'}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function backupModal() {
  openModal('Keep a copy of your threads.', `<div class="modal-body"><p class="form-intro">Your work lives in this browser. A backup lets you carry it to another one.</p><div class="backup-option"><h3>Export your handoffs</h3><p>Download ${handoffs.length} saved ${handoffs.length === 1 ? 'thread' : 'threads'}, including earlier handoffs.</p><button class="button button-primary" id="export-backup">Download backup ↓</button></div><div class="backup-option"><h3>Restore a backup</h3><p>Choose a Threadback JSON file. You’ll see how many threads it contains before replacing anything.</p><button class="button button-secondary" id="restore-backup">Choose backup file ↑</button></div>${storageIssue ? '<div class="storage-alert"><p>The existing data could not be read. Keep a copy before starting fresh.</p><button class="button button-secondary" id="raw-backup">Download existing data</button><button class="button button-danger" id="reset-storage">Start fresh</button></div>' : ''}</div><div class="modal-footer"><button class="button button-quiet" id="done-backup">Done</button></div>`);
  $('#export-backup').onclick = () => download(serializeBackup(handoffs),`threadback-${new Date().toISOString().slice(0,10)}.json`);
  $('#restore-backup').onclick = () => $('#import-file').click();
  $('#done-backup').onclick = () => dialog.close();
  if ($('#raw-backup')) $('#raw-backup').onclick = () => download(rawStored,'threadback-recovery.json');
  if ($('#reset-storage')) $('#reset-storage').onclick = () => {
    openModal('Start with a clear workbench?', '<div class="modal-body"><p>This replaces the unreadable data in this browser. Download it first if you want to keep a copy.</p></div><div class="modal-footer"><button class="button button-secondary" id="cancel-reset">Go back</button><button class="button button-danger" id="confirm-reset">Replace with empty workbench</button></div>');
    $('#cancel-reset').onclick = backupModal;
    $('#confirm-reset').onclick = () => { if (persist([],{replace:true})) { dialog.close(); render(); toast('Your workbench is ready.'); } };
  }
}
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  try {
    if (file.size > 2*1024*1024) throw new Error('Choose a backup smaller than 2 MB.');
    const incoming = parseBackup(await file.text());
    openModal('Restore these threads?',`<div class="modal-body"><p>This backup contains <strong>${incoming.handoffs.length} threads</strong>. Restoring replaces the ${handoffs.length} threads currently in this browser.</p><p>Download your current backup first if you want to keep both sets.</p></div><div class="modal-footer"><button class="button button-secondary" id="cancel-restore">Go back</button><button class="button button-primary" id="confirm-restore">Replace & restore</button></div>`);
    $('#cancel-restore').onclick = backupModal;
    $('#confirm-restore').onclick = () => { if (!persist(incoming.handoffs,{replace:true})) return; stopFocus(); selectedId = null; filter = 'parked'; mode = 'overview'; dialog.close(); render(); toast('Your threads are restored.'); };
  } catch(e) { toast(`Backup not imported: ${e.message}`,true); }
});
function example() {
  const old = handoffs.find(h => h.title === 'Neighbourhood repair café · Example');
  if (old) { filter = old.status; pick(old.id); return; }
  const h = createHandoff({title:'Neighbourhood repair café · Example',goal:'Run a Saturday repair workshop with a ready-to-use kit for every participant.',confirmed:'The community room is booked for Saturday, 10 am. Two volunteers are confirmed.',uncertain:'How many complete repair kits are in the supplies list?',next:'Count the complete repair kits in the workshop supplies list.',clues:[{label:'Workshop supplies · example',url:new URL('./example.html',location.href).href}]});
  if (!persist([h,...handoffs])) return; filter = 'parked'; pick(h.id); toast('Example loaded. Try the whole handoff, from pause to progress.');
}
function archive() {
  const h = current(); if (!h) return;
  const next = h.status === 'archived' ? {...h,status:'parked',updatedAt:new Date().toISOString()} : archiveHandoff(h);
  if (!persist(handoffs.map(x => x.id === h.id ? next : x))) return;
  stopFocus(); mode = 'overview'; render(); toast(next.status === 'archived' ? 'Thread archived. You can restore it anytime.' : 'Thread restored to your waiting list.');
}
const actions = {new:()=>formModal(),edit:()=>formModal(true),example,archive,complete:completeModal,waiting:()=>{filter='parked';mode='overview';render();},resume:()=>{mode='resume';render();},focus:()=>{mode='focus';focusDeadline=Date.now()+300000;render();timerHandle=setInterval(updateTimer,1000);},'stop-focus':()=>{stopFocus();mode='resume';render();}};
$('#workspace').addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action; if(action) actions[action]?.();});
$('#thread-list').addEventListener('click',e=>{const id=e.target.closest('[data-select]')?.dataset.select;if(id)pick(id);});
$('#new-handoff').onclick = ()=>formModal();
$('#load-example').onclick = example;
$('#backup').onclick = backupModal;
for(const type of ['parked','archived']) $(`#filter-${type}`).onclick=()=>{stopFocus();filter=type;mode='overview';render();};
window.addEventListener('storage',e=>{if(e.key===KEY){toast('Your handoffs changed in another tab. Reload this tab before editing.',true);storageIssue='Another tab changed your handoffs. Reload this tab before editing to keep the latest version.';render();}});
render();
