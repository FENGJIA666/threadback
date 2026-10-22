import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
const KEY='threadback.v1';
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function create(page, overrides={}){
  await page.locator('#new-handoff').click();
  const values={title:'Workshop venue 工作坊',goal:'Choose a room for 20 attendees.',confirmed:'Room A holds 24.',uncertain:'Projector availability is unverified.',next:'Open the venue page and check projector availability.',...overrides};
  for(const [id,value] of Object.entries(values)) await page.locator(`#${id}`).fill(value);
  await page.getByRole('button',{name:'Save my place'}).click();
  await expect(page.locator('#dialog')).not.toBeVisible();
}
test.beforeEach(async({page})=>{await page.goto('/');});

test('real pause, refresh, focus, progress history, archive and restore',async({page})=>{
  await expect(page.locator('#count-parked')).toHaveText('0');
  await expect(page.locator('.thread-item')).toHaveCount(0);
  await create(page);
  const original=(await saved(page)).handoffs[0];
  await page.reload();
  await expect(page.locator('.sheet-title')).toHaveText(original.title);
  await page.getByRole('button',{name:'Pick up this thread'}).click();
  await page.getByRole('button',{name:'Start a 5-minute move'}).click();
  await expect(page.locator('#timer')).toHaveText(/0[45]:\d\d/);
  await page.getByRole('button',{name:'Leave focus'}).click();
  expect((await saved(page)).handoffs[0].history).toHaveLength(0);
  await page.getByRole('button',{name:'Already done? Record progress'}).click();
  await page.locator('#confirmed').fill('The venue page lists a projector.');
  await page.locator('#next').fill('Ask the organiser to confirm the booking.');
  await expect(page.locator('#uncertain')).toHaveValue(original.uncertain);
  await page.getByRole('button',{name:'Save progress'}).click();
  await page.reload();
  const updated=(await saved(page)).handoffs[0];
  expect(updated.history).toHaveLength(1);
  expect(updated.history[0].completed).toBe(original.next);
  expect(updated.history[0].previousConfirmed).toBe(original.confirmed);
  expect(updated.history[0].previousUncertain).toBe(original.uncertain);
  expect(updated.uncertain).toBe(original.uncertain);
  expect(updated.confirmed).not.toContain(original.uncertain);
  await expect(page.locator('.next-action')).toHaveText(updated.next);
  await page.locator('.history > summary').click();
  await expect(page.locator('.history-item')).toHaveCount(1);
  await page.getByText('Context at that pause',{exact:true}).click();
  await expect(page.locator('.history-item')).toContainText(original.confirmed);
  await expect(page.locator('.history-item')).toContainText(original.uncertain);
  await page.getByRole('button',{name:'Archive',exact:true}).click();
  await page.locator('#filter-archived').click();
  await expect(page.locator('.sheet-title')).toHaveText(original.title);
  await page.reload();
  await page.locator('#filter-archived').click();
  await page.getByRole('button',{name:'Restore',exact:true}).click();
  await page.locator('#filter-parked').click();
  await expect(page.locator('.sheet-title')).toHaveText(original.title);
  await mkdir('evidence',{recursive:true});
  await page.screenshot({path:'evidence/review-journey-desktop.png',fullPage:true});
});

test('real downloaded file roundtrip and invalid backups preserve data',async({page})=>{
  await create(page);
  await page.getByRole('button',{name:'I’ve done this step'}).click();
  await page.locator('#confirmed').fill('Projector checked.');
  await page.locator('#next').fill('Email the organiser.');
  await page.getByRole('button',{name:'Save progress'}).click();
  await page.getByRole('button',{name:'Archive',exact:true}).click();
  await create(page,{title:'Second active thread 工作坊'});
  await page.locator('#backup').click();
  const pending=page.waitForEvent('download');
  await page.locator('#export-backup').click();
  const download=await pending;
  const path=await download.path();
  const text=await readFile(path,'utf8');
  const backup=JSON.parse(text);
  expect(backup.handoffs[0].title).toContain('工作坊');
  expect(backup.handoffs.find(h=>h.status==='archived').history).toHaveLength(1);
  expect(backup.handoffs.find(h=>h.status==='parked')).toBeTruthy();
  await page.locator('#import-file').setInputFiles(path);
  await expect(page.locator('#dialog')).toContainText('Restoring replaces');
  await page.locator('#confirm-restore').click();
  expect(await saved(page)).toEqual(backup);
  for(const invalid of ['{broken','{}',JSON.stringify({version:1,handoffs:[{id:'bad'}]})]){
    await page.locator('#import-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(invalid)});
    await expect(page.locator('#toast')).toContainText('Backup not imported');
    expect(await saved(page)).toEqual(backup);
  }
  await page.locator('#import-file').setInputFiles(path);
  await page.locator('#confirm-restore').click();
  expect((await saved(page)).handoffs).toHaveLength(2);
});

test('storage write failure retains form and saved data',async({page})=>{
  await create(page);
  const before=await saved(page);
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('quota','QuotaExceededError');};});
  await page.locator('#new-handoff').click();
  for(const id of ['title','goal','confirmed','next'])await page.locator(`#${id}`).fill(`Unsaved ${id}`);
  await page.getByRole('button',{name:'Save my place'}).click();
  await expect(page.locator('#toast')).toContainText('Could not save');
  await expect(page.locator('#dialog')).toBeVisible();
  await expect(page.locator('#title')).toHaveValue('Unsaved title');
  expect(await saved(page)).toEqual(before);
});

