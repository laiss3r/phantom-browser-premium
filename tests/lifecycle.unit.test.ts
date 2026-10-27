import {beforeEach, afterEach, it, expect, vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {chromium, type BrowserContext} from 'playwright';
import {fixture} from './helpers';
import {Service} from '../src/main/service';
import * as processes from '../src/main/process-ownership';
import * as integrity from '../src/shared/runtime-integrity';
let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => {
  f = await fixture();
  vi.spyOn(integrity, 'verifyRuntime').mockReturnValue(1);
  vi.spyOn(processes, 'ownedProcesses').mockReturnValue([]);
  vi.spyOn(processes, 'scanProcesses').mockReturnValue([]);
});
afterEach(async () => {vi.useRealTimers(); await f.cleanup(); vi.restoreAllMocks();});
function browser() {
  const emitter = new EventEmitter();
  const session = {send: vi.fn().mockResolvedValue({processInfo: []}), detach: vi.fn().mockResolvedValue(undefined)};
  const context = {on: emitter.on.bind(emitter), pages: () => [{goto: vi.fn().mockResolvedValue(undefined)}], browser: () => ({version: () => 'test', newBrowserCDPSession: vi.fn().mockResolvedValue(session)}), close: vi.fn(async () => {emitter.emit('close');})};
  vi.spyOn(chromium, 'launchPersistentContext').mockResolvedValue(context as unknown as BrowserContext);
  return {context, session, emitter};
}
function lock(id: string, fields: Record<string, unknown> = {}) {
  const dir = path.join(f.service.directory(id), '.phantom-lock'); fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({format: 'phantom-lock', version: 1, profileId: id, electronPid: 2147483000, launchId: randomUUID(), state: 'running', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), browserMayExist: true, ...fields}));
  return dir;
}
it('reserves a profile before asynchronous launch and rejects concurrent launch', async () => {
  browser(); const p = f.service.create({name: 'Concurrent'}); const first = f.service.launch(p.id);
  await expect(f.service.launch(p.id)).rejects.toThrow('Stop'); await first;
  expect(chromium.launchPersistentContext).toHaveBeenCalledTimes(1);
});
it('shutdown racing launch cancels safely and disallows new launches', async () => {
  browser(); const p = f.service.create({name: 'Race'}); const start = f.service.launch(p.id).catch(() => undefined);
  await f.service.shutdown(); await start;
  expect(f.service.running.size).toBe(0); expect(fs.existsSync(path.join(p.directory, '.phantom-lock'))).toBe(false);
  await expect(f.service.launch(p.id)).rejects.toThrow('Stop');
});
it('partial initialization and rejected browser launch clean owned state and history', async () => {
  browser(); vi.mocked(chromium.launchPersistentContext).mockRejectedValue(Error('secret raw launch error'));
  const p = f.service.create({name: 'Failed'});
  await expect(f.service.launch(p.id)).rejects.toThrow('launch failed'); expect(f.service.running.size).toBe(0);
  expect(fs.existsSync(path.join(p.directory, '.phantom-lock'))).toBe(false);
  expect(f.db.rows('SELECT outcome FROM launches')[0]?.outcome).toBe('failed'); expect(JSON.stringify(f.service.snapshot())).not.toContain('secret raw');
});
it('CDP PID failure uses ownership scan and does not treat unknown inspection as exit', async () => {
  const {session} = browser(); session.send.mockRejectedValue(Error('CDP unavailable'));
  const p = f.service.create({name: 'PID'}); await f.service.launch(p.id);
  expect(f.service.running.get(p.id)?.pid).toBeUndefined();
  vi.mocked(processes.ownedProcesses).mockReturnValue(null);
  const context = f.service.running.get(p.id)!.context!;
  // Keep tests fast: prove retained lock at the transport-close event, then allow cleanup.
  await context.close(); expect(f.service.running.has(p.id)).toBe(true); expect(fs.existsSync(path.join(p.directory, '.phantom-lock'))).toBe(true);
  vi.mocked(processes.ownedProcesses).mockReturnValue([]);
});
it('unresponsive close has a deadline, retains lock and does not kill a PID', async () => {
  const {context} = browser(); const p = f.service.create({name: 'Hang'}); await f.service.launch(p.id);
  context.close.mockImplementation(() => new Promise<void>(() => {}));
  vi.useFakeTimers(); const stop = f.service.stop(p.id).catch(e => e as Error); await vi.advanceTimersByTimeAsync(5001);
  expect((await stop as Error).message).toContain('timed out'); expect(fs.existsSync(path.join(p.directory, '.phantom-lock'))).toBe(true);
  vi.useRealTimers(); context.close.mockImplementation(async () => {});
});
it('dead Electron with live owned Chromium is retained at startup and launch', async () => {
  const p = f.service.create({name: 'Orphan'}); const dir = lock(p.id);
  vi.mocked(processes.ownedProcesses).mockReturnValue([{pid: 123, birth: 'created', command: 'owned', executable: chromium.executablePath()}]);
  const service = new Service(f.db, f.root, f.secrets, true);
  await expect(service.launch(p.id)).rejects.toThrow('locked'); expect(fs.existsSync(dir)).toBe(true);
});
it('malformed locks are blocked; stale verified locks recover', async () => {
  browser(); const p = f.service.create({name: 'Metadata'}); const dir = lock(p.id);
  fs.writeFileSync(path.join(dir, 'metadata.json'), '{'); await expect(f.service.launch(p.id)).rejects.toThrow('locked');
  fs.rmSync(dir, {recursive: true}); lock(p.id); await f.service.launch(p.id); await f.service.stop(p.id); expect(fs.existsSync(dir)).toBe(false);
});
it('PID reuse cannot authorize killing or deleting an uncertain lock', async () => {
  const p = f.service.create({name: 'Reuse'}); const dir = lock(p.id, {chromiumPid: process.pid, chromiumBirth: 'different-process-birth'});
  await expect(f.service.launch(p.id)).rejects.toThrow('locked'); expect(fs.existsSync(dir)).toBe(true);
});
it('repeated stop/cleanup is idempotent and records one completed launch', async () => {
  const {context} = browser(); const p = f.service.create({name: 'Repeated'}); await f.service.launch(p.id);
  await Promise.all([f.service.stop(p.id), f.service.stop(p.id)]); await f.service.stop(p.id);
  expect(context.close).toHaveBeenCalledTimes(1); expect(f.db.rows('SELECT ended_at FROM launches')[0]?.ended_at).not.toBe(null);
});
it('inaccessible/missing profile storage does not create running state', async () => {
  const p = f.service.create({name: 'Missing'}); fs.rmSync(p.directory, {recursive: true});
  await expect(f.service.launch(p.id)).rejects.toThrow(); expect(f.service.running.size).toBe(0);
});
it('tampered runtime blocks browser spawn and cleans acquired lock', async () => {
  browser(); vi.mocked(integrity.verifyRuntime).mockImplementation(() => {throw Error('tampered');});
  const p = f.service.create({name: 'Runtime'}); await expect(f.service.launch(p.id)).rejects.toThrow('launch failed');
  expect(chromium.launchPersistentContext).not.toHaveBeenCalled(); expect(fs.existsSync(path.join(p.directory, '.phantom-lock'))).toBe(false);
});
it('cleanup will not remove another launch owner metadata', async () => {
  const {context} = browser(); const p = f.service.create({name: 'Owner'}); await f.service.launch(p.id);
  const file = path.join(p.directory, '.phantom-lock', 'metadata.json'); const m = JSON.parse(fs.readFileSync(file, 'utf8')); m.launchId = randomUUID(); fs.writeFileSync(file, JSON.stringify(m));
  await context.close(); expect(fs.existsSync(file)).toBe(true);
});

it('database initialization failure does not strand an acquired lock', async () => {
  browser(); const p = f.service.create({name: 'DB partial'});
  vi.spyOn(f.db, 'transaction').mockImplementationOnce(() => {throw Error('simulated persist failure');});
  await expect(f.service.launch(p.id)).rejects.toThrow('launch failed');
  expect(f.service.running.size).toBe(0); expect(fs.existsSync(path.join(p.directory, '.phantom-lock'))).toBe(false);
});
it('permission-denied profile storage fails before creating live state', async () => {
  const p = f.service.create({name: 'Inaccessible'}); const original = fs.lstatSync;
  const spy = vi.spyOn(fs, 'lstatSync').mockImplementation(((file, ...args) => {
    if (String(file) === p.directory) throw Object.assign(Error('access denied'), {code: 'EACCES'});
    return Reflect.apply(original, fs, [file, ...args]);
  }) as typeof fs.lstatSync);
  await expect(f.service.launch(p.id)).rejects.toThrow('access denied'); expect(f.service.running.size).toBe(0); spy.mockRestore();
});
it('startup keeps unresolved launch history open while an orphan lock exists', () => {
  const p = f.service.create({name: 'Unresolved'}); lock(p.id);
  f.db.transaction(() => f.db.run('INSERT INTO launches VALUES(?,?,?,NULL,NULL)', [randomUUID(), p.id, new Date().toISOString()]));
  new Service(f.db, f.root, f.secrets, true);
  const record = f.db.rows('SELECT ended_at,outcome FROM launches')[0];
  expect(record?.ended_at).toBe(null); expect(record?.outcome).toBe('recovery_required');
});
it('repeated shutdown is idempotent and reports rejected browser closes without raw errors',async()=>{
 const {context}=browser(),p=f.service.create({name:'Shutdown report'});await f.service.launch(p.id);context.close.mockRejectedValue(Error('PRIVATE_CLOSE_ERROR'));
 await Promise.all([f.service.shutdown(),f.service.shutdown()]);expect(context.close).toHaveBeenCalledTimes(1);expect(f.service.snapshot().logs.some(l=>l.message.includes('Shutdown incomplete'))).toBe(true);expect(JSON.stringify(f.service.snapshot())).not.toContain('PRIVATE_CLOSE_ERROR');expect(fs.existsSync(path.join(p.directory,'.phantom-lock'))).toBe(true);
});
it('a replaced lock owner is retained and reported as recovery required, not idle success',async()=>{
 const {context}=browser(),p=f.service.create({name:'Replacement report'});await f.service.launch(p.id);const file=path.join(p.directory,'.phantom-lock','metadata.json'),meta=JSON.parse(fs.readFileSync(file,'utf8'));meta.launchId=randomUUID();fs.writeFileSync(file,JSON.stringify(meta));await context.close();expect(fs.existsSync(file)).toBe(true);expect(f.service.profile(p.id).lastError).toContain('ownership changed');
});
it('reports stopping while close is pending rather than offering a conflicting launch',async()=>{
 const {context,emitter}=browser(),p=f.service.create({name:'Stopping state'});await f.service.launch(p.id);let finish!:()=>void;
 context.close.mockImplementation(()=>new Promise<void>(resolve=>{finish=()=>{emitter.emit('close');resolve();};}));const stop=f.service.stop(p.id);
 try{expect(f.service.profile(p.id).status).toBe('stopping');}finally{finish();await stop;}
 expect(f.service.profile(p.id).status).toBe('stopped');
});
it('production proxy probes explicitly retain Chromium sandboxing',async()=>{
 const probe={newContext:async()=>({newPage:async()=>({goto:async()=>({ok:()=>true,json:async()=>({ip:'127.0.0.1'})})})}),close:async()=>{}};
 vi.spyOn(chromium,'launch').mockResolvedValue(probe as unknown as Awaited<ReturnType<typeof chromium.launch>>);
 await f.service.proxySave(undefined,{name:'Sandbox option unit fixture',protocol:'http',host:'127.0.0.1',port:8080});const production=new Service(f.db,f.root,f.secrets);
 try{await production.proxyTest(f.service.snapshot().proxies[0]!.id,'http://127.0.0.1');expect(chromium.launch).toHaveBeenCalledWith(expect.objectContaining({headless:true,chromiumSandbox:true}));}finally{await production.shutdown();}
});