test('corrupt stored data is not overwritten by ordinary save',async({page})=>{
  await page.evaluate(key=>localStorage.setItem(key,'broken-original'),KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('could not be loaded');
  await page.locator('#new-handoff').click();
  for(const id of ['title','goal','confirmed','next'])await page.locator(`#${id}`).fill(`Test ${id}`);
  await page.getByRole('button',{name:'Save my place'}).click();
  await expect(page.locator('#toast')).toContainText('Resolve the storage issue');
  expect(await page.evaluate(key=>localStorage.getItem(key),KEY)).toBe('broken-original');
});

test('focus timer expiry reaches zero without completing the step',async({page})=>{
  await page.clock.install({time:new Date('2026-10-22T12:00:00Z')});
  await create(page);
  const before=await saved(page);
  await page.getByRole('button',{name:'Pick up this thread'}).click();
  await page.getByRole('button',{name:'Start a 5-minute move'}).click();
  await expect(page.locator('#timer')).toHaveText('05:00');
  await page.clock.fastForward(300000);
  await expect(page.locator('#timer')).toHaveText('00:00');
  await expect(page.locator('#timer-label')).toContainText('Record your progress when you’re ready');
  expect(await saved(page)).toEqual(before);
  expect((await saved(page)).handoffs[0].history).toHaveLength(0);
});

test('second tab changes block stale save and preserve edited form',async({page,context})=>{
  await create(page);
  await page.getByRole('button',{name:'Edit handoff'}).click();
  await page.locator('#next').fill('Unsaved action in the first tab.');
  const second=await context.newPage();
  await second.goto('/');
  await second.getByRole('button',{name:'Edit handoff'}).click();
  await second.locator('#next').fill('Latest saved action from the second tab.');
  await second.getByRole('button',{name:'Save my place'}).click();
  const latest=await saved(second);
  await expect(page.locator('#toast')).toContainText('changed in another tab');
  await expect(page.locator('#next')).toHaveValue('Unsaved action in the first tab.');
  await page.getByRole('button',{name:'Save my place'}).click();
  await expect(page.locator('#toast')).toContainText('Resolve the storage issue');
  await expect(page.locator('#dialog')).toBeVisible();
  await expect(page.locator('#next')).toHaveValue('Unsaved action in the first tab.');
  expect(await saved(page)).toEqual(latest);
  expect(await saved(second)).toEqual(latest);
  await second.close();
});

test('text remains inert, unsafe links rejected, vague next action allowed, example opt-in',async({page})=>{
  const attack='<img src=x onerror="window.__executed=true">';
  await create(page,{title:attack,confirmed:attack,next:'Continue'});
  await expect(page.locator('.sheet-title')).toHaveText(attack);
  expect(await page.evaluate(()=>window.__executed)).toBeUndefined();
  await expect(page.locator('#workspace img')).toHaveCount(0);
  await page.getByRole('button',{name:'Edit handoff'}).click();
  await page.locator('#clue-url').fill('javascript:alert(1)');
  await page.getByRole('button',{name:'Save my place'}).click();
  await expect(page.locator('#clue-url-error')).toBeVisible();
  await page.locator('#cancel-form').click();
  await page.locator('#load-example').click();
  await expect(page.locator('.example-badge')).toHaveText('Example project');
  expect((await saved(page)).handoffs).toHaveLength(2);
  await page.locator('#load-example').click();
  expect((await saved(page)).handoffs).toHaveLength(2);
});

for(const width of [320,768,1440])test(`layout and minimum text size at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  for(const state of ['welcome','detail','form']){
    if(state==='detail')await page.locator('#load-example').click();
    if(state==='form')await page.getByRole('button',{name:'Edit handoff'}).click();
    const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,small:[...document.querySelectorAll('body *')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).filter(el=>parseFloat(getComputedStyle(el).fontSize)<16).map(el=>({text:el.textContent.slice(0,70),size:getComputedStyle(el).fontSize}))}));
    expect.soft(metrics.overflow,`${state} horizontal overflow`).toBe(false);
    expect.soft(metrics.small,`${state} text under 16px`).toEqual([]);
    if(width===320&&state==='detail')await page.screenshot({path:'evidence/review-mobile-320.png',fullPage:true});
  }
});
